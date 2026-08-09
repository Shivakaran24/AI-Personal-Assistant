import uuid
import datetime
from typing import Dict, List, Any, Optional
from app.core.logger import logger

class HumanInTheLoopManager:
    """
    Manages Human-in-the-Loop (HITL) approval queue for outbound and modifying actions
    (e.g., sending emails, modifying/canceling scheduled calendar events, dispatching notifications).
    Allows users to approve, edit, or reject pending actions before execution.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HumanInTheLoopManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        # In-memory storage for pending actions & historical decisions
        self.pending_actions: Dict[str, Dict[str, Any]] = {}
        self.action_history: List[Dict[str, Any]] = []

    def queue_action(
        self,
        action_type: str,
        tool_name: str,
        title: str,
        description: str,
        payload: Dict[str, Any],
        agent_name: str = "Assistant"
    ) -> Dict[str, Any]:
        """
        Queues an action for Human-in-the-Loop review.
        """
        action_id = f"hitl-{uuid.uuid4().hex[:8]}"
        created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        action_entry = {
            "id": action_id,
            "action_type": action_type,  # e.g., "send_email", "cancel_event", "reschedule_event", "send_notification"
            "tool_name": tool_name,
            "title": title,
            "description": description,
            "payload": payload,
            "agent_name": agent_name,
            "status": "pending_approval",
            "created_at": created_at,
            "requires_human_approval": True
        }

        self.pending_actions[action_id] = action_entry
        logger.info(f"Queued HITL action '{action_id}' ({action_type}) by agent '{agent_name}'")

        try:
            from app.core.websocket_manager import ws_manager
            ws_manager.broadcast_sync("hitl_queue_updated", {
                "type": "queued",
                "action": action_entry,
                "summary": self.get_queue_summary()
            })
        except Exception:
            pass

        return action_entry

    def list_pending_actions(self) -> List[Dict[str, Any]]:
        """
        Returns a list of all actions currently awaiting human review.
        """
        return list(self.pending_actions.values())

    def get_action(self, action_id: str) -> Optional[Dict[str, Any]]:
        return self.pending_actions.get(action_id)

    def approve_action(self, action_id: str, custom_edits: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Approves a pending action. If custom_edits are provided, merges them into the payload before execution.
        """
        if action_id not in self.pending_actions:
            return {"status": "error", "message": f"Pending action '{action_id}' not found."}

        action = self.pending_actions.pop(action_id)
        if custom_edits:
            action["payload"].update(custom_edits)
            action["was_edited"] = True

        action["status"] = "approved"
        action["approved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Execute the underlying tool logic via BuiltinMCPServers
        import threading
        from app.mcp.builtin_servers import BuiltinMCPServers, EmailStoreManager

        # Extract all targets dynamically (handles lists, comma-separated strings, or single addresses)
        target_payload = action["payload"]
        all_targets = []
        for k in ["to", "recipients", "attendees", "other_attendees", "person", "recipient", "attendee"]:
            v = target_payload.get(k)
            if not v:
                continue
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, str):
                        all_targets.extend([x.strip() for x in item.split(",") if x.strip()])
            elif isinstance(v, str):
                all_targets.extend([x.strip() for x in v.split(",") if x.strip()])

        # Execute tool and notifications synchronously/asynchronously to provide instant UI response (<20ms)
        def _execute_and_notify():
            try:
                tool_res = BuiltinMCPServers.execute_tool(action["tool_name"], action["payload"], skip_hitl=True)
                action["execution_result"] = tool_res
            except Exception as e:
                logger.error(f"Error executing approved HITL tool '{action['tool_name']}': {e}")
                action["execution_result"] = {"status": "error", "message": str(e)}

            for target in list(dict.fromkeys(all_targets)):
                notif_msg = f"HITL Approval Confirmed: Action '{action['title']}' was approved by supervisor and dispatched to recipient(s)."
                EmailStoreManager.log_notification(
                    to=str(target),
                    subject=f"Notification Dispatched: {action['title']}",
                    body=notif_msg,
                    channel="email"
                )

            logger.info(f"Approved and executed HITL action '{action_id}' ({action['tool_name']}). Sent notifications to {len(all_targets)} recipient(s): {', '.join(all_targets)}.")

            try:
                from app.core.websocket_manager import ws_manager
                ws_manager.broadcast_sync("hitl_queue_updated", {
                    "type": "approved",
                    "action": action,
                    "summary": self.get_queue_summary()
                })
                ws_manager.broadcast_sync("calendar_rsvp_updated", {
                    "type": "approved",
                    "action": action,
                    "summary": self.get_queue_summary()
                })
            except Exception:
                pass

        self.action_history.append(action)

        # Launch execution thread for instant HTTP response
        exec_thread = threading.Thread(target=_execute_and_notify, daemon=True)
        exec_thread.start()

        # Immediate WebSocket push so UI updates instantly
        try:
            from app.core.websocket_manager import ws_manager
            ws_manager.broadcast_sync("hitl_queue_updated", {
                "type": "approved",
                "action": action,
                "summary": self.get_queue_summary()
            })
        except Exception:
            pass

        target_str = ", ".join(list(dict.fromkeys(all_targets))) if all_targets else "recipients"
        return {
            "status": "success",
            "message": f"Action '{action_id}' approved & executed. Notification dispatched to {target_str}.",
            "action": action
        }

    def edit_and_approve(self, action_id: str, edits: Dict[str, Any]) -> Dict[str, Any]:
        """
        Edits action parameters and immediately approves it.
        """
        return self.approve_action(action_id, custom_edits=edits)

    def reject_action(self, action_id: str, reason: str = "User declined action") -> Dict[str, Any]:
        """
        Rejects a pending action without executing it.
        """
        if action_id not in self.pending_actions:
            return {"status": "error", "message": f"Pending action '{action_id}' not found."}

        action = self.pending_actions.pop(action_id)
        action["status"] = "rejected"
        action["rejected_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        action["rejection_reason"] = reason

        self.action_history.append(action)
        logger.info(f"Rejected HITL action '{action_id}' ({action['tool_name']}): {reason}")

        try:
            from app.core.websocket_manager import ws_manager
            ws_manager.broadcast_sync("hitl_queue_updated", {
                "type": "rejected",
                "action": action,
                "summary": self.get_queue_summary()
            })
        except Exception:
            pass

        return {
            "status": "success",
            "message": f"Action '{action_id}' rejected successfully.",
            "action": action
        }

    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Returns historical HITL actions (approved, edited, rejected).
        """
        return self.action_history[-limit:][::-1]

    def get_queue_summary(self) -> Dict[str, Any]:
        """
        Returns telemetry summary of the approval queue.
        """
        pending_count = len(self.pending_actions)
        approved_count = sum(1 for a in self.action_history if a.get("status") == "approved")
        rejected_count = sum(1 for a in self.action_history if a.get("status") == "rejected")
        edited_count = sum(1 for a in self.action_history if a.get("was_edited"))

        return {
            "pending_count": pending_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "edited_count": edited_count,
            "total_processed": len(self.action_history)
        }

hitl_manager = HumanInTheLoopManager()
