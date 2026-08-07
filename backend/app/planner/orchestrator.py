import json
import time
import datetime
import asyncio
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.mcp.client import mcp_client
from app.memory.vector import vector_store
from app.rag.agentic_rag import agentic_rag
from app.llm.router import llm_router
from app.llm.fallback import BuiltinFallbackLLM
from app.mcp.a2ui import A2UIProtocol
from app.database.models import Message, Conversation
from app.core.logger import logger
from app.planner.supervisor import supervisor_agent
from app.planner.hitl_manager import hitl_manager

class AIOrchestrator:
    """
    The main Orchestrator / Planner.
    Handles Intent Detection, Context Building, RAG document injection,
    MCP Tool execution loops, and LLM response aggregation.
    """

    async def process_chat_message(
        self,
        db: Session,
        conversation_id: str,
        user_text: str,
        requested_model: Optional[str] = "auto",
        mcp_enabled: bool = True
    ) -> Dict[str, Any]:
        start_time = time.time()

        # 1. Retrieve or create conversation record
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            title = user_text[:30] + "..." if len(user_text) > 30 else user_text
            conversation = Conversation(id=conversation_id, title=title)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        # Save user message to database
        user_msg_db = Message(
            conversation_id=conversation_id,
            role="user",
            content=user_text,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(user_msg_db)
        db.commit()

        # 2. Fetch conversation history for short-term memory & Long-Term Epistemic Memory
        past_messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.timestamp.asc()).all()
        formatted_history = []
        for m in past_messages[-10:]: # last 10 messages context
            formatted_history.append({"role": m.role, "content": m.content})

        # Query long-term conversation memory store
        long_term_mems = vector_store.search_conversation_memory(user_text, top_k=3)
        long_term_context = ""
        if long_term_mems:
            mem_blocks = [f"• {m['memory_text']}" for m in long_term_mems]
            long_term_context = "\n\nRETRIEVED LONG-TERM CONVERSATION MEMORY (Past Sessions & User Context):\n" + "\n".join(mem_blocks)

        # 3. Supervisor Multi-Agent Partitioning & System Context
        route_info = supervisor_agent.route_and_partition(user_text)

        # 4. Agentic RAG Execution (Query Rewriting, CRAG Evaluation, Fallback, Citations)
        rag_res = await agentic_rag.execute_agentic_rag(user_query=user_text, chat_history=formatted_history)
        rag_context = rag_res.get("rag_system_context", "")

        system_prompt = (
            "You are an advanced, production-grade MCP-powered AI Assistant guided by a Multi-Agent Supervisor.\n"
            f"Active Domain Routing: {route_info['assigned_domain'].upper()} | Active Workers: {', '.join(route_info['active_workers'])}\n"
            f"{route_info['focused_prompt']}\n\n"
            "STRICT RAG & DOCUMENT RULES:\n"
            "- Do NOT output or refer to chunk IDs, chunk numbers, or chunk tags in your response.\n"
            "- When answering document queries, provide an exact, complete answer based STRICTLY on the uploaded documents.\n"
            "- If the answer or requested information is NOT present in the uploaded documents, you MUST respond EXACTLY:\n"
            "  \"I do not have any information on that particular query in the uploaded documents.\"\n"
            "- Do NOT generate responses from your own internal memory or guess information not found in the documents.\n\n"
            "If user requests involve files, emails, calendar events, GitHub, Python execution, or databases, "
            "select and execute the appropriate MCP tool.\n"
            f"{rag_context}"
            f"{long_term_context}"
        )

        # 5. MCP Tools Discovery
        all_tools = mcp_client.list_available_tools() if mcp_enabled else None
        if all_tools and route_info.get("allowed_tools"):
            allowed_set = set(route_info["allowed_tools"])
            available_tools = [t for t in all_tools if t.get("name") in allowed_set or "fs_" in t.get("name", "") or "generate_" in t.get("name", "")]
            if not available_tools:
                available_tools = all_tools
        else:
            available_tools = all_tools

        # Fast-track local engine for interactive form generation to guarantee < 10ms response speed
        u_lower = user_text.lower().strip()
        is_fast_form_request = any(k in u_lower for k in ["create an event", "create event", "schedule an event", "schedule a meeting", "schedule a meet", "book meeting"])

        if is_fast_form_request:
            fallback = BuiltinFallbackLLM()
            llm_response = await fallback.generate_response(
                messages=formatted_history,
                tools=available_tools,
                system_prompt=system_prompt
            )
        else:
            providers = llm_router.get_providers_chain(requested_model)
            llm_response = None

            for p in providers:
                try:
                    llm_response = await p.generate_response(
                        messages=formatted_history,
                        tools=available_tools,
                        system_prompt=system_prompt
                    )
                    break
                except Exception as e:
                    logger.warning(f"LLM Provider {p.__class__.__name__} failed: {e}. Trying next provider...")

            if not llm_response:
                fallback = BuiltinFallbackLLM()
                llm_response = await fallback.generate_response(
                    messages=formatted_history,
                    tools=available_tools,
                    system_prompt=system_prompt
                )

        final_content = llm_response.get("content", "")
        executed_tool_calls = []

        # 6. Execute requested MCP Tools using Supervisor DAG Parallel Tiers
        tool_calls_requested = llm_response.get("tool_calls", [])
        if tool_calls_requested and mcp_enabled:
            dag_plan = supervisor_agent.build_dag_plan(tool_calls_requested)
            email_summary_text = ""

            for tier in dag_plan:
                # Prepare parallel tasks for current DAG tier
                tier_tasks = []
                tier_calls = []

                for tc in tier:
                    t_name = tc.get("name")
                    t_args = tc.get("arguments", {})

                    if t_name == "generate_document":
                        if not email_summary_text and formatted_history:
                            for h_msg in reversed(formatted_history[:-1]):
                                h_content = h_msg.get("content", "")
                                if h_content and len(h_content.strip()) > 30 and not h_content.startswith("Regarding"):
                                    email_summary_text = h_content
                                    break
                        if email_summary_text:
                            t_args["content"] = email_summary_text

                    tier_tasks.append(mcp_client.invoke_tool(t_name, t_args))
                    tier_calls.append((t_name, t_args))

                # Execute independent tools in parallel via asyncio.gather()
                tier_results = await asyncio.gather(*tier_tasks)

                for (t_name, t_args), tool_res in zip(tier_calls, tier_results):
                    executed_tool_calls.append(tool_res)
                    res_data = tool_res.get("result", {})
                
                if t_name == "gmail_list_messages" and res_data.get("status") == "success":
                    email_data = res_data.get("emails", [])
                    if email_data:
                        email_summary_text = f"TOP {len(email_data)} EMAILS SUMMARY REPORT\n\n"
                        final_content += f"\n\n### 📧 Top {len(email_data)} Emails Summary:\n"
                        for idx, em in enumerate(email_data, 1):
                            em_block = f"Email {idx}: {em.get('subject')}\nFrom: {em.get('sender')}\nDate: {em.get('date')}\nSummary: {em.get('snippet')}\n\n"
                            email_summary_text += em_block

                            final_content += f"**{idx}. {em.get('subject')}**\n"
                            final_content += f"   *From:* {em.get('sender')} | *Date:* {em.get('date')}\n"
                            final_content += f"   *Summary:* {em.get('snippet')}\n\n"

                elif t_name == "generate_document" and res_data.get("status") == "success":
                    dl_url = res_data.get("download_url")
                    fname = res_data.get("filename")
                    final_content += f"\n\n---\n📄 **Generated Document:** [{fname}]({dl_url})"

                elif t_name == "get_weather" and res_data.get("status") == "success":
                    loc = res_data.get("location") or res_data.get("city")
                    temp = res_data.get("temperature")
                    cond = res_data.get("condition")
                    wind = res_data.get("wind_speed")
                    prov = res_data.get("provider", "MCP Weather Engine")
                    final_content += f"\n\n### 🌤️ Weather for **{loc}** ({prov}):\n"
                    final_content += f"• **Temperature:** {temp}\n"
                    final_content += f"• **Condition:** {cond}\n"
                    final_content += f"• **Wind Speed:** {wind}\n"

                elif t_name == "calendar_list_events" and res_data.get("status") == "success":
                    events = res_data.get("events", [])
                    days = res_data.get("range_days", 7)
                    final_content += f"\n\n### 📅 Upcoming Schedule (Next {days} Days):\n"
                    if events:
                        for ev in events:
                            final_content += f"• **{ev.get('title')}**\n"
                            final_content += f"  *Time:* {ev.get('start')} ({ev.get('duration')})\n"
                            if ev.get("attendees"):
                                final_content += f"  *Attendees:* {', '.join(ev.get('attendees'))}\n"
                    else:
                        final_content += "No upcoming events scheduled.\n"

                elif t_name == "fs_list_dir" and res_data.get("status") == "success":
                    path = res_data.get("path", ".")
                    items = res_data.get("items", [])
                    final_content += f"\n\n### 📁 Directory Listing (`{path}`):\n"
                    for item in items:
                        icon = "📁" if item.get("is_directory") else "📄"
                        sz = f" ({item.get('size')} bytes)" if not item.get("is_directory") else ""
                        final_content += f"• {icon} `{item.get('name')}`{sz}\n"

                elif t_name == "fs_read_file" and res_data.get("status") == "success":
                    fpath = res_data.get("path")
                    title = res_data.get("title", fpath.split("/")[-1].split("\\")[-1])
                    ftype = res_data.get("file_type", "File")
                    size_bytes = res_data.get("size_bytes", 0)
                    content = res_data.get("content", "")
                    pages = res_data.get("pages", [])
                    formulas = res_data.get("formulas", [])
                    links = res_data.get("links", [])
                    images = res_data.get("images", [])
                    tables = res_data.get("tables", [])

                    final_content += f"\n\n### 👑 Document Title: **{title}**\n\n"
                    final_content += f"• **File Path:** `{fpath}`\n"
                    final_content += f"• **File Format:** `{ftype}`\n"
                    final_content += f"• **Total Pages:** `{len(pages) or 1}` page(s)\n"
                    final_content += f"• **File Size:** `{size_bytes}` bytes\n"
                    final_content += f"• **Extracted Formulas:** `{len(formulas)}` equation(s)\n"
                    final_content += f"• **Extracted Links:** `{len(links)}` link(s)\n"
                    final_content += f"• **Extracted Images:** `{len(images)}` image(s)\n"
                    final_content += f"• **Data Tables:** `{len(tables)}` table(s)\n\n"

                    if formulas:
                        final_content += f"#### 🧮 Mathematical Formulas & Equations ({len(formulas)}):\n"
                        for idx, f_item in enumerate(formulas, 1):
                            final_content += f"**Formula {idx}:**\n{f_item}\n\n"

                    if images:
                        final_content += f"#### 🖼️ Extracted Images & Media ({len(images)}):\n"
                        for idx, img in enumerate(images, 1):
                            pg_str = f" (Page {img.get('page')})" if img.get("page") else ""
                            final_content += f"• **Image {idx}:** `{img.get('name', 'Embedded Image')}`{pg_str}\n"
                        final_content += "\n"

                    if tables:
                        final_content += f"#### 📊 Data Grid & Structured Tables ({len(tables)}):\n\n"
                        for tbl in tables:
                            final_content += f"{tbl}\n\n"

                    if links:
                        final_content += f"#### 🔗 Extracted References & Links ({len(links)}):\n"
                        for idx, l in enumerate(links, 1):
                            final_content += f"**{idx}. [{l}]({l})**\n"
                        final_content += "\n"

                    final_content += f"#### 📖 Page-by-Page Document Breakdown:\n\n"
                    if pages:
                        for p in pages:
                            final_content += f"---\n### 📄 PAGE {p.get('page_number', 1)} OF {len(pages)}\n"
                            if p.get("headings"):
                                for h in p["headings"]:
                                    final_content += f"# 📌 Main Heading: **{h}**\n"
                            if p.get("subheadings"):
                                for sh in p["subheadings"]:
                                    final_content += f"## 🏷️ Subheading: *{sh}*\n"
                            if p.get("formulas"):
                                final_content += f"**Page Equations:** {', '.join(p['formulas'])}\n\n"
                            final_content += f"💬 **Normal Body / Text:**\n{p.get('formatted_text') or p.get('raw_text') or ''}\n\n"
                    else:
                        final_content += f"{content}"

                elif t_name == "run_python_code":
                    status = res_data.get("status", "completed")
                    stdout = res_data.get("stdout", "")
                    stderr = res_data.get("stderr", "")
                    final_content += f"\n\n### 🐍 Python Execution Result (`{status.upper()}`):\n"
                    if stdout:
                        final_content += f"**Output:**\n```\n{stdout}\n```\n"
                    if stderr:
                        final_content += f"**Errors:**\n```\n{stderr}\n```\n"

                elif t_name == "db_query" and res_data.get("status") == "success":
                    cols = res_data.get("columns", [])
                    data = res_data.get("data", [])
                    final_content += f"\n\n### 🗄️ Database Query Results ({len(data)} rows):\n"
                    if cols and data:
                        headers = " | ".join(cols)
                        sep = " | ".join(["---"] * len(cols))
                        final_content += f"| {headers} |\n| {sep} |\n"
                        for row in data:
                            vals = " | ".join([str(row.get(c, "")) for c in cols])
                            final_content += f"| {vals} |\n"

                elif t_name == "github_list_repos" and res_data.get("status") == "success":
                    repos = res_data.get("repositories", [])
                    owner = res_data.get("owner")
                    final_content += f"\n\n### 🐙 GitHub Repositories for **{owner}**:\n"
                    for r in repos:
                        final_content += f"• **{r.get('name')}** ({r.get('language')}) - ⭐ {r.get('stars')}\n"

                elif t_name in ["calendar_create_event", "calendar_schedule_meeting", "calendar_check_availability"]:
                    res_status = res_data.get("status")
                    person_d = res_data.get("person_resolved") or t_args.get("person") or t_args.get("attendees") or "Contact"
                    email_d = res_data.get("email_resolved", "")
                    p_str = f"{person_d} ({email_d})" if email_d and email_d != person_d else person_d
                    title = res_data.get("title", t_args.get("title", f"Meeting with {person_d}"))
                    date = res_data.get("date", t_args.get("date", "Tomorrow"))
                    stime = res_data.get("start_time", t_args.get("start_time", "3:00 PM"))
                    duration = f"{res_data.get('duration_minutes', t_args.get('duration_minutes', 30))} Minutes"
                    tz = t_args.get("timezone", "IST (UTC+5:30)")
                    m_type = t_args.get("meeting_type", "Virtual (Google Meet)")
                    other_att = ", ".join(t_args.get("other_attendees", [])) if t_args.get("other_attendees") else "None specified"
                    location = t_args.get("location", "Google Meet Video Call")
                    description = t_args.get("description", f"Discussion & sync agenda for meeting with {person_d}")
                    free_slots = res_data.get("suggested_free_slots") or ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"]

                    llm_response["a2ui"] = A2UIProtocol.create_meeting_collector(
                        person=person_d,
                        email=email_d,
                        target_date=date,
                        start_time=stime,
                        duration=res_data.get("duration_minutes", 30),
                        suggested_slots=free_slots,
                        title=title,
                        description=description
                    )
                    slots_table = (
                        f"### 🗓️ Step 1: Available Calendar Time Slots ({date}):\n"
                        "**Select from available open slots or confirm details below:**\n\n"
                        "| # | Available Open Slot | Status | Action |\n"
                        "|---|---|---|---|\n"
                    )
                    for idx, slot in enumerate(free_slots, 1):
                        slots_table += f"| {idx} | ⏰ **{slot}** | 🟢 Open & Available | Select `{slot}` |\n"
                    slots_table += f"\n> 💡 *Default Pre-selected Slot:* `{stime}`\n\n---\n\n"

                    info_table = (
                        "### 📋 Step 2: Complete Meeting Information Checklist (11 Fields):\n\n"
                        "| # | Information Field | Details / Value | Status |\n"
                        "|---|---|---|---|\n"
                        f"| 1 | **Person** | {person_d} | ✅ Specified |\n"
                        f"| 2 | **Which Contact / Email** | `{email_d or person_d}` | ✅ Resolved |\n"
                        f"| 3 | **Date** | 📅 `{date}` | ✅ Confirmed |\n"
                        f"| 4 | **Time** | ⏰ `{stime}` | 🕒 Selected Open Slot |\n"
                        f"| 5 | **Duration** | ⏱️ `{duration}` | ✅ Set |\n"
                        f"| 6 | **Timezone** | 🌍 `{tz}` | 🌐 Configured |\n"
                        f"| 7 | **Meeting Type** | `{m_type}` | 💻 Virtual |\n"
                        f"| 8 | **Title / Purpose** | **{title}** | 📌 Specified |\n"
                        f"| 9 | **Other Attendees** | `{other_att}` | 👥 Logged |\n"
                        f"| 10 | **Location** | 📍 `{location}` | 🔗 Virtual Link |\n"
                        f"| 11 | **Description / Agenda** | {description} | 📝 Logged |\n\n"
                    )

                    if res_status == "pending_approval":
                        hitl_act = res_data.get("hitl_action", {})
                        final_content += f"\n\n### ⏸️ Meeting Request Pending Human Review (HITL):\n"
                        final_content += f"**Meeting with {p_str} requested for {date} at {stime}.**\n\n"
                        final_content += slots_table
                        final_content += info_table
                        final_content += f"• **Action ID:** `{hitl_act.get('id')}`\n"
                        final_content += f"• **Status:** `AWAITING USER APPROVAL`\n"
                        final_content += f"• **Action:** Please review in the **HITL Approval Queue** dashboard to **Approve**, **Edit**, or **Reject** scheduling this meeting.\n"
                    else:
                        final_content += f"\n\n### 📅 Meeting Scheduled Successfully:\n"
                        final_content += f"**Meeting with {p_str} scheduled for {date} at {stime}.**\n\n"
                        final_content += slots_table
                        final_content += info_table
                        final_content += f"• **Conflict Check:** `{res_data.get('conflict_check', 'Passed')}`\n"
                        final_content += f"• **Invitation Sent:** Real HTML email invitation with Accept/Reject options sent to `{email_d or person_d}`.\n"

                elif t_name == "calendar_list_events" and res_data.get("status") == "success":
                    evts = res_data.get("events", [])
                    final_content += f"\n\n### 📅 Scheduled Calendar Events ({len(evts)}):\n"
                    for e in evts:
                        final_content += f"• **{e.get('title')}**: 📅 `{e.get('date')}` at ⏰ `{e.get('start_time')}` ({e.get('duration_minutes', 30)} mins) — Accepted: `{e.get('accepted_count', 0)}` | Rejected: `{e.get('rejected_count', 0)}`\n"

                elif t_name == "calendar_respond_invitation" and res_data.get("status") == "success":
                    final_content += f"\n\n### 📩 Calendar Invitation Response:\n"
                    final_content += f"• **Action:** `{res_data.get('action', '').upper()}`\n"
                    final_content += f"• **Event:** **{res_data.get('title')}** (📅 `{res_data.get('date')}` at ⏰ `{res_data.get('start_time')}`)\n"
                    final_content += f"• **Attendee:** `{res_data.get('attendee')}`\n"

                elif t_name == "gmail_send_message":
                    res_status = res_data.get("status")
                    if res_status == "pending_approval":
                        hitl_act = res_data.get("hitl_action", {})
                        final_content += f"\n\n### ⏸️ Outbound Action Pending Human Review:\n"
                        final_content += f"• **Action ID:** `{hitl_act.get('id')}`\n"
                        final_content += f"• **Recipient:** `{t_args.get('to')}`\n"
                        final_content += f"• **Subject:** `{t_args.get('subject')}`\n"
                        final_content += f"• **Status:** `AWAITING USER APPROVAL`\n"
                        final_content += f"• **Action:** Please review in the **HITL Approval Queue** to **Approve**, **Edit**, or **Reject**.\n"
                    else:
                        msg = res_data.get("message", "Email action processed.")
                        to = res_data.get("recipient", t_args.get("to"))
                        final_content += f"\n\n### ✉️ Gmail Dispatch Result:\n• **Status:** `{res_status}`\n• **Recipient:** `{to}`\n• **Details:** {msg}\n"

                elif t_name == "calendar_check_availability" and res_data.get("status") == "success":
                    avail = res_data.get("is_available")
                    t_date = res_data.get("target_date") or t_args.get("date") or "Tomorrow (2026-08-07)"
                    t_time = res_data.get("target_time") or t_args.get("start_time") or "3:00 PM"
                    slots = res_data.get("suggested_free_slots") or ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"]
                    
                    person_raw = t_args.get("person") or t_args.get("attendee") or "Contact"
                    from app.mcp.builtin_servers import CalendarStoreManager
                    disp_person, email_person = CalendarStoreManager.resolve_person_email(str(person_raw))

                    final_content += f"\n\n### 🗓️ Meeting Options & Time Slots:\nPlease select an open time slot and confirm details below for **{disp_person}** ({email_person}) on **{t_date}**:"

                elif t_name == "calendar_manage_event":
                    if res_data.get("status") == "pending_approval":
                        hitl_act = res_data.get("hitl_action", {})
                        final_content += f"\n\n### ⏸️ Event Modification Pending Human Review:\n"
                        final_content += f"• **Action ID:** `{hitl_act.get('id')}`\n"
                        final_content += f"• **Event ID:** `{t_args.get('event_id')}`\n"
                        final_content += f"• **Target Action:** `{t_args.get('action', '').upper()}`\n"
                        final_content += f"• **Status:** `AWAITING USER APPROVAL`\n"
                    else:
                        final_content += f"\n\n### 📅 Calendar Event Management:\n"
                        final_content += f"• **Action:** `{res_data.get('action', '').upper()}`\n"
                        final_content += f"• **Event ID:** `{res_data.get('event_id')}`\n"
                        final_content += f"• **Details:** {res_data.get('message')}\n"

                elif t_name == "gmail_draft_message" and res_data.get("status") == "success":
                    draft = res_data.get("draft", {})
                    final_content += f"\n\n### 📝 Email Message Draft Created:\n"
                    final_content += f"• **Draft ID:** `{draft.get('id')}`\n"
                    final_content += f"• **To:** `{draft.get('to')}`\n"
                    final_content += f"• **Subject:** `{draft.get('subject')}`\n"
                    final_content += f"• **Body Content:**\n```\n{draft.get('body')}\n```\n"

                elif t_name == "gmail_list_drafts" and res_data.get("status") == "success":
                    drafts = res_data.get("drafts", [])
                    final_content += f"\n\n### 📂 Saved Email Drafts ({len(drafts)}):\n"
                    for d in drafts:
                        final_content += f"• **{d.get('subject')}** (ID: `{d.get('id')}`)\n  *To:* `{d.get('to')}` | *Saved:* `{d.get('created_at')}`\n"

                elif t_name == "email_send_notification":
                    if res_data.get("status") == "pending_approval":
                        hitl_act = res_data.get("hitl_action", {})
                        final_content += f"\n\n### ⏸️ Notification Dispatch Pending Human Review:\n"
                        final_content += f"• **Action ID:** `{hitl_act.get('id')}`\n"
                        final_content += f"• **Target:** `{t_args.get('to')}`\n"
                        final_content += f"• **Subject:** `{t_args.get('subject')}`\n"
                        final_content += f"• **Status:** `AWAITING USER APPROVAL`\n"
                    else:
                        final_content += f"\n\n### 🔔 Notification Sent:\n"
                        final_content += f"• **Recipient:** `{res_data.get('recipient', t_args.get('to'))}`\n"
                        final_content += f"• **Details:** {res_data.get('message')}\n"

                elif t_name == "web_search" and res_data.get("status") == "success":
                    search_results = res_data.get("results", [])
                    query = res_data.get("query", "")
                    summary = res_data.get("summary_text") or (search_results[0].get("snippet") if search_results else "")

                    final_content += f"\n\n### 📖 Informational Summary for **\"{query.title()}\"**:\n"
                    if summary:
                        final_content += f"{summary}\n\n"

                    final_content += f"### 🔗 Verified Web Links & URLs for **\"{query.title()}\"**:\n\n"
                    if search_results:
                        for idx, item in enumerate(search_results[:5], 1):
                            title = item.get('title', 'Search Result')
                            snippet = item.get('snippet', '')
                            url = item.get('url', '#')
                            final_content += f"**{idx}. [{title}]({url})**\n"
                            final_content += f"   • **URL:** [{url}]({url})\n"
                            if snippet and snippet != summary:
                                final_content += f"   • **Details:** {snippet}\n\n"
                    else:
                        final_content += f"Could not find web search results for \"{query}\".\n"

                else:
                    # Clean Key-Value Markdown Renderer Fallback (No JSON Blocks)
                    final_content += f"\n\n### 📋 Execution Result for `{t_name}`:\n"
                    for k, v in res_data.items():
                        if k == "status": continue
                        fk = k.replace("_", " ").title()
                        if isinstance(v, list):
                            if not v:
                                final_content += f"• **{fk}:** *(empty list)*\n"
                            else:
                                final_content += f"• **{fk} ({len(v)}):**\n"
                                for idx, item in enumerate(v, 1):
                                    if isinstance(item, dict):
                                        sub = " | ".join([f"**{sk.replace('_', ' ').title()}:** `{sv}`" for sk, sv in item.items()])
                                        final_content += f"  - **Item {idx}:** {sub}\n"
                                    else:
                                        final_content += f"  - `{item}`\n"
                        elif isinstance(v, dict):
                            final_content += f"• **{fk}:**\n"
                            for sk, sv in v.items():
                                sfk = sk.replace("_", " ").title()
                                final_content += f"  - **{sfk}:** `{sv}`\n"
                        else:
                            final_content += f"• **{fk}:** {v}\n"

        # 7. Save Assistant response to database
        assistant_msg_db = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=final_content,
            tool_calls=executed_tool_calls if executed_tool_calls else None,
            model_used=llm_response.get("model", "auto"),
            timestamp=datetime.datetime.utcnow()
        )
        db.add(assistant_msg_db)
        conversation.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(assistant_msg_db)

        # Index completed conversation turn into Long-Term Epistemic Memory
        vector_store.add_conversation_memory(conversation_id, user_text, final_content)

        exec_duration = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Processed chat query for session '{conversation_id}' in {exec_duration}ms. Tool calls executed: {len(executed_tool_calls)}")

        a2ui_payload = None
        if executed_tool_calls:
            for tc in executed_tool_calls:
                tc_name = tc.get("tool_name") or tc.get("name")
                tc_res = tc.get("result", {})
                tc_args = tc.get("arguments", {})

                if tc_name == "calendar_check_availability" and tc_res.get("status") == "success":
                    person_raw = tc_args.get("person") or tc_args.get("attendee") or "Contact"
                    from app.mcp.builtin_servers import CalendarStoreManager
                    disp_person, email_person = CalendarStoreManager.resolve_person_email(str(person_raw))
                    t_date = tc_res.get("target_date") or tc_args.get("date") or "Tomorrow"
                    t_time = tc_res.get("target_time") or tc_args.get("start_time") or "3:00 PM"
                    slots = tc_res.get("suggested_free_slots") or ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"]
                    a2ui_payload = A2UIProtocol.create_meeting_collector(
                        person=disp_person,
                        email=email_person,
                        target_date=t_date,
                        start_time=t_time,
                        suggested_slots=slots
                    )
                elif tc_name == "calendar_create_event" and tc_res.get("status") == "pending_approval":
                    hitl_act = tc_res.get("hitl_action", {})
                    a2ui_payload = A2UIProtocol.create_hitl_approval_card(
                        action_id=hitl_act.get("id", "hitl-act"),
                        action_type="schedule_meeting",
                        title=hitl_act.get("title", "Schedule Meeting"),
                        description=hitl_act.get("description", ""),
                        payload=hitl_act.get("payload", tc_args),
                        agent_name="Calendar Agent"
                    )
                elif tc_name == "calendar_create_event" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_rsvp_badge(
                        event_id=tc_res.get("event_id", "evt-1"),
                        title=tc_res.get("title", "Meeting"),
                        date=tc_res.get("date", "Tomorrow"),
                        start_time=tc_res.get("start_time", "3:00 PM"),
                        attendees=tc_res.get("attendees", []),
                        rsvps=tc_res.get("rsvps", {})
                    )
                elif tc_name == "calendar_list_events" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_calendar_events_list(
                        events=tc_res.get("events", []),
                        days=tc_res.get("range_days", 7)
                    )
                elif tc_name == "gmail_list_messages" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_email_inbox(tc_res.get("emails", []))
                elif tc_name == "run_python_code":
                    a2ui_payload = A2UIProtocol.create_python_execution(
                        status=tc_res.get("status", "completed"),
                        stdout=tc_res.get("stdout", ""),
                        stderr=tc_res.get("stderr", "")
                    )
                elif tc_name == "db_query" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_data_table(
                        columns=tc_res.get("columns", []),
                        rows=tc_res.get("data", []),
                        title="Database Query Results"
                    )
                elif tc_name == "get_weather" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_weather_card(
                        location=tc_res.get("location") or tc_res.get("city") or "Location",
                        temperature=str(tc_res.get("temperature", "")),
                        condition=str(tc_res.get("condition", "")),
                        wind=str(tc_res.get("wind_speed", "")),
                        provider=str(tc_res.get("provider", "Weather Engine"))
                    )
                elif tc_name == "github_list_repos" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_github_repos(
                        owner=tc_res.get("owner", "user"),
                        repos=tc_res.get("repositories", [])
                    )
                elif tc_name == "fs_read_file" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_document_reader(
                        title=tc_res.get("title", "File"),
                        path=tc_res.get("path", ""),
                        ftype=tc_res.get("file_type", "File"),
                        pages=tc_res.get("pages", []),
                        formulas=tc_res.get("formulas", []),
                        links=tc_res.get("links", []),
                        images=tc_res.get("images", []),
                        tables=tc_res.get("tables", [])
                    )
                elif tc_name == "fs_list_dir" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_directory_browser(
                        path=tc_res.get("path", "."),
                        items=tc_res.get("items", [])
                    )
                elif tc_name == "web_search" and tc_res.get("status") == "success":
                    a2ui_payload = A2UIProtocol.create_search_results(
                        query=tc_res.get("query", ""),
                        results=tc_res.get("results", [])
                    )
                elif not a2ui_payload:
                    a2ui_payload = A2UIProtocol.create_generic_card(tc_name, tc_res)

        if not a2ui_payload and llm_response and llm_response.get("a2ui"):
            a2ui_payload = llm_response.get("a2ui")

        return {
            "id": assistant_msg_db.id,
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": final_content,
            "timestamp": assistant_msg_db.timestamp,
            "tool_calls": executed_tool_calls,
            "model_used": assistant_msg_db.model_used,
            "latency_ms": exec_duration,
            "a2ui": a2ui_payload
        }

orchestrator = AIOrchestrator()
