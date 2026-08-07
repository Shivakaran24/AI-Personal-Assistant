import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.database.models import Document
from app.schemas.schemas import DocumentSchema, SettingsUpdateSchema
from app.rag.loader import DocumentLoader
from app.memory.vector import vector_store
from app.rag.agentic_rag import agentic_rag
from app.core.config import settings

upload_router = APIRouter(prefix="/documents", tags=["RAG Documents"])
settings_router = APIRouter(prefix="/settings", tags=["Settings & Auth"])

UPLOAD_DIR = "./uploaded_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@upload_router.post("/upload", response_model=DocumentSchema)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    filename = file.filename or "uploaded_file.txt"
    doc_id = f"doc-{uuid.uuid4().hex[:10]}"
    filepath = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Process and Chunk Document for RAG
    chunks = DocumentLoader.load_and_chunk(filepath, filename)
    vector_store.add_chunks(doc_id, chunks)

    doc_record = Document(
        id=doc_id,
        filename=filename,
        file_type=os.path.splitext(filename)[1].lower(),
        size_bytes=len(contents),
        embedding_status="ready",
        chunk_count=len(chunks)
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    return doc_record

@upload_router.get("", response_model=List[DocumentSchema])
def list_documents(db: Session = Depends(get_db)):
    return db.query(Document).order_by(Document.created_at.desc()).all()

@upload_router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    vector_store.remove_document(doc_id)
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"Deleted document '{doc_id}'"}

@upload_router.post("/query")
async def query_documents(payload: dict = Body(...)):
    query = payload.get("query", "")
    doc_id = payload.get("doc_id", None)
    top_k = payload.get("top_k", 5)

    if not query:
        return {"status": "error", "message": "No search query provided.", "results": []}
    
    rag_res = await agentic_rag.execute_agentic_rag(user_query=query, top_k=top_k, doc_id=doc_id)
    return {
        "status": "success",
        "query": query,
        "expanded_queries": rag_res.get("expanded_queries", []),
        "relevant_chunks_count": rag_res.get("relevant_chunks_count", 0),
        "fallback_executed": rag_res.get("fallback_executed", False),
        "citations": rag_res.get("citations", []),
        "results": rag_res.get("selected_chunks", [])
    }


@settings_router.get("")
def get_current_settings():
    return {
        "gemini_api_key_set": bool(settings.GEMINI_API_KEY),
        "openai_api_key_set": bool(settings.OPENAI_API_KEY),
        "anthropic_api_key_set": bool(settings.ANTHROPIC_API_KEY),
        "ollama_base_url": settings.OLLAMA_BASE_URL,
        "default_llm_provider": settings.DEFAULT_LLM_PROVIDER
    }

@settings_router.post("")
def update_settings(payload: SettingsUpdateSchema):
    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key
    if payload.openai_api_key is not None:
        settings.OPENAI_API_KEY = payload.openai_api_key
    if payload.anthropic_api_key is not None:
        settings.ANTHROPIC_API_KEY = payload.anthropic_api_key
    if payload.ollama_base_url is not None:
        settings.OLLAMA_BASE_URL = payload.ollama_base_url
    if payload.default_llm_provider is not None:
        settings.DEFAULT_LLM_PROVIDER = payload.default_llm_provider
    return {"status": "success", "message": "Settings updated successfully."}
