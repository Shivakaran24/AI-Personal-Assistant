import json
import asyncio
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.core.logger import logger

class ConnectionManager:
    """
    Manages active WebSocket client connections for real-time push notifications.
    Supports targeted event broadcasting to all connected dashboard clients.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Error sending WebSocket message to client: {e}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts an event payload to all connected clients asynchronously.
        """
        if not self.active_connections:
            return

        payload = {
            "event": event_type,
            "data": data,
            "timestamp": asyncio.get_event_loop().time()
        }

        logger.info(f"Broadcasting WebSocket event '{event_type}' to {len(self.active_connections)} client(s)")
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception as e:
                logger.warning(f"Failed to send broadcast to connection: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

    def broadcast_sync(self, event_type: str, data: Dict[str, Any]):
        """
        Synchronous wrapper for broadcasting events from sync contexts.
        """
        try:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                loop.create_task(self.broadcast(event_type, data))
            else:
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                new_loop.run_until_complete(self.broadcast(event_type, data))
                new_loop.close()
        except Exception as e:
            logger.warning(f"Failed to broadcast sync WebSocket event '{event_type}': {e}")

    def broadcast_tool_event(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasting helper specifically tailored for real-time tool execution progress logs.
        """
        self.broadcast_sync(event_type, data)

ws_manager = ConnectionManager()

