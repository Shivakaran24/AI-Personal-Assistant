import json
import re
from typing import List, Dict, Any, Optional
from app.llm.base import BaseLLMProvider
from app.core.logger import logger

class BuiltinFallbackLLM(BaseLLMProvider):
    """
    Built-in heuristic intelligence engine. Ensures the assistant responds 
    intelligently and chooses MCP tools even when API keys are not provided.
    """

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "")
                break

        msg_lower = last_user_msg.lower().strip()
        
        # Check for multi-turn event creation dialog flow
        multiturn_res = self._process_multiturn_event_creation(messages, last_user_msg)
        if multiturn_res:
            return multiturn_res

        tool_calls = []

        # Extract previous conversational context from history for short follow-up prompts
        prev_history_content = ""
        for m in reversed(messages[:-1]):
            if m.get("content") and len(m.get("content").strip()) > 30:
                prev_history_content = m.get("content").strip()
                break

        # Short follow-up intent detection ("make a pdf of above", "make pdf", "export to pdf", "save as pdf")
        pdf_keywords = ["make a pdf", "make pdf", "export to pdf", "save as pdf", "create pdf", "generate pdf", "convert to pdf", "download pdf", "pdf of above", "make a pdf of above"]
        if any(k in msg_lower for k in pdf_keywords) or msg_lower in ["pdf", "make pdf", "make a pdf", "pdf of above"]:
            ext = ".docx" if "word" in msg_lower or "docx" in msg_lower else ".pdf"
            is_email = "email" in prev_history_content.lower() or "gmail" in prev_history_content.lower()
            doc_filename = f"email_summary{ext}" if is_email else f"document_summary{ext}"
            doc_title = "Email Summary & Insights" if is_email else "Document Summary"

            tool_calls.append({
                "name": "generate_document",
                "arguments": {
                    "filename": doc_filename,
                    "title": doc_title,
                    "content": prev_history_content or "Summary of information compiled by AI Assistant."
                }
            })

        # 1. Calendar / Meeting Scheduling Intent (Evaluated before general email check)
        elif "meeting" in msg_lower or "calendar" in msg_lower or "schedule" in msg_lower or "event" in msg_lower or "appointment" in msg_lower:
            if "create" in msg_lower or "schedule" in msg_lower or "add" in msg_lower or "with" in msg_lower or "book" in msg_lower:
                emails_found = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', last_user_msg)
                
                person_input = emails_found[0] if emails_found else None
                if not person_input:
                    name_m = re.search(r'(?:with|to|for|meet)\s+([A-Za-z\.\s_]+)', last_user_msg, re.IGNORECASE)
                    if name_m:
                        raw_n = name_m.group(1).split("tomorrow")[0].split("today")[0].split("at")[0].strip()
                        person_input = re.sub(r'^(schedule\s+a\s+meet(ing)?\s+with|schedule\s+with|meet\s+with|meet|with|for|to)\s+', '', raw_n, flags=re.IGNORECASE).strip()

                date_match = re.search(r'\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b', last_user_msg)
                custom_date = date_match.group(1) if date_match else ("today" if "today" in msg_lower else ("tomorrow" if "tomorrow" in msg_lower else None))

                time_match = re.search(r'\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\b', last_user_msg)
                start_time_val = time_match.group(1) if time_match else ("3:00 PM")

                args_dict = {
                    "person": person_input or "Contact",
                    "date": custom_date or "tomorrow",
                    "start_time": start_time_val
                }

                tool_calls.append({
                    "name": "calendar_check_availability",
                    "arguments": args_dict
                })
            else:
                tool_calls.append({
                    "name": "calendar_list_events",
                    "arguments": {"days": 7}
                })

        # 2. Email Communication & Outbox Intent
        elif "email" in msg_lower or "inbox" in msg_lower or "mail" in msg_lower:
            if "send" in msg_lower or "draft" in msg_lower:
                email_args = self._draft_professional_email(last_user_msg)
                tool_calls.append({
                    "name": "gmail_send_message",
                    "arguments": email_args
                })
            else:
                num_match = re.search(r'\b(\d+)\b', msg_lower)
                limit = int(num_match.group(1)) if num_match else 10
                tool_calls.append({
                    "name": "gmail_list_messages",
                    "arguments": {"query": "inbox", "limit": limit}
                })

                if any(k in msg_lower for k in ["doc", "word", "pdf", "file", "download", "summary"]):
                    ext = ".pdf" if "pdf" in msg_lower else ".docx"
                    doc_filename = f"email_summary{ext}"
                    tool_calls.append({
                        "name": "generate_document",
                        "arguments": {
                            "filename": doc_filename,
                            "title": f"Summary of Top {limit} Inbox Emails",
                            "content": f"Summary of Top {limit} Emails:\n\nDetailed breakdown of recent inbox communications compiled by AI Assistant."
                        }
                    })

        elif "repo" in msg_lower or "github" in msg_lower or "issue" in msg_lower:
            if "issue" in msg_lower:
                tool_calls.append({
                    "name": "github_create_issue",
                    "arguments": {
                        "repo": "user/mcp-ai-assistant",
                        "title": "Issue generated from user request",
                        "body": last_user_msg
                    }
                })
            else:
                tool_calls.append({
                    "name": "github_list_repos",
                    "arguments": {"user_or_org": "developer"}
                })

        elif "python" in msg_lower or "code" in msg_lower or "run" in msg_lower or "script" in msg_lower or "calculate" in msg_lower:
            if "run" in msg_lower or "execute" in msg_lower or "print" in msg_lower or "import" in msg_lower:
                # Extract snippet if present
                code_match = re.search(r'```python(.*?)```', last_user_msg, re.DOTALL)
                code_snippet = code_match.group(1).strip() if code_match else "print('Hello from Python Sandbox!')\nimport math\nprint('Sqrt of 144 is:', math.sqrt(144))"
                tool_calls.append({
                    "name": "run_python_code",
                    "arguments": {"code": code_snippet}
                })

        elif "file" in msg_lower or "dir" in msg_lower or "folder" in msg_lower or "save" in msg_lower:
            if "save" in msg_lower or "write" in msg_lower:
                tool_calls.append({
                    "name": "fs_write_file",
                    "arguments": {"path": "notes.txt", "content": last_user_msg}
                })
            elif "list" in msg_lower:
                tool_calls.append({
                    "name": "fs_list_dir",
                    "arguments": {"path": "."}
                })

        # Direct Slash Commands in Chat (e.g. /get_weather city=Tokyo, /fs_list_dir path=.)
        if last_user_msg.startswith("/"):
            parts = last_user_msg[1:].split(" ", 1)
            t_cmd = parts[0].strip()
            rest = parts[1].strip() if len(parts) > 1 else ""
            
            if t_cmd == "get_weather":
                c_val = "San Francisco"
                cn_val = ""
                if "," in rest:
                    c_parts = rest.split(",")
                    c_val = c_parts[0].replace("city=", "").strip()
                    cn_val = c_parts[1].replace("country=", "").strip()
                elif rest:
                    c_val = rest.replace("city=", "").strip()
                tool_calls.append({"name": "get_weather", "arguments": {"city": c_val, "country": cn_val}})

            elif t_cmd in ["fs_list_dir", "list_dir"]:
                tool_calls.append({"name": "fs_list_dir", "arguments": {"path": rest or "."}})

            elif t_cmd in ["fs_read_file", "read_file"]:
                tool_calls.append({"name": "fs_read_file", "arguments": {"path": rest}})

            elif t_cmd in ["run_python_code", "python"]:
                tool_calls.append({"name": "run_python_code", "arguments": {"code": rest or "print('Hello World')"}})

            elif t_cmd in ["db_query", "query"]:
                tool_calls.append({"name": "db_query", "arguments": {"query": rest or "SELECT name FROM sqlite_master WHERE type='table'"}})

            elif t_cmd in ["gmail_list_messages", "list_emails"]:
                tool_calls.append({"name": "gmail_list_messages", "arguments": {"limit": 10}})

            elif t_cmd in ["calendar_list_events", "events"]:
                tool_calls.append({"name": "calendar_list_events", "arguments": {"days": 30}})

        elif "weather" in msg_lower or "forecast" in msg_lower or "temperature" in msg_lower:
            loc_match = re.search(r'(?:in|for|at)\s+([a-zA-Z\s,]+)', last_user_msg, re.IGNORECASE)
            city = "San Francisco"
            country = ""
            if loc_match:
                raw_loc = loc_match.group(1).strip()
                if "," in raw_loc:
                    parts = raw_loc.split(",")
                    city = parts[0].strip()
                    country = parts[1].strip()
                else:
                    city = raw_loc
            tool_calls.append({
                "name": "get_weather",
                "arguments": {"city": city, "country": country}
            })

        elif any(k in msg_lower for k in [
            "search the web", "google search", "look up on web", "browse web", "search web", "latest news", "information", "info", "tell me about", "details about", "facts about"
        ]) or (
            any(k in msg_lower for k in ["who", "what", "where", "when", "how", "why", "ceo", "founder", "president", "capital", "population", "give me"])
            and not (system_prompt and "RELEVANT KNOWLEDGE BASE DOCUMENTS" in system_prompt)
            and not any(k in msg_lower for k in ["document", "pdf", "file", "kb", "knowledge base", "paper", "uploaded"])
        ) or (
            not any(k in msg_lower for k in ["meeting", "calendar", "event", "email", "inbox", "mail", "python", "code", "repo", "github", "file", "folder", "weather", "schedule", "draft", "run"])
            and not (system_prompt and "RELEVANT KNOWLEDGE BASE DOCUMENTS" in system_prompt)
        ):
            clean_q = re.sub(r'^(i\s+want\s+information\s+about|i\s+want\s+info\s+about|i\s+want\s+to\s+know\s+about|give\s+me\s+the\s+information\s+about|give\s+me\s+information\s+about|tell\s+me\s+about|info\s+on|search\s+for|search\s+the\s+web\s+for|search\s+web\s+for|google\s+search|look\s+up\s+on\s+web|browse\s+web|information\s+about|details\s+about|facts\s+about)\s+', '', last_user_msg, flags=re.IGNORECASE)
            tool_calls.append({
                "name": "web_search",
                "arguments": {"query": clean_q.strip() if clean_q.strip() else last_user_msg}
            })

        if tool_calls:
            return {
                "content": f"I will use the following MCP tools to fulfill your request: {[t['name'] for t in tool_calls]}",
                "tool_calls": tool_calls,
                "model": "built-in-mcp-orchestrator"
            }

        # Direct text Q&A synthesis (no unnecessary tool calls or download buttons)
        response_text = self._synthesize_general_response(last_user_msg, system_prompt)
        return {
            "content": response_text,
            "tool_calls": [],
            "model": "built-in-mcp-orchestrator"
        }

    def _synthesize_general_response(self, user_prompt: str, system_prompt: str = "") -> str:
        prompt_lower = user_prompt.lower().strip()
        
        # If RAG Knowledge Base passages are present in system_prompt, render them
        if system_prompt and "RELEVANT KNOWLEDGE BASE DOCUMENTS:" in system_prompt:
            rag_docs = system_prompt.split("RELEVANT KNOWLEDGE BASE DOCUMENTS:\n")[-1].strip()
            return (
                f"### 📚 Knowledge Base Answer (From Uploaded Documents)\n\n"
                f"Based on your uploaded document context for **\"{user_prompt}\"**:\n\n"
                f"{rag_docs}\n\n"
                f"> *Source: Grounded directly in your indexed Knowledge Base vector store.*"
            )
        
        # Direct accurate Q&A matching
        if "ceo of anthropic" in prompt_lower or "anthropic ceo" in prompt_lower or ("anthropic" in prompt_lower and "ceo" in prompt_lower):
            return "The CEO of Anthropic is **Dario Amodei**. He co-founded Anthropic in 2021 alongside former OpenAI research leaders, including his sister Daniela Amodei (who serves as President)."
        
        elif "ceo of openai" in prompt_lower or "openai ceo" in prompt_lower:
            return "The CEO of OpenAI is **Sam Altman**."
            
        elif "ceo of google" in prompt_lower or "google ceo" in prompt_lower or "ceo of alphabet" in prompt_lower:
            return "The CEO of Google (and Alphabet Inc.) is **Sundar Pichai**."

        elif "ceo of microsoft" in prompt_lower or "microsoft ceo" in prompt_lower:
            return "The CEO of Microsoft is **Satya Nadella**."

        elif "ceo of apple" in prompt_lower or "apple ceo" in prompt_lower:
            return "The CEO of Apple is **Tim Cook**."

        elif "agi" in prompt_lower or "artificial general intelligence" in prompt_lower:
            return (
                "**Artificial General Intelligence (AGI)** refers to AI systems capable of understanding, learning, and applying intelligence across any intellectual task at or beyond human levels.\n\n"
                "Key research pillars include world models, causal reasoning, neuro-symbolic search, and agentic tool integration (MCP)."
            )

        elif "ai" in prompt_lower or "machine learning" in prompt_lower or "deep learning" in prompt_lower:
            return (
                f"**Artificial Intelligence (AI)** centers on building computational models capable of learning, reasoning, and task execution.\n\n"
                f"Regarding **\"{user_prompt}\"**, key domains include Large Language Models (LLMs), Computer Vision, Reinforcement Learning, and MCP Tool Integration."
            )

        else:
            clean_topic = user_prompt.strip("? .!")
            return f"Regarding **\"{user_prompt}\"**:\n\nI am ready to help you with this topic! If you'd like me to fetch emails, write & execute Python code in the sandbox, or generate a downloadable Word (.docx) or PDF (.pdf) document, simply let me know."

    def _draft_professional_email(self, user_text: str) -> Dict[str, str]:
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_text)
        recipient = email_match.group(0) if email_match else ""

        if not recipient:
            name_match = re.search(r'(?:to|email|mail)\s+([A-Z][a-z]+)', user_text)
            name = name_match.group(1) if name_match else "Team"
            recipient = f"{name.lower()}@company.com"
        else:
            name_part = recipient.split("@")[0].replace(".", " ").replace("_", " ")
            name = name_part.title()

        clean_idea = re.sub(
            r'^(send|draft|write|compose)\s+(an?\s+)?(email|mail|message)\s+(to\s+[\w\.-]+@[\w\.-]+\.\w+|to\s+[a-zA-Z]+)?\s*(about|regarding|for|asking|saying|that)?\s*',
            '',
            user_text,
            flags=re.IGNORECASE
        ).strip()

        if not clean_idea:
            clean_idea = "General Inquiry & Follow-up"

        msg_lower = user_text.lower()
        if "leave" in msg_lower or "sick" in msg_lower or "vacation" in msg_lower:
            subject = "Application for Leave of Absence"
        elif "meeting" in msg_lower or "schedule" in msg_lower or "discussion" in msg_lower:
            subject = f"Meeting Request: {clean_idea[:30].title()}"
        elif "status" in msg_lower or "update" in msg_lower or "project" in msg_lower:
            subject = f"Project Update: {clean_idea[:30].title()}"
        else:
            subject = f"Important Update: {clean_idea[:35].capitalize()}"

        formatted_idea = clean_idea.strip(". ")
        body = (
            f"Hi {name},\n\n"
            f"I hope this message finds you well.\n\n"
            f"I am writing to reach out regarding the following:\n"
            f"• {formatted_idea.capitalize()}.\n\n"
            f"Please let me know your thoughts or if you need any additional information.\n\n"
            f"Best regards,\n"
            f"Sent via AI Assistant"
        )

        return {
            "to": recipient,
            "subject": subject,
            "body": body
        }

    def _extract_event_slots(self, messages: List[Dict[str, str]], last_user_msg: str) -> Dict[str, Any]:
        """
        Dynamically extracts all 7 event slots across current prompt and past conversation trajectory:
        1. title
        2. date
        3. start_time
        4. duration / end_time
        5. attendees (DYNAMIC resolution)
        6. location
        7. description
        """
        all_text = " ".join([m.get("content", "") for m in messages if m.get("content")] + [last_user_msg])
        text_lower = all_text.lower()
        
        # 1. Extract Date
        date_match = re.search(r'\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b', all_text)
        custom_date = date_match.group(1) if date_match else ("today" if "today" in text_lower else ("tomorrow" if "tomorrow" in text_lower else None))

        # 2. Extract Start Time
        time_match = re.search(r'\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b', all_text)
        custom_time = time_match.group(1) if time_match else None
        if not custom_time:
            t_num = re.search(r'\bat\s+(\d{1,2})\s*(?:pm|am)?\b', text_lower)
            if t_num:
                custom_time = f"{t_num.group(1)}:00 PM"

        # 3. Extract Duration / End Time
        dur_match = re.search(r'\b(\d+)\s*(hour|hr|hours|minute|min|minutes)\b', text_lower)
        duration_val = "1 hour"
        duration_mins = 60
        if dur_match:
            val = int(dur_match.group(1))
            unit = dur_match.group(2)
            if "hour" in unit or "hr" in unit:
                duration_val = f"{val} hour" if val == 1 else f"{val} hours"
                duration_mins = val * 60
            else:
                duration_val = f"{val} minutes"
                duration_mins = val

        # Calculate End Time
        end_time_val = "4:00 PM"
        if custom_time:
            try:
                h_m = re.search(r'(\d{1,2})', custom_time)
                if h_m:
                    h = int(h_m.group(1))
                    meridian = "PM" if "pm" in custom_time.lower() else "AM"
                    end_h = h + (duration_mins // 60)
                    end_time_val = f"{end_h}:00 {meridian}"
            except Exception:
                end_time_val = "4:00 PM"

        # 4. DYNAMIC Attendee Resolution
        attendees = []
        emails_found = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', all_text)
        for em in emails_found:
            name_part = em.split('@')[0].replace('.', ' ').title()
            attendees.append({"name": name_part, "email": em})

        if not attendees:
            att_match = re.search(r'(?:with|invite|attendees?)\s+([A-Za-z0-9\s,\._&]+?)(?=\s+tomorrow|\s+today|\s+at|\s+for|\.|$)', all_text, re.IGNORECASE)
            if att_match:
                raw_names_str = att_match.group(1).strip()
                raw_list = [n.strip() for n in re.split(r'\band\b|,|&', raw_names_str) if n.strip()]
                from app.mcp.builtin_servers import CalendarStoreManager
                for rn in raw_list:
                    if len(rn) > 1 and rn.lower() not in ["one", "an", "the", "hour"]:
                        d_name, d_email = CalendarStoreManager.resolve_person_email(rn)
                        attendees.append({"name": d_name, "email": d_email})

        # Remove duplicate attendees by email
        unique_attendees = []
        seen_emails = set()
        for att in attendees:
            if att["email"] not in seen_emails:
                seen_emails.add(att["email"])
                unique_attendees.append(att)

        # 5. Extract Title / Topic
        title = None
        last_ast_msg = ""
        for m in reversed(messages[:-1]):
            if m.get("role") == "assistant" and m.get("content"):
                last_ast_msg = m.get("content").strip()
                break

        if "what's the event about?" in last_ast_msg.lower() or "what is the event about?" in last_ast_msg.lower():
            clean_t = re.sub(r'^(it\s+is\s+about|it\'s\s+about|about|the\s+event\s+is|title\s+is)\s+', '', last_user_msg, flags=re.IGNORECASE).strip().rstrip(".").title()
            if clean_t:
                title = clean_t

        if not title:
            title_m = re.search(r'(?:create|schedule|add)\s+(?:a|an)?\s*(?:event\s+about|meeting\s+about)?\s*([A-Za-z0-9\s_]+?)(?=\s+tomorrow|\s+today|\s+on|\s+at|\s+for|\s+with|\.|$)', last_user_msg, re.IGNORECASE)
            if title_m:
                raw_t = title_m.group(1).strip()
                if raw_t.lower() not in ["an event", "event", "meeting", "a meeting", "a event", "an", "a"]:
                    title = raw_t.title()

        if title and title.lower() in ["an event", "event", "meeting", "a meeting", "an", "a", "n event", "n meeting"] or (title and "create" in title.lower()):
            title = None

        if not title:
            if "project review" in text_lower: title = "Project Review"
            elif "holi" in text_lower: title = "Holi"
            elif "sync" in text_lower: title = "Team Sync"
            elif "review" in text_lower: title = "Design Review"

        # 6. Extract Location
        loc_match = re.search(r'(?:at|in|location)\s+(Google Meet|Zoom|Microsoft Teams|Office Room \d+|Conference Room [A-Z])', all_text, re.IGNORECASE)
        location = loc_match.group(1) if loc_match else ""

        # 7. Extract Description
        desc_match = re.search(r'(?:description|agenda|details?):\s*([^\n]+)', all_text, re.IGNORECASE)
        description = desc_match.group(1) if desc_match else ""

        return {
            "title": title,
            "date": custom_date,
            "start_time": custom_time,
            "end_time": end_time_val,
            "duration": duration_val,
            "duration_mins": duration_mins,
            "attendees": unique_attendees,
            "location": location,
            "description": description
        }

    def _process_multiturn_event_creation(self, messages: List[Dict[str, str]], last_user_msg: str) -> Optional[Dict[str, Any]]:
        msg_lower = last_user_msg.lower().strip().rstrip(".")
        all_text = " ".join([m.get("content", "") for m in messages if m.get("content")] + [last_user_msg])
        text_lower = all_text.lower()
        
        last_ast_msg = ""
        for m in reversed(messages[:-1]):
            if m.get("role") == "assistant" and m.get("content"):
                last_ast_msg = m.get("content").strip()
                break

        last_ast_lower = last_ast_msg.lower()

        # Step 1: INTENT DETECTION (create_calendar_event)
        is_event_request = any(k in msg_lower for k in ["event", "meeting", "schedule", "create", "review", "sync", "appointment", "call", "book"]) or any(k in last_ast_lower for k in ["what's the event about?", "when should i schedule it?", "how long should it be?", "would you like to invite anyone?", "should i invite them?", "would you like me to create it?"])
        if not is_event_request:
            return None

        # Step 2: EXTRACT PROVIDED SLOTS (7 slots + dynamic attendees)
        slots = self._extract_event_slots(messages, last_user_msg)

        from app.mcp.a2ui import A2UIProtocol
        person_name = slots["attendees"][0]["name"] if slots["attendees"] else ""
        person_email = slots["attendees"][0]["email"] if slots["attendees"] else ""

        is_meeting_specific = "meeting" in msg_lower or "meet" in msg_lower

        if is_meeting_specific:
            a2ui_payload = A2UIProtocol.create_meeting_collector(
                person=person_name or "Contact",
                email=person_email or "contact@company.com",
                target_date=slots["date"] or "",
                start_time=slots["start_time"] or "",
                title=slots["title"] or "",
                duration=slots["duration_mins"] or 30,
                location=slots["location"] or "",
                description=slots["description"] or ""
            )
        else:
            a2ui_payload = A2UIProtocol.create_event_collector(
                title=slots["title"] or "",
                target_date=slots["date"] or "",
                start_time=slots["start_time"] or "",
                end_time=slots["end_time"] or "",
                duration=slots["duration_mins"] or "",
                location=slots["location"] or "",
                description=slots["description"] or "",
                attendees=[a["email"] for a in slots["attendees"]] if slots["attendees"] else []
            )

        # Step 3: REQUIRED FIELDS MISSING CHECK
        # 3a. Missing Title? -> Ask ONLY missing title & attach Interactive Form!
        if not slots["title"]:
            form_name = "Interactive Event Form" if not is_meeting_specific else "Interactive Meeting Form"
            return {
                "content": f"Sure. What's the event about? I've also generated the **{form_name}** below so you can enter or confirm details directly:",
                "tool_calls": [],
                "a2ui": a2ui_payload,
                "model": "built-in-mcp-orchestrator"
            }

        # 3b. Missing Date or Time? -> Ask ONLY missing Date/Time & attach Interactive Form!
        if not slots["date"] and not slots["start_time"]:
            form_name = "Interactive Event Form" if not is_meeting_specific else "Interactive Meeting Form"
            return {
                "content": f"When should I schedule it? Please select an open time slot or confirm details in the **{form_name}** below:",
                "tool_calls": [],
                "a2ui": a2ui_payload,
                "model": "built-in-mcp-orchestrator"
            }

        # Step 4 & 5: VALIDATE, CHECK CONFLICTS & CONFIRM IF NEEDED (Interactive A2UI Form)
        if "would you like me to create it?" not in last_ast_lower and not ("done" in last_ast_lower or "created" in last_ast_lower):
            if "would you like to invite anyone?" in last_ast_lower and slots["attendees"]:
                att_names = " and ".join([a["name"] for a in slots["attendees"]])
                return {
                    "content": f"I found {att_names} in your contacts.\nShould I invite them?",
                    "tool_calls": [],
                    "model": "built-in-mcp-orchestrator"
                }

            dt_display = f"{slots['date'] or 'Tomorrow'} at {slots['start_time'] or '6:00 PM'}"
            form_name = "Interactive Event Form" if not is_meeting_specific else "Interactive Meeting Form"

            return {
                "content": f"I've generated the **{form_name}** for **{slots['title']}** on **{dt_display}**. Please review the details below, edit any fields as needed, and submit to queue for Human-in-the-Loop review & approval:",
                "tool_calls": [
                    {
                        "name": "calendar_check_availability",
                        "arguments": {
                            "person": person_name,
                            "date": slots["date"] or "tomorrow",
                            "start_time": slots["start_time"] or "6:00 PM"
                        }
                    }
                ],
                "a2ui": a2ui_payload,
                "model": "built-in-mcp-orchestrator"
            }

        # Step 6 & 7: MCP CALENDAR TOOL EXECUTION & VERIFY RESULT
        if any(w in msg_lower for w in ["yes", "sure", "yep", "create", "do it", "ok", "confirm"]):
            from app.mcp.a2ui import A2UIProtocol
            a2ui_payload = A2UIProtocol.create_event_confirmation_card(
                title=slots["title"] or "Project Review",
                target_date=slots["date"] or "tomorrow",
                start_time=slots["start_time"] or "3:00 PM",
                end_time=slots["end_time"],
                duration=slots["duration"],
                attendees=slots["attendees"] or [{"name": "Rahul Sharma", "email": "rahul@company.com"}],
                location=slots["location"]
            )

            return {
                "content": "Done. The event has been created.",
                "tool_calls": [
                    {
                        "name": "calendar_create_event",
                        "arguments": {
                            "title": slots["title"] or "Project Review",
                            "date": slots["date"] or "tomorrow",
                            "start_time": slots["start_time"] or "3:00 PM",
                            "duration_minutes": slots["duration_mins"],
                            "attendees": [a["email"] for a in slots["attendees"]] if slots["attendees"] else ["rahul@company.com"]
                        }
                    }
                ],
                "a2ui": a2ui_payload,
                "model": "built-in-mcp-orchestrator"
            }

        return None
