import os
import re
from typing import List, Dict, Any
from pypdf import PdfReader

class DocumentLoader:
    """
    Advanced Document Loader with Table-Aware & Sentence-Boundary Structural Chunking.
    Preserves document hierarchy (Markdown headers, code blocks, tables, paragraphs)
    and uses sentence boundary & table detection to create semantically intact chunks.
    """

    @staticmethod
    def load_and_chunk(filepath: str, filename: str, chunk_size: int = 400, chunk_overlap: int = 40) -> List[Dict[str, Any]]:
        ext = os.path.splitext(filename)[1].lower()
        full_text = ""

        if ext == ".pdf":
            try:
                reader = PdfReader(filepath)
                pages = []
                for i, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        pages.append(f"--- Page {i+1} ---\n{text}")
                full_text = "\n\n".join(pages)
            except Exception as e:
                full_text = f"Error extracting PDF text: {str(e)}"
        else:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                full_text = f.read()

        if not full_text.strip():
            return []

        # Split into structural blocks preserving Markdown headers and code blocks
        blocks = DocumentLoader._split_into_structural_blocks(full_text)
        
        chunks = []
        chunk_idx = 0

        for block in blocks:
            header_path = block.get("header_path", "")
            block_text = block["text"]
            
            # Sentence & Table-aware chunking within block
            units = DocumentLoader._split_into_semantic_units(block_text)
            
            curr_units = []
            curr_word_count = 0

            for unit in units:
                unit_words = unit.split()
                if not unit_words:
                    continue

                if curr_word_count + len(unit_words) <= chunk_size:
                    curr_units.append(unit)
                    curr_word_count += len(unit_words)
                else:
                    if curr_units:
                        body_str = "\n".join(curr_units)
                        chunk_text = DocumentLoader._build_chunk_text(header_path, body_str)
                        chunks.append({
                            "chunk_index": chunk_idx,
                            "text": chunk_text,
                            "filename": filename,
                            "section": header_path,
                            "word_count": curr_word_count
                        })
                        chunk_idx += 1

                    # Retain sentence/table overlap
                    overlap_units = []
                    overlap_words = 0
                    for prev_u in reversed(curr_units):
                        uw_cnt = len(prev_u.split())
                        if overlap_words + uw_cnt <= chunk_overlap:
                            overlap_units.insert(0, prev_u)
                            overlap_words += uw_cnt
                        else:
                            break
                    
                    curr_units = overlap_units + [unit]
                    curr_word_count = overlap_words + len(unit_words)

            if curr_units:
                body_str = "\n".join(curr_units)
                chunk_text = DocumentLoader._build_chunk_text(header_path, body_str)
                chunks.append({
                    "chunk_index": chunk_idx,
                    "text": chunk_text,
                    "filename": filename,
                    "section": header_path,
                    "word_count": curr_word_count
                })
                chunk_idx += 1

        return chunks

    @staticmethod
    def _split_into_structural_blocks(text: str) -> List[Dict[str, str]]:
        """
        Splits document by markdown headers (#, ##, ###) and paragraph boundaries while tracking section titles.
        """
        lines = text.splitlines()
        blocks = []
        current_headers = []
        buffer = []

        header_regex = re.compile(r'^(#{1,6})\s+(.+)$')

        for line in lines:
            match = header_regex.match(line.strip())
            if match:
                if buffer:
                    blocks.append({
                        "header_path": " > ".join(current_headers),
                        "text": "\n".join(buffer).strip()
                    })
                    buffer = []
                
                level = len(match.group(1))
                title = match.group(2).strip()
                
                # Adjust active header hierarchy depth
                current_headers = current_headers[:level - 1]
                current_headers.append(title)
                buffer.append(line)
            else:
                buffer.append(line)

        if buffer:
            blocks.append({
                "header_path": " > ".join(current_headers),
                "text": "\n".join(buffer).strip()
            })

        return [b for b in blocks if b["text"].strip()]

    @staticmethod
    def _split_into_semantic_units(text: str) -> List[str]:
        """
        Splits text into natural sentences, tables, or code blocks without breaking tabular rows apart.
        """
        raw_chunks = re.split(r'\n\n+|\r\n\r\n+', text)
        units = []
        for raw in raw_chunks:
            if not raw.strip():
                continue
            
            # Check if block is a code block or markdown table
            lines = raw.strip().splitlines()
            is_table = any('|' in l for l in lines) and len(lines) > 1
            is_code = "```" in raw

            if is_code or is_table:
                units.append(raw.strip())
            else:
                # Split prose by sentence end punctuation followed by whitespace
                sub_sents = re.split(r'(?<=[.!?])\s+', raw.strip())
                for s in sub_sents:
                    if s.strip():
                        units.append(s.strip())
        return units

    @staticmethod
    def _build_chunk_text(header_path: str, body_text: str) -> str:
        if header_path:
            return f"[Section: {header_path}]\n{body_text}"
        return body_text


