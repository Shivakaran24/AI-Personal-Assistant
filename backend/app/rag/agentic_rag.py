import re
from typing import List, Dict, Any, Optional, Tuple
from app.memory.vector import vector_store
from app.mcp.client import mcp_client
from app.core.logger import logger

class AgenticRAGEngine:
    """
    Advanced Agentic RAG Engine (BM25 + TF-IDF Cosine Vector RRF + Lost-in-the-Middle Reordering).
    Features:
    1. Multi-Query Expansion & Standalone Term Rewriting
    2. BM25 + TF-IDF Cosine Vector Hybrid Search with Reciprocal Rank Fusion (RRF)
    3. Document Scoped Scope Filtering (doc_id)
    4. Self-RAG Document Relevance Evaluator (TF-IDF Cosine + BM25 + Overlap Density)
    5. "Lost in the Middle" Prompt Context Placement Optimization
    """

    async def execute_agentic_rag(
        self,
        user_query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 5,
        doc_id: Optional[str] = None,
        min_relevance_score: float = 0.20
    ) -> Dict[str, Any]:
        logger.info(f"AgenticRAGEngine initiated for query: '{user_query}' (doc_id={doc_id}, top_k={top_k})")

        # Step 1: De-contextualization & Multi-Query Expansion
        expanded_queries = self._expand_and_rewrite_query(user_query, chat_history)

        # Step 2: Hybrid RRF Retrieval across all expanded query variations
        raw_hits = vector_store.search_multi(expanded_queries, top_k=top_k * 2, doc_id=doc_id)

        # Step 3: Self-RAG Document Relevance Evaluation & Grading
        graded_chunks = []
        rejected_chunks = []

        for chunk in raw_hits:
            is_relevant, confidence = self._evaluate_chunk_relevance(user_query, chunk)
            chunk["relevance_confidence"] = confidence
            if is_relevant:
                graded_chunks.append(chunk)
            else:
                rejected_chunks.append(chunk)

        graded_chunks.sort(key=lambda x: (x["relevance_confidence"], x["rrf_score"]), reverse=True)
        selected_chunks = graded_chunks[:top_k]

        # Filter chunks that satisfy minimum relevance threshold
        relevant_chunks = [c for c in selected_chunks if c.get("relevance_confidence", 0) >= min_relevance_score]

        # Step 4: Apply "Lost in the Middle" context ordering (top score chunks at start and end)
        ordered_chunks = self._reorder_lost_in_the_middle(relevant_chunks)

        # Step 5: Strict Document Grounding Context & Citation Generation
        rag_prompt_context = ""
        citations = []

        if ordered_chunks:
            passages = []
            for idx, c in enumerate(ordered_chunks, 1):
                sec_info = f" (Section: {c['section']})" if c.get("section") else ""
                passages.append(f"--- UPLOADED DOCUMENT SOURCE ({c['filename']}{sec_info}) ---\n{c['text']}")
                citations.append({
                    "filename": c["filename"],
                    "section": c.get("section", ""),
                    "relevance_confidence": c["relevance_confidence"]
                })

            rag_prompt_context = (
                "\n\nVERIFIED UPLOADED DOCUMENT CONTEXT:\n"
                + "\n\n".join(passages) +
                "\n\nSTRICT RAG GROUNDING RULES:\n"
                "1. Answer the user query using ONLY the verified uploaded document context above.\n"
                "2. Understand the query, search the relevant document text, and synthesize an exact, direct answer.\n"
                "3. Do NOT output or refer to chunk IDs, chunk numbers, chunk indices, or chunk tags in your response.\n"
                "4. If the requested information or answer is NOT present in the provided uploaded document context, you MUST respond EXACTLY:\n"
                "   \"I do not have any information on that particular query in the uploaded documents.\"\n"
                "5. Do NOT attempt to answer from your own internal general knowledge or guess facts not stated in the uploaded documents."
            )
        else:
            rag_prompt_context = (
                "\n\nVERIFIED UPLOADED DOCUMENT CONTEXT:\n"
                "(No relevant matching content found in the uploaded documents for this query)\n\n"
                "STRICT RAG GROUNDING RULES:\n"
                "1. The information requested by the user was NOT found in any uploaded document.\n"
                "2. You MUST respond EXACTLY:\n"
                "   \"I do not have any information on that particular query in the uploaded documents.\"\n"
                "3. Do NOT attempt to answer from your own internal knowledge or generate a response from your own memory."
            )

        return {
            "query": user_query,
            "expanded_queries": expanded_queries,
            "total_raw_hits": len(raw_hits),
            "relevant_chunks_count": len(relevant_chunks),
            "selected_chunks": ordered_chunks,
            "citations": citations,
            "fallback_executed": len(relevant_chunks) == 0,
            "fallback_source": None,
            "rag_system_context": rag_prompt_context
        }

    def _expand_and_rewrite_query(self, user_query: str, chat_history: Optional[List[Dict[str, str]]] = None) -> List[str]:
        queries = [user_query.strip()]

        if chat_history and len(user_query.split()) < 6:
            recent_user_msgs = [m["content"] for m in chat_history if m.get("role") == "user"]
            if recent_user_msgs:
                prev_text = recent_user_msgs[-1]
                combined_q = f"{prev_text} {user_query}".strip()
                queries.append(combined_q)

        stop_words = {"what", "is", "the", "a", "an", "in", "on", "of", "to", "for", "can", "you", "tell", "me", "show", "how", "why", "where"}
        words = re.findall(r'\b[a-zA-Z0-9]+\b', user_query.lower())
        meaningful_words = [w for w in words if w not in stop_words]

        if len(meaningful_words) >= 2:
            queries.append(" ".join(meaningful_words))

        # HyDE (Hypothetical Document Embedding Expansion)
        hyde_passage = self._generate_hyde_hypothetical_passage(user_query, meaningful_words)
        if hyde_passage:
            queries.append(hyde_passage)

        return list(dict.fromkeys(queries))

    def _generate_hyde_hypothetical_passage(self, user_query: str, meaningful_words: List[str]) -> Optional[str]:
        """
        Generates a hypothetical candidate passage that an ideal document snippet
        would contain for the user query (HyDE - Hypothetical Document Embeddings).
        """
        if not meaningful_words:
            return None

        # Build clean hypothetical passage containing key concepts and term associations
        topic_phrase = " ".join(meaningful_words)
        return f"This document contains details regarding {topic_phrase}. It explains key specifications, operational parameters, background, and implementation steps related to {user_query}."


    def _evaluate_chunk_relevance(self, query: str, chunk: Dict[str, Any]) -> Tuple[bool, float]:
        query_words = set(re.findall(r'\b[a-zA-Z0-9]+\b', query.lower()))
        if not query_words:
            return False, 0.0

        stop_words = {"what", "is", "the", "a", "an", "in", "on", "of", "to", "for", "can", "you", "tell", "me", "show", "how", "why", "where", "it", "this", "that"}
        meaningful_query_words = set(w for w in query_words if w not in stop_words)
        eval_query_words = meaningful_query_words if meaningful_query_words else query_words

        chunk_text = chunk["text"].lower()
        chunk_words = set(re.findall(r'\b[a-zA-Z0-9]+\b', chunk_text))

        overlap = eval_query_words.intersection(chunk_words)
        overlap_ratio = len(overlap) / len(eval_query_words)

        semantic_score = chunk.get("semantic_score", 0.0)
        rrf_score = chunk.get("rrf_score", 0.0)
        norm_rrf = min(rrf_score * 30.0, 1.0)

        phrase_match_bonus = 0.25 if query.lower() in chunk_text else 0.0

        # Weighted hybrid confidence combining TF-IDF Cosine, Overlap, and RRF
        confidence = round(0.4 * semantic_score + 0.3 * overlap_ratio + 0.3 * norm_rrf + phrase_match_bonus, 2)
        is_relevant = (overlap_ratio >= 0.12 and confidence >= 0.18) or (semantic_score >= 0.25) or (phrase_match_bonus > 0)
        return is_relevant, min(confidence, 1.0)

    def _reorder_lost_in_the_middle(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Reorders context chunks to place highest-scoring chunks at the beginning and end
        of the LLM prompt context block to mitigate the 'Lost in the Middle' attention gap.
        """
        if len(chunks) <= 2:
            return chunks

        sorted_chunks = sorted(chunks, key=lambda x: (x.get("relevance_confidence", 0), x.get("rrf_score", 0)), reverse=True)
        reordered = []
        left = True
        
        for chunk in sorted_chunks:
            if left:
                reordered.insert(0, chunk)
            else:
                reordered.append(chunk)
            left = not left

        return reordered

agentic_rag = AgenticRAGEngine()

