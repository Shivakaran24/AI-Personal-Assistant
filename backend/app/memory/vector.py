import os
import math
import re
import json
import hashlib
from typing import List, Dict, Any, Optional
from app.core.logger import logger

class VectorStore:
    """
    Advanced Persistent Hybrid Vector Search Engine featuring:
    1. Okapi BM25 Keyword Search (k1=1.5, b=0.75, length normalization)
    2. High-Performance TF-IDF Vector Space Model & L2 Cosine Similarity
    3. 128-Dimensional Dense Hashing Semantic Feature Space
    4. Persistent Disk Vector Index Cache (.vector_cache.json)
    5. Reciprocal Rank Fusion (RRF) for Rank Merging
    6. Document-ID Scope Filtering
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStore, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.chunks: List[Dict[str, Any]] = []
        self.conversation_memory: List[Dict[str, Any]] = []
        self.doc_freqs: Dict[str, int] = {}
        self.total_docs = 0
        self.avg_doc_len = 0.0
        self.reload_documents_from_disk()

    def reload_documents_from_disk(self, upload_dir: str = "./uploaded_documents"):
        if not os.path.exists(upload_dir):
            return
        
        # Fast path: Try loading persistent vector index & conversation memory from cache disk file
        if self._try_load_cache_from_disk(upload_dir):
            logger.info(f"VectorStore loaded persistent index from disk cache. Total chunks: {self.total_docs}, Memories: {len(self.conversation_memory)}")
            return

        try:
            from app.rag.loader import DocumentLoader
            files = os.listdir(upload_dir)
            loaded_count = 0
            for fname in files:
                if fname.startswith("."):
                    continue
                full_p = os.path.join(upload_dir, fname)
                if not os.path.isfile(full_p):
                    continue
                
                if "_" in fname:
                    parts = fname.split("_", 1)
                    doc_id = parts[0]
                    orig_filename = parts[1]
                else:
                    doc_id = fname
                    orig_filename = fname
                    
                if any(c.get("doc_id") == doc_id for c in self.chunks):
                    continue
                    
                chunks = DocumentLoader.load_and_chunk(full_p, orig_filename)
                if chunks:
                    self.add_chunks(doc_id, chunks, save_cache=False)
                    loaded_count += 1
            
            if loaded_count > 0:
                self._save_cache_to_disk(upload_dir)
                logger.info(f"VectorStore reloaded {loaded_count} documents from disk and persisted index. Total chunks: {self.total_docs}")
        except Exception as e:
            logger.error(f"Failed to reload vector documents from disk: {e}")

    def _try_load_cache_from_disk(self, upload_dir: str) -> bool:
        cache_path = os.path.join(upload_dir, ".vector_cache.json")
        if not os.path.exists(cache_path):
            return False

        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            cached_files = data.get("file_mtimes", {})
            current_files = {}
            for fname in os.listdir(upload_dir):
                if fname.startswith("."):
                    continue
                full_p = os.path.join(upload_dir, fname)
                if os.path.isfile(full_p):
                    current_files[fname] = os.path.getmtime(full_p)

            # Check if file set or mtimes changed
            if cached_files != current_files:
                return False

            self.chunks = data.get("chunks", [])
            self.conversation_memory = data.get("conversation_memory", [])
            self.doc_freqs = data.get("doc_freqs", {})
            self.total_docs = data.get("total_docs", len(self.chunks))
            self.avg_doc_len = data.get("avg_doc_len", 0.0)

            self._compute_tfidf_norms()
            return True
        except Exception as e:
            logger.warning(f"VectorStore cache load error, rebuilding index: {e}")
            return False

    def _save_cache_to_disk(self, upload_dir: str = "./uploaded_documents"):
        cache_path = os.path.join(upload_dir, ".vector_cache.json")
        try:
            current_files = {}
            for fname in os.listdir(upload_dir):
                if fname.startswith("."):
                    continue
                full_p = os.path.join(upload_dir, fname)
                if os.path.isfile(full_p):
                    current_files[fname] = os.path.getmtime(full_p)

            data = {
                "file_mtimes": current_files,
                "chunks": self.chunks,
                "conversation_memory": self.conversation_memory,
                "doc_freqs": self.doc_freqs,
                "total_docs": self.total_docs,
                "avg_doc_len": self.avg_doc_len
            }
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist vector index to cache disk: {e}")

    def add_conversation_memory(self, conversation_id: str, user_text: str, assistant_text: str):
        """Indexes a completed conversation turn into long-term epistemic memory."""
        if not user_text or not assistant_text:
            return

        memory_text = f"User Query: {user_text.strip()}\nAssistant Decision/Answer: {assistant_text[:400].strip()}"
        tokens = self._tokenize(user_text + " " + assistant_text)
        
        entry = {
            "conversation_id": conversation_id,
            "user_text": user_text,
            "assistant_text": assistant_text[:500],
            "memory_text": memory_text,
            "tokens": tokens
        }
        self.conversation_memory.append(entry)
        self._save_cache_to_disk()
        logger.info(f"Indexed conversation turn into long-term memory for conv_id '{conversation_id}'. Total memories: {len(self.conversation_memory)}")

    def search_conversation_memory(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Searches long-term conversation memory for relevant past turns and user preferences."""
        if not self.conversation_memory or not query.strip():
            return []

        query_tokens = set(self._tokenize(query))
        if not query_tokens:
            return []

        stop_words = {"what", "is", "the", "a", "an", "in", "on", "of", "to", "for", "can", "you", "tell", "me", "show", "how", "why", "where"}
        meaningful_query_words = set(w for w in query_tokens if w not in stop_words)
        eval_words = meaningful_query_words if meaningful_query_words else query_tokens

        scored_memories = []
        for mem in self.conversation_memory:
            mem_tokens = set(mem.get("tokens", []))
            overlap = eval_words.intersection(mem_tokens)
            if overlap:
                score = len(overlap) / len(eval_words)
                scored_memories.append((score, mem))

        scored_memories.sort(key=lambda x: x[0], reverse=True)
        return [m[1] for m in scored_memories[:top_k]]

    def add_chunks(self, doc_id: str, chunks: List[Dict[str, Any]], save_cache: bool = True):
        for chunk in chunks:
            text = chunk["text"]
            tokens = self._tokenize(text)
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            
            dense_vector = self._compute_dense_hash_vector(tokens)

            chunk_entry = {
                "doc_id": doc_id,
                "filename": chunk["filename"],
                "chunk_index": chunk["chunk_index"],
                "section": chunk.get("section", ""),
                "text": text,
                "tf": tf,
                "dense_vector": dense_vector,
                "tokens_count": len(tokens)
            }
            self.chunks.append(chunk_entry)

            # Update document frequencies for BM25 and TF-IDF
            unique_tokens = set(tokens)
            for ut in unique_tokens:
                self.doc_freqs[ut] = self.doc_freqs.get(ut, 0) + 1
        
        self.total_docs = len(self.chunks)
        if self.total_docs > 0:
            total_tokens = sum(c["tokens_count"] for c in self.chunks)
            self.avg_doc_len = total_tokens / self.total_docs
        
        # Precompute chunk L2 norm for TF-IDF Cosine Similarity
        self._compute_tfidf_norms()

        if save_cache:
            self._save_cache_to_disk()

        logger.info(f"Indexed {len(chunks)} chunks for document {doc_id} into VectorStore. Total chunks: {self.total_docs}")

    def _compute_dense_hash_vector(self, tokens: List[str], dim: int = 128) -> List[float]:
        """Computes a 128-dimensional dense semantic hashing feature vector for a list of tokens."""
        vec = [0.0] * dim
        if not tokens:
            return vec

        for t in tokens:
            h = int(hashlib.md5(t.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            val = 1.0 if (h & 1) == 0 else -1.0
            vec[idx] += val

        sq_sum = sum(v * v for v in vec)
        norm = math.sqrt(sq_sum) if sq_sum > 0 else 1.0
        return [round(v / norm, 4) for v in vec]

    def _compute_tfidf_norms(self):
        """Precomputes L2 vector magnitude for each chunk in the vector store."""
        N = max(self.total_docs, 1)
        for chunk in self.chunks:
            tf = chunk.get("tf", {})
            sq_sum = 0.0
            for term, count in tf.items():
                df = self.doc_freqs.get(term, 1)
                idf = math.log((N + 1.0) / (df + 1.0)) + 1.0
                sublinear_tf = 1.0 + math.log(count)
                weight = sublinear_tf * idf
                sq_sum += weight * weight
            chunk["vector_norm"] = math.sqrt(sq_sum) if sq_sum > 0 else 1.0

    def bm25_search(self, query: str, top_k: int = 10, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Okapi BM25 Search Algorithm
        Formula: score(D, Q) = sum( IDF(q) * (f(q,D) * (k1 + 1)) / (f(q,D) + k1 * (1 - b + b * (|D| / avgdl))) )
        """
        if not self.chunks:
            self.reload_documents_from_disk()

        query_tokens = self._tokenize(query)
        if not query_tokens or not self.chunks:
            return []

        k1 = 1.5
        b = 0.75
        N = max(self.total_docs, 1)
        avgdl = max(self.avg_doc_len, 1.0)

        candidates = self.chunks
        if doc_id:
            candidates = [c for c in self.chunks if c["doc_id"] == doc_id]

        scores = []
        for chunk in candidates:
            score = 0.0
            tf = chunk.get("tf", {})
            doc_len = chunk.get("tokens_count", len(chunk["text"].split()))

            for q in query_tokens:
                if q in tf:
                    freq = tf[q]
                    df = self.doc_freqs.get(q, 1)
                    idf = math.log((N - df + 0.5) / (df + 0.5) + 1.0)
                    denom = freq + k1 * (1.0 - b + b * (doc_len / avgdl))
                    score += idf * ((freq * (k1 + 1.0)) / max(denom, 0.001))

            if score > 0:
                scores.append((score, chunk))

        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        for rank, (score, chunk) in enumerate(scores[:top_k], 1):
            results.append({
                "rank": rank,
                "doc_id": chunk["doc_id"],
                "filename": chunk["filename"],
                "chunk_index": chunk.get("chunk_index", 0),
                "section": chunk.get("section", ""),
                "text": chunk["text"],
                "bm25_score": round(score, 4)
            })
        return results

    def semantic_search(self, query: str, top_k: int = 10, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        TF-IDF Vector Space & 128-Dim Dense Hashing Cosine Similarity with Phrase Match Boosting
        """
        if not self.chunks:
            self.reload_documents_from_disk()

        query_tokens = self._tokenize(query)
        if not query_tokens or not self.chunks:
            return []

        N = max(self.total_docs, 1)
        q_tf = {}
        for qt in query_tokens:
            q_tf[qt] = q_tf.get(qt, 0) + 1

        # Calculate query TF-IDF weights and norm
        q_weights = {}
        q_sq_sum = 0.0
        for qt, count in q_tf.items():
            df = self.doc_freqs.get(qt, 0)
            idf = math.log((N + 1.0) / (df + 1.0)) + 1.0
            sublinear_tf = 1.0 + math.log(count)
            weight = sublinear_tf * idf
            q_weights[qt] = weight
            q_sq_sum += weight * weight

        q_norm = math.sqrt(q_sq_sum) if q_sq_sum > 0 else 1.0
        q_dense = self._compute_dense_hash_vector(query_tokens)
        query_lower = query.lower()

        candidates = self.chunks
        if doc_id:
            candidates = [c for c in self.chunks if c["doc_id"] == doc_id]

        scores = []
        for chunk in candidates:
            dot_product = 0.0
            tf = chunk.get("tf", {})

            for qt, q_w in q_weights.items():
                if qt in tf:
                    df = self.doc_freqs.get(qt, 1)
                    idf = math.log((N + 1.0) / (df + 1.0)) + 1.0
                    c_sublinear_tf = 1.0 + math.log(tf[qt])
                    c_w = c_sublinear_tf * idf
                    dot_product += q_w * c_w

            chunk_norm = chunk.get("vector_norm", 1.0)
            tfidf_cosine = dot_product / max(q_norm * chunk_norm, 1e-6)

            # Dense hashing cosine similarity
            c_dense = chunk.get("dense_vector", [])
            dense_cosine = 0.0
            if c_dense and len(c_dense) == len(q_dense):
                dense_cosine = max(sum(q_dense[i] * c_dense[i] for i in range(len(q_dense))), 0.0)

            # Combined Cosine Similarity (70% TF-IDF + 30% Dense Hash)
            combined_cosine = 0.7 * tfidf_cosine + 0.3 * dense_cosine

            # Phrase match & exact keyword boost
            chunk_lower = chunk["text"].lower()
            phrase_bonus = 0.0
            if query_lower in chunk_lower:
                phrase_bonus = 0.25
            else:
                for i in range(len(query_tokens) - 1):
                    phrase = f"{query_tokens[i]} {query_tokens[i+1]}"
                    if phrase in chunk_lower:
                        phrase_bonus += 0.1

            total_score = min(combined_cosine + phrase_bonus, 1.0)

            if total_score > 0.01:
                scores.append((total_score, chunk))

        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        for rank, (score, chunk) in enumerate(scores[:top_k], 1):
            results.append({
                "rank": rank,
                "doc_id": chunk["doc_id"],
                "filename": chunk["filename"],
                "chunk_index": chunk.get("chunk_index", 0),
                "section": chunk.get("section", ""),
                "text": chunk["text"],
                "semantic_score": round(score, 4)
            })
        return results

    def hybrid_search_rrf(self, query: str, top_k: int = 5, doc_id: Optional[str] = None, k_rrf: int = 60) -> List[Dict[str, Any]]:
        """
        Reciprocal Rank Fusion (RRF) Hybrid Search
        Combines BM25 and TF-IDF Cosine Similarity rankings:
        RRF_Score = 1 / (k + rank_bm25) + 1 / (k + rank_semantic)
        """
        bm25_hits = self.bm25_search(query, top_k=top_k * 2, doc_id=doc_id)
        semantic_hits = self.semantic_search(query, top_k=top_k * 2, doc_id=doc_id)

        rrf_map = {}

        for hit in bm25_hits:
            key = f"{hit['doc_id']}_{hit['chunk_index']}"
            rrf_score = 1.0 / (k_rrf + hit["rank"])
            rrf_map[key] = {
                "doc_id": hit["doc_id"],
                "filename": hit["filename"],
                "chunk_index": hit["chunk_index"],
                "section": hit.get("section", ""),
                "text": hit["text"],
                "bm25_rank": hit["rank"],
                "bm25_score": hit["bm25_score"],
                "semantic_rank": 999,
                "semantic_score": 0.0,
                "rrf_score": rrf_score
            }

        for hit in semantic_hits:
            key = f"{hit['doc_id']}_{hit['chunk_index']}"
            semantic_rrf = 1.0 / (k_rrf + hit["rank"])
            if key in rrf_map:
                rrf_map[key]["semantic_rank"] = hit["rank"]
                rrf_map[key]["semantic_score"] = hit["semantic_score"]
                rrf_map[key]["rrf_score"] += semantic_rrf
            else:
                rrf_map[key] = {
                    "doc_id": hit["doc_id"],
                    "filename": hit["filename"],
                    "chunk_index": hit["chunk_index"],
                    "section": hit.get("section", ""),
                    "text": hit["text"],
                    "bm25_rank": 999,
                    "bm25_score": 0.0,
                    "semantic_rank": hit["rank"],
                    "semantic_score": hit["semantic_score"],
                    "rrf_score": semantic_rrf
                }

        sorted_results = sorted(rrf_map.values(), key=lambda x: x["rrf_score"], reverse=True)
        
        final_hits = []
        for hit in sorted_results[:top_k]:
            hit["score"] = round(hit["rrf_score"] * 100, 3)
            hit["rrf_score"] = round(hit["rrf_score"], 5)
            final_hits.append(hit)

        return final_hits

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        return self.hybrid_search_rrf(query, top_k=top_k)

    def search_multi(self, queries: List[str], top_k: int = 5, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
        all_hits = {}
        for q in queries:
            hits = self.hybrid_search_rrf(q, top_k=top_k, doc_id=doc_id)
            for h in hits:
                key = f"{h['doc_id']}_{h['chunk_index']}"
                if key not in all_hits or h["rrf_score"] > all_hits[key]["rrf_score"]:
                    all_hits[key] = h
        
        sorted_hits = sorted(all_hits.values(), key=lambda x: x["rrf_score"], reverse=True)
        return sorted_hits[:top_k]

    def remove_document(self, doc_id: str):
        self.chunks = [c for c in self.chunks if c["doc_id"] != doc_id]
        self.total_docs = len(self.chunks)
        self._compute_tfidf_norms()
        self._save_cache_to_disk()

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9]+\b', text.lower())

vector_store = VectorStore()


