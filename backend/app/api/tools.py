import uuid
import datetime
import json
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Body, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.database.models import Conversation, Message
from app.mcp.client import mcp_client
from app.mcp.registry import mcp_registry

router = APIRouter(prefix="/tools", tags=["MCP Tools"])

@router.get("")
def list_mcp_tools():
    """
    Returns all registered MCP tools discovered across connected servers.
    """
    return {
        "status": "success",
        "count": len(mcp_registry.list_tools()),
        "tools": mcp_client.list_available_tools()
    }

def _format_tool_markdown(tool_name: str, server_name: str, status: str, exec_time: float, args: dict, res_data: dict) -> str:
    formatted = f"### 🛠️ Executed MCP Tool: `{tool_name}`\n"
    formatted += f"**Server:** {server_name} | **Status:** `{status.upper()}` | **Execution Time:** {exec_time}ms\n\n"

    if tool_name == "fs_read_file" and status == "success":
        fpath = res_data.get("path", args.get("path", ""))
        title = res_data.get("title", fpath.split("/")[-1].split("\\")[-1])
        ftype = res_data.get("file_type", "File")
        size_bytes = res_data.get("size_bytes", 0)
        content = res_data.get("content", "")
        pages = res_data.get("pages", [])
        formulas = res_data.get("formulas", [])
        links = res_data.get("links", [])
        images = res_data.get("images", [])
        tables = res_data.get("tables", [])

        formatted += f"#### 👑 Document Title: **{title}**\n\n"
        formatted += f"### 📋 Metadata & File Properties\n"
        formatted += f"• **File Path:** `{fpath}`\n"
        formatted += f"• **File Format:** `{ftype}`\n"
        formatted += f"• **Total Pages:** `{len(pages) or 1}` page(s)\n"
        formatted += f"• **File Size:** `{size_bytes}` bytes\n"
        formatted += f"• **Extracted Formulas:** `{len(formulas)}` equation(s)\n"
        formatted += f"• **Extracted Links:** `{len(links)}` link(s)\n"
        formatted += f"• **Extracted Images:** `{len(images)}` image(s)\n"
        formatted += f"• **Data Tables:** `{len(tables)}` table(s)\n\n"

        if formulas:
            formatted += f"#### 🧮 Mathematical Formulas & Equations ({len(formulas)}):\n"
            for idx, f_item in enumerate(formulas, 1):
                formatted += f"**Formula {idx}:**\n{f_item}\n\n"

        if images:
            formatted += f"#### 🖼️ Extracted Images & Media ({len(images)}):\n"
            for idx, img in enumerate(images, 1):
                pg_str = f" (Page {img.get('page')})" if img.get("page") else ""
                formatted += f"• **Image {idx}:** `{img.get('name', 'Embedded Image')}`{pg_str}\n"
            formatted += "\n"

        if tables:
            formatted += f"#### 📊 Data Grid & Structured Tables ({len(tables)}):\n\n"
            for tbl in tables:
                formatted += f"{tbl}\n\n"

        if links:
            formatted += f"#### 🔗 Extracted References & Links ({len(links)}):\n"
            for idx, l in enumerate(links, 1):
                formatted += f"**{idx}. [{l}]({l})**\n"
            formatted += "\n"

        formatted += f"#### 📖 Page-by-Page Document Breakdown:\n\n"
        if pages:
            for p in pages:
                formatted += f"---\n### 📄 PAGE {p.get('page_number', 1)} OF {len(pages)}\n"
                if p.get("headings"):
                    for h in p["headings"]:
                        formatted += f"# 📌 Main Heading: **{h}**\n"
                if p.get("subheadings"):
                    for sh in p["subheadings"]:
                        formatted += f"## 🏷️ Subheading: *{sh}*\n"
                if p.get("formulas"):
                    formatted += f"**Page Equations:** {', '.join(p['formulas'])}\n\n"
                formatted += f"💬 **Normal Body / Text:**\n{p.get('formatted_text') or p.get('raw_text') or ''}\n\n"
        else:
            formatted += f"{content}"
    elif tool_name == "db_query" and status == "success":
        cols = res_data.get("columns", [])
        rows = res_data.get("data", [])
        formatted += f"#### 🗄️ Database Query Results ({len(rows)} rows):\n"
        if cols and rows:
            headers = " | ".join(cols)
            sep = " | ".join(["---"] * len(cols))
            formatted += f"| {headers} |\n| {sep} |\n"
            for r in rows:
                vals = " | ".join([str(r.get(c, "")) for c in cols])
                formatted += f"| {vals} |\n"
        else:
            formatted += "*(No records returned)*\n"
    elif tool_name == "calendar_create_event" and status == "success":
        title = res_data.get("title", args.get("title", "Calendar Event"))
        date = res_data.get("date", args.get("date", ""))
        stime = res_data.get("start_time", args.get("start_time", ""))
        duration = res_data.get("duration_minutes", args.get("duration_minutes", 30))
        atts = res_data.get("attendees", [])
        formatted += f"#### 📅 Event Created Successfully: **{title}**\n"
        formatted += f"• **Date & Time:** 📅 `{date}` at ⏰ `{stime}` ({duration} minutes)\n"
        formatted += f"• **Status:** `{res_data.get('calendar_status', 'Confirmed')}`\n"
        if atts:
            formatted += f"• **Attendees Invited ({len(atts)}):** " + ", ".join([f"`{a}`" for a in atts]) + "\n"
        if res_data.get("notification_status"):
            formatted += f"• **Notification Status:** {res_data.get('notification_status')}\n"
        formatted += "• **Email Dispatch:** Real HTML invitation email sent with clickable Accept/Reject buttons to attendees.\n"
    elif tool_name == "calendar_list_events" and status == "success":
        evts = res_data.get("events", [])
        formatted += f"#### 📅 Scheduled Calendar Events ({len(evts)}):\n"
        for e in evts:
            formatted += f"• **{e.get('title')}**: 📅 `{e.get('date')}` at ⏰ `{e.get('start_time')}` ({e.get('duration_minutes', 30)} mins) — Accepted: `{e.get('accepted_count', 0)}` | Rejected: `{e.get('rejected_count', 0)}`\n"
    elif tool_name == "calendar_respond_invitation" and status == "success":
        formatted += "#### 📩 Invitation Response Confirmed:\n"
        formatted += f"• **Action:** `{str(res_data.get('action', '')).upper()}`\n"
        formatted += f"• **Event Title:** **{res_data.get('title', 'Calendar Event')}**\n"
        formatted += f"• **Attendee:** `{res_data.get('attendee')}`\n"
        formatted += f"• **Date & Time:** 📅 `{res_data.get('date')}` at ⏰ `{res_data.get('start_time')}`\n"
    elif tool_name == "gmail_list_messages" and status == "success":
        msgs = res_data.get("messages", [])
        formatted += f"#### 📬 Inbox Emails ({len(msgs)}):\n"
        for idx, m in enumerate(msgs, 1):
            formatted += f"**{idx}. {m.get('subject', 'No Subject')}**\n"
            formatted += f"   • **From:** `{m.get('from') or m.get('sender')}` | **Date:** `{m.get('date')}`\n"
            if m.get("snippet"): formatted += f"   • *{m.get('snippet')}*\n"
            formatted += "\n"
    elif tool_name == "web_search" and status == "success":
        results = res_data.get("results", [])
        formatted += f"#### 🔍 Search Results for \"{res_data.get('query') or args.get('query')}\":\n\n"
        for idx, item in enumerate(results, 1):
            formatted += f"**{idx}. [{item.get('title')}]({item.get('url')})**\n   {item.get('snippet')}\n\n"
    else:
        formatted += "#### 📋 Execution Result:\n"
        for k, v in res_data.items():
            if k == "status": continue
            fk = k.replace("_", " ").title()
            if isinstance(v, list):
                if not v:
                    formatted += f"• **{fk}:** *(empty list)*\n"
                else:
                    formatted += f"• **{fk} ({len(v)}):**\n"
                    for idx, item in enumerate(v, 1):
                        if isinstance(item, dict):
                            sub = " | ".join([f"**{sk.replace('_', ' ').title()}:** `{sv}`" for sk, sv in item.items()])
                            formatted += f"  - **Item {idx}:** {sub}\n"
                        else:
                            formatted += f"  - `{item}`\n"
            elif isinstance(v, dict):
                formatted += f"• **{fk}:**\n"
                for sk, sv in v.items():
                    sfk = sk.replace("_", " ").title()
                    formatted += f"  - **{sfk}:** `{sv}`\n"
            else:
                formatted += f"• **{fk}:** {v}\n"

    return formatted

@router.post("/invoke")
async def invoke_mcp_tool(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Direct endpoint for invoking an MCP tool manually for debugging or UI tool testing.
    Persists tool executions into database conversation history if conversation_id is provided or created.
    """
    tool_name = payload.get("tool_name")
    arguments = payload.get("arguments", {})
    conv_id = payload.get("conversation_id")

    if not tool_name:
        raise HTTPException(status_code=400, detail="'tool_name' is required.")

    result = await mcp_client.invoke_tool(tool_name, arguments)

    # Persist in Chat Conversation History
    if not conv_id:
        conv_id = f"conv-{uuid.uuid4().hex[:10]}"

    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        conv = Conversation(
            id=conv_id,
            title=f"MCP Tool: {tool_name}"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Format user prompt text
    param_bullets = []
    for k, v in arguments.items():
        val_str = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
        param_bullets.append(f"• **{k.replace('_', ' ')}:** `{val_str}`")
    
    user_content = f"Execute MCP Tool `{tool_name}`"
    if param_bullets:
        user_content += " with parameters:\n" + "\n".join(param_bullets)

    # Save User message
    user_msg_db = Message(
        conversation_id=conv_id,
        role="user",
        content=user_content,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(user_msg_db)

    # Format assistant content
    res_data = result.get("result", {})
    server_name = result.get("server_name", "MCP Server")
    status = result.get("status", "success")
    exec_time = result.get("execution_time_ms", 0)

    assistant_content = _format_tool_markdown(tool_name, server_name, status, exec_time, arguments, res_data)

    tool_call_meta = [{
        "name": tool_name,
        "server_name": server_name,
        "arguments": arguments,
        "result": res_data,
        "execution_time_ms": exec_time
    }]

    # Save Assistant response message
    assistant_msg_db = Message(
        conversation_id=conv_id,
        role="assistant",
        content=assistant_content,
        tool_calls=tool_call_meta,
        model_used="mcp-direct",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(assistant_msg_db)

    conv.updated_at = datetime.datetime.utcnow()
    db.commit()

    result["conversation_id"] = conv_id
    return result
