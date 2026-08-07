from fastapi import APIRouter
from app.core.telemetry import telemetry_manager

router = APIRouter(prefix="/telemetry", tags=["Observability & Telemetry"])

@router.get("/stats")
def get_telemetry_stats():
    """
    Returns live Agent Observability & Telemetry metrics including:
    1. LLM Token & Cost Analytics per provider
    2. Tool Execution Health Matrix & Parallelism Ratios
    3. Knowledge Base RAG Inspector metrics
    """
    return telemetry_manager.get_telemetry_report()
