from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body, Query
from fastapi.responses import HTMLResponse
from app.mcp.builtin_servers import CalendarStoreManager, BuiltinMCPServers

router = APIRouter(prefix="/calendar", tags=["Calendar Manager"])

@router.get("/dashboard")
def get_calendar_dashboard():
    """
    Returns calendar telemetry metrics including accepted count, rejected count, pending count, and event list.
    """
    return CalendarStoreManager.get_dashboard_stats()

@router.delete("/clear")
@router.post("/clear")
def clear_calendar_history():
    """
    Clears all calendar event history and resets telemetry metrics.
    """
    return CalendarStoreManager.clear_history()

@router.get("/events")
def list_calendar_events(days: int = 7):
    """
    Lists calendar events with RSVP breakdown.
    """
    return {
        "status": "success",
        "days": days,
        "metrics": CalendarStoreManager.get_dashboard_stats()["dashboard_metrics"],
        "events": CalendarStoreManager.list_events(days=days)
    }

@router.get("/respond", response_class=HTMLResponse)
def respond_invitation_get(
    event_id: str = Query(...),
    action: str = Query("accept"),
    attendee: str = Query("user@company.com")
):
    """
    GET endpoint for direct clickable HTML email links.
    Executes RSVP response, dispatches immediate notification, schedules 30-min prior reminder, and displays confirmation web page.
    """
    result = BuiltinMCPServers.execute_tool("calendar_respond_invitation", {
        "event_id": event_id,
        "attendee": attendee,
        "action": action
    })

    title = result.get("title", "Calendar Event")
    date = result.get("date", "")
    time = result.get("start_time", "")
    act = result.get("action", action).upper()
    is_accepted = act == "ACCEPTED"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <title>Calendar RSVP Response</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0d14;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        }}
        .card {{
          background: rgba(18, 24, 36, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 460px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.2);
        }}
        .badge {{
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: 24px;
        }}
        .badge.accepted {{
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }}
        .badge.rejected {{
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }}
        h2 {{ margin: 0 0 10px 0; font-size: 1.5rem; color: #ffffff; }}
        p {{ color: #94a3b8; font-size: 0.92rem; line-height: 1.5; margin: 6px 0; }}
        .info-box {{
          background: rgba(10, 13, 20, 0.6);
          border-radius: 14px;
          padding: 16px;
          margin: 20px 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
        }}
        .info-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.86rem; }}
        .info-label {{ color: #64748b; }}
        .info-val {{ color: #a5b4fc; font-weight: 600; }}
        .close-note {{ font-size: 0.78rem; color: #64748b; margin-top: 24px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge {'accepted' if is_accepted else 'rejected'}">
          {'✓ INVITATION ACCEPTED' if is_accepted else '✗ INVITATION REJECTED'}
        </div>
        <h2>{title}</h2>
        <p>Your response has been registered successfully in Google Workspace Calendar.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Event:</span>
            <span class="info-val">{title}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date & Time:</span>
            <span class="info-val">{date} at {time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Attendee:</span>
            <span class="info-val">{attendee}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-val">{'ACCEPTED' if is_accepted else 'REJECTED'}</span>
          </div>
        </div>

        <p style="color: {'#34d399' if is_accepted else '#fca5a5'}; font-size: 0.85rem;">
          {'⚡ Immediate Notification sent. ⏰ 30-minute prior reminder notification scheduled.' if is_accepted else 'Response recorded and organizer notified.'}
        </p>

        <div class="close-note">You can safely close this window.</div>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@router.post("/respond")
async def respond_to_invitation(payload: Dict[str, Any] = Body(...)):
    """
    POST endpoint for frontend UI components.
    """
    event_id = payload.get("event_id")
    action = payload.get("action", "accept")
    attendee = payload.get("attendee", "user@company.com")

    if not event_id or not action:
        raise HTTPException(status_code=400, detail="'event_id' and 'action' are required.")

    result = BuiltinMCPServers.execute_tool("calendar_respond_invitation", {
        "event_id": event_id,
        "attendee": attendee,
        "action": action
    })
    return result

@router.get("/availability")
def check_calendar_availability(
    date: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    duration_minutes: int = Query(30)
):
    """
    Checks free/busy schedule availability, open slots, and detects time conflicts.
    """
    return CalendarStoreManager.check_availability(
        target_date=date,
        start_time=start_time,
        duration_minutes=duration_minutes
    )

@router.post("/create-event")
def create_event_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Dedicated endpoint for Calendar Event creation.
    Queues into HITL approval as action_type='create_event'.
    """
    skip_hitl = payload.get("skip_hitl", False)
    return BuiltinMCPServers.execute_tool("calendar_create_event", payload, skip_hitl=skip_hitl)

@router.post("/schedule-meeting")
def schedule_meeting_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Dedicated endpoint for Scheduling Meetings with contacts.
    Queues into HITL approval as action_type='schedule_meeting'.
    """
    skip_hitl = payload.get("skip_hitl", False)
    return BuiltinMCPServers.execute_tool("calendar_schedule_meeting", payload, skip_hitl=skip_hitl)

@router.post("/create")
def create_calendar_event(payload: Dict[str, Any] = Body(...)):
    """
    Creates/schedules an event or meeting based on payload intent.
    """
    skip_hitl = payload.get("skip_hitl", False)
    if "category" in payload or "event_title" in payload:
        return BuiltinMCPServers.execute_tool("calendar_create_event", payload, skip_hitl=skip_hitl)
    return BuiltinMCPServers.execute_tool("calendar_schedule_meeting", payload, skip_hitl=skip_hitl)

@router.post("/manage")
def manage_calendar_event(payload: Dict[str, Any] = Body(...)):
    """
    Updates, reschedules, or cancels/deletes a calendar event.
    Triggers Human-in-the-Loop review for cancellations/reschedules unless skip_hitl is true.
    """
    event_id = payload.get("event_id")
    action = payload.get("action", "update")
    skip_hitl = payload.get("skip_hitl", False)

    if not event_id or not action:
        raise HTTPException(status_code=400, detail="'event_id' and 'action' are required.")

    return BuiltinMCPServers.execute_tool("calendar_manage_event", payload, skip_hitl=skip_hitl)

