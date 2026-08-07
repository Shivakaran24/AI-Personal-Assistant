from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import ws_manager
from app.core.logger import logger

router = APIRouter(tags=["WebSocket Engine"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for instant push notifications (< 1ms latency).
    Listens for client ping signals and keeps connection alive.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial connection handshake
        await websocket.send_json({
            "event": "connected",
            "data": {"status": "online", "message": "Real-time WebSocket connection established."}
        })

        while True:
            # Receive client ping or messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
