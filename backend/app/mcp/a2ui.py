import datetime
from typing import Dict, List, Any, Optional

class A2UIProtocol:
    """
    Standardized Agent-to-User Interface (A2UI) Protocol Generator.
    Produces declarative, security-safe JSON component payloads emitted by
    Agentic AI Workers and MCP Tool Servers for client-side rendering across ALL tools.
    """
    
    VERSION = "1.0"

    @classmethod
    def create_meeting_collector(
        cls,
        person: str,
        email: str,
        target_date: str = "tomorrow",
        start_time: str = "3:00 PM",
        suggested_slots: Optional[List[str]] = None,
        duration: int = 30,
        timezone: str = "IST (UTC+5:30)",
        meeting_type: str = "Virtual (Google Meet)",
        title: Optional[str] = None,
        location: str = "Google Meet Video Call",
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        slots = suggested_slots or ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"]
        return {
            "version": cls.VERSION,
            "component": "InteractiveMeetingCollector",
            "props": {
                "person": person,
                "email": email,
                "date": target_date,
                "time": start_time,
                "duration": duration,
                "timezone": timezone,
                "meeting_type": meeting_type,
                "title": title or f"Meeting with {person}",
                "location": location,
                "description": description or f"Discussion & sync agenda for meeting with {person}",
                "suggested_slots": slots,
                "submit_endpoint": "/api/calendar/schedule-meeting"
            }
        }

    @classmethod
    def create_event_collector(
        cls,
        title: Optional[str] = None,
        target_date: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        duration: Optional[int] = None,
        category: str = "Work Event",
        location: Optional[str] = None,
        description: Optional[str] = None,
        attendees: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "InteractiveEventCollector",
            "props": {
                "title": title or "",
                "date": target_date or "",
                "start_time": start_time or "",
                "end_time": end_time or "",
                "duration": duration or "",
                "category": category,
                "location": location or "",
                "description": description or "",
                "attendees": attendees or [],
                "submit_endpoint": "/api/calendar/create-event"
            }
        }

    @classmethod
    def create_event_confirmation_card(
        cls,
        title: str,
        target_date: str = "tomorrow",
        start_time: str = "3:00 PM",
        end_time: str = "4:00 PM",
        duration: str = "1 hour",
        attendees: Optional[List[Dict[str, str]]] = None,
        location: str = "Google Meet Video Call",
        event_id: str = "evt-new-101"
    ) -> Dict[str, Any]:
        att_list = attendees or [{"name": "Rahul Sharma", "email": "rahul@company.com"}, {"name": "Priya Reddy", "email": "priya@company.com"}]
        return {
            "version": cls.VERSION,
            "component": "EventConfirmationCard",
            "props": {
                "event_id": event_id,
                "title": title,
                "date": target_date,
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "attendees": att_list,
                "location": location,
                "status": "ready_for_creation",
                "confirm_endpoint": "/api/calendar/create"
            }
        }

    @classmethod
    def create_hitl_approval_card(
        cls,
        action_id: str,
        action_type: str,
        title: str,
        description: str,
        payload: Dict[str, Any],
        agent_name: str = "Calendar Agent"
    ) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "ApprovalQueueCard",
            "props": {
                "action_id": action_id,
                "action_type": action_type,
                "title": title,
                "description": description,
                "payload": payload,
                "agent_name": agent_name,
                "status": "pending_approval",
                "approve_endpoint": f"/api/approval/{action_id}/approve",
                "edit_endpoint": f"/api/approval/{action_id}/edit",
                "reject_endpoint": f"/api/approval/{action_id}/reject"
            }
        }

    @classmethod
    def create_rsvp_badge(
        cls,
        event_id: str,
        title: str,
        date: str,
        start_time: str,
        attendees: List[str],
        rsvps: Dict[str, Any]
    ) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "RSVPActionBadge",
            "props": {
                "event_id": event_id,
                "title": title,
                "date": date,
                "start_time": start_time,
                "attendees": attendees,
                "rsvps": rsvps,
                "respond_endpoint": "/api/calendar/respond"
            }
        }

    @classmethod
    def create_data_table(
        cls,
        columns: List[str],
        rows: List[Dict[str, Any]],
        title: str = "Query Results"
    ) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "InteractiveDataTable",
            "props": {
                "title": title,
                "columns": columns,
                "rows": rows
            }
        }

    @classmethod
    def create_email_inbox(cls, emails: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "EmailInboxViewer",
            "props": {
                "title": f"Gmail Inbox ({len(emails)} Messages)",
                "emails": emails
            }
        }

    @classmethod
    def create_python_execution(cls, status: str, stdout: str, stderr: str) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "PythonExecutionCard",
            "props": {
                "status": status,
                "stdout": stdout,
                "stderr": stderr
            }
        }

    @classmethod
    def create_weather_card(cls, location: str, temperature: str, condition: str, wind: str, provider: str = "Weather API") -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "WeatherCard",
            "props": {
                "location": location,
                "temperature": temperature,
                "condition": condition,
                "wind": wind,
                "provider": provider
            }
        }

    @classmethod
    def create_github_repos(cls, owner: str, repos: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "GitHubReposCard",
            "props": {
                "owner": owner,
                "repos": repos
            }
        }

    @classmethod
    def create_document_reader(cls, title: str, path: str, ftype: str, pages: List[Dict[str, Any]], formulas: List[str], links: List[str], images: List[Dict[str, Any]], tables: List[Any]) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "DocumentReaderCard",
            "props": {
                "title": title,
                "path": path,
                "file_type": ftype,
                "total_pages": len(pages) or 1,
                "pages": pages,
                "formulas": formulas,
                "links": links,
                "images": images,
                "tables": tables
            }
        }

    @classmethod
    def create_directory_browser(cls, path: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "DirectoryBrowserCard",
            "props": {
                "path": path,
                "items": items
            }
        }

    @classmethod
    def create_search_results(cls, query: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "SearchResultsCard",
            "props": {
                "query": query,
                "results": results
            }
        }

    @classmethod
    def create_calendar_events_list(cls, events: List[Dict[str, Any]], days: int = 7) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "CalendarEventsListCard",
            "props": {
                "days": days,
                "events": events
            }
        }

    @classmethod
    def create_generic_card(cls, tool_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "version": cls.VERSION,
            "component": "GenericToolCard",
            "props": {
                "tool_name": tool_name,
                "data": data
            }
        }
