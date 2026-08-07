from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from app.planner.hitl_manager import hitl_manager

router = APIRouter(prefix="/approval", tags=["Human-in-the-Loop Review"])

@router.get("/pending")
def list_pending_approvals():
    """
    Returns list of all pending actions awaiting Human-in-the-Loop review.
    """
    return {
        "status": "success",
        "summary": hitl_manager.get_queue_summary(),
        "pending_actions": hitl_manager.list_pending_actions()
    }

@router.get("/history")
def get_approval_history(limit: int = 20):
    """
    Returns history log of approved, edited, and rejected actions.
    """
    return {
        "status": "success",
        "summary": hitl_manager.get_queue_summary(),
        "history": hitl_manager.get_history(limit=limit)
    }

@router.post("/{action_id}/approve")
def approve_action(action_id: str, payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Approves and executes a pending action. Accepts optional custom parameter edits.
    """
    edits = payload.get("edits") if payload else None
    result = hitl_manager.approve_action(action_id, custom_edits=edits)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result

@router.post("/{action_id}/edit")
def edit_and_approve_action(action_id: str, edits: Dict[str, Any] = Body(...)):
    """
    Edits parameters of a pending action and approves it immediately.
    """
    result = hitl_manager.edit_and_approve(action_id, edits=edits)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result

@router.post("/{action_id}/reject")
def reject_action(action_id: str, payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Rejects a pending action without executing it.
    """
    reason = payload.get("reason", "User declined action") if payload else "User declined action"
    result = hitl_manager.reject_action(action_id, reason=reason)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result
