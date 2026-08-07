from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body, Query
from app.mcp.builtin_servers import BuiltinMCPServers, EmailStoreManager

router = APIRouter(prefix="/email", tags=["Email Agent"])

@router.get("/inbox")
def get_inbox_messages(query: str = Query("all"), limit: int = Query(10)):
    """
    Fetches inbox messages (live IMAP or workspace messages).
    """
    return BuiltinMCPServers.execute_tool("gmail_list_messages", {"query": query, "limit": limit})

@router.post("/draft")
def create_email_draft(payload: Dict[str, Any] = Body(...)):
    """
    Drafts an email message with recipient, subject, and body for review without sending.
    """
    to = payload.get("to")
    subject = payload.get("subject")
    body = payload.get("body")
    if not to or not body:
        raise HTTPException(status_code=400, detail="'to' and 'body' fields are required.")

    return BuiltinMCPServers.execute_tool("gmail_draft_message", {"to": to, "subject": subject, "body": body})

@router.get("/drafts")
def list_email_drafts():
    """
    Lists active email message drafts.
    """
    return BuiltinMCPServers.execute_tool("gmail_list_drafts", {})

@router.delete("/drafts/{draft_id}")
def delete_email_draft(draft_id: str):
    """
    Deletes a saved email draft.
    """
    success = EmailStoreManager.delete_draft(draft_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Draft '{draft_id}' not found.")
    return {"status": "success", "message": f"Draft '{draft_id}' deleted."}

@router.post("/send")
def send_email_message(payload: Dict[str, Any] = Body(...)):
    """
    Sends an outbound email. Triggers Human-in-the-Loop review if configured.
    """
    to = payload.get("to")
    subject = payload.get("subject")
    body = payload.get("body")
    skip_hitl = payload.get("skip_hitl", False)

    if not to or not body:
        raise HTTPException(status_code=400, detail="'to' and 'body' fields are required.")

    return BuiltinMCPServers.execute_tool("gmail_send_message", {"to": to, "subject": subject, "body": body}, skip_hitl=skip_hitl)

@router.post("/notify")
def send_email_notification(payload: Dict[str, Any] = Body(...)):
    """
    Dispatches instant email or system notification alerts.
    """
    to = payload.get("to")
    subject = payload.get("subject")
    body = payload.get("body")
    channel = payload.get("channel", "email")
    skip_hitl = payload.get("skip_hitl", False)

    if not to or not body:
        raise HTTPException(status_code=400, detail="'to' and 'body' fields are required.")

    return BuiltinMCPServers.execute_tool("email_send_notification", {"to": to, "subject": subject, "body": body, "channel": channel}, skip_hitl=skip_hitl)

@router.get("/notifications")
def list_sent_notifications():
    """
    Lists dispatched notifications log.
    """
    return {
        "status": "success",
        "notifications": EmailStoreManager.list_notifications()
    }
