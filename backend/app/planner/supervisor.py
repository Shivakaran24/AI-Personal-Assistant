import json
from typing import Dict, List, Any, Optional
from app.core.logger import logger

class CalendarWorkerAgent:
    """
    Specialized Calendar Worker Agent.
    Responsible exclusively for scheduling, checking schedule availability, resolving conflicts,
    and managing calendar events (rescheduling, updating, canceling, RSVP tracking).
    """
    NAME = "Calendar Agent"
    SYSTEM_PROMPT = (
        "You are the specialized Calendar Agent.\n"
        "Your sole domain covers calendar scheduling, checking free/busy availability, conflict resolution, "
        "and event management (creating, updating, rescheduling, canceling events, and tracking RSVPs).\n"
        "Use the appropriate calendar tools: 'calendar_check_availability', 'calendar_create_event', "
        "'calendar_list_events', 'calendar_manage_event', 'calendar_respond_invitation'.\n"
        "Be concise, clear, and ensure time formats and dates are accurately formatted."
    )
    ALLOWED_TOOLS = [
        "calendar_check_availability",
        "calendar_create_event",
        "calendar_list_events",
        "calendar_manage_event",
        "calendar_respond_invitation",
        "calendar_get_dashboard_stats",
        "calendar_clear_history"
    ]

class EmailWorkerAgent:
    """
    Specialized Email Worker Agent.
    Responsible exclusively for managing communication, reading inbox messages, drafting email messages,
    listing pending drafts, and dispatching notifications. Outbound emails & notifications undergo Human-in-the-Loop review.
    """
    NAME = "Email Agent"
    SYSTEM_PROMPT = (
        "You are the specialized Email Agent.\n"
        "Your sole domain covers managing email communication, checking/reading inbox messages, "
        "drafting professional email messages for review, and dispatching notifications.\n"
        "Use the appropriate email tools: 'gmail_list_messages', 'gmail_draft_message', 'gmail_list_drafts', "
        "'email_send_notification', 'gmail_send_message'.\n"
        "Note: Outbound emails and external notifications require Human-in-the-Loop approval before execution."
    )
    ALLOWED_TOOLS = [
        "gmail_list_messages",
        "gmail_draft_message",
        "gmail_list_drafts",
        "email_send_notification",
        "gmail_send_message"
    ]

class SupervisorAgent:
    """
    Top-Level Multi-Agent Supervisor Orchestrator.
    Partitions user requests into domain-specific worker delegations (Calendar Agent, Email Agent),
    manages worker tool subsets and instructions, and integrates Human-in-the-Loop (HITL) approval workflows.
    """
    def __init__(self):
        self.calendar_worker = CalendarWorkerAgent()
        self.email_worker = EmailWorkerAgent()

    def route_and_partition(self, user_text: str) -> Dict[str, Any]:
        """
        Analyzes user query and determines target worker domain(s) and tool partition.
        """
        text_lower = user_text.lower()

        is_calendar = any(k in text_lower for k in [
            "calendar", "schedule", "meeting", "event", "availability", "free slot", "conflict",
            "appoint", "reschedule", "cancel meeting", "rsvp", "invite"
        ])

        is_email = any(k in text_lower for k in [
            "email", "inbox", "draft", "message", "send email", "mail", "notification",
            "notify", "outbox", "recipient"
        ])

        if is_calendar and is_email:
            assigned_domain = "multi_agent"
            workers = [self.calendar_worker.NAME, self.email_worker.NAME]
            focused_prompt = (
                f"Multi-Agent Coordinated Execution Mode:\n"
                f"1. Delegate calendar queries (availability, scheduling, event management) to the {self.calendar_worker.NAME}.\n"
                f"2. Delegate email tasks (communication, message drafting, notifications) to the {self.email_worker.NAME}.\n"
                f"Outbound emails, notifications, and event cancellations require Human-in-the-Loop user approval."
            )
            allowed_tools = self.calendar_worker.ALLOWED_TOOLS + self.email_worker.ALLOWED_TOOLS
        elif is_calendar:
            assigned_domain = "calendar"
            workers = [self.calendar_worker.NAME]
            focused_prompt = f"Primary Agent: {self.calendar_worker.NAME}.\n{self.calendar_worker.SYSTEM_PROMPT}"
            allowed_tools = self.calendar_worker.ALLOWED_TOOLS
        elif is_email:
            assigned_domain = "email"
            workers = [self.email_worker.NAME]
            focused_prompt = f"Primary Agent: {self.email_worker.NAME}.\n{self.email_worker.SYSTEM_PROMPT}"
            allowed_tools = self.email_worker.ALLOWED_TOOLS
        else:
            assigned_domain = "general"
            workers = ["General Assistant"]
            focused_prompt = "You are an AI Assistant capable of filesystem, database, code execution, web search, calendar, and email management."
            allowed_tools = None  # All available tools

        logger.info(f"Supervisor routed query to domain '{assigned_domain}' with active worker(s): {workers}")

        return {
            "assigned_domain": assigned_domain,
            "active_workers": workers,
            "focused_prompt": focused_prompt,
            "allowed_tools": allowed_tools
        }

    def build_dag_plan(self, tool_calls: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Partitions a list of requested MCP tool calls into a Directed Acyclic Graph (DAG) of execution tiers.
        Tier 0 contains independent read/fetch tools that execute concurrently via asyncio.gather().
        Tier 1+ contains dependent write/generation tools that consume data produced in Tier 0.
        """
        if not tool_calls:
            return []

        dependent_tools = {"generate_document", "gmail_draft_message", "gmail_send_message", "calendar_create_event", "email_send_notification"}

        tier_0 = []
        tier_1 = []

        for tc in tool_calls:
            name = tc.get("name")
            if name in dependent_tools:
                tier_1.append(tc)
            else:
                tier_0.append(tc)

        dag = []
        if tier_0:
            dag.append(tier_0)
        if tier_1:
            dag.append(tier_1)

        logger.info(f"Supervisor constructed DAG Plan: Tier 0 ({len(tier_0)} parallel read tools) -> Tier 1 ({len(tier_1)} dependent action tools)")
        return dag

supervisor_agent = SupervisorAgent()

