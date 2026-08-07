import uuid
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Body, Depends
from sqlalchemy.orm import Session
from app.mcp.registry import mcp_registry
from app.core.database import get_db
from app.database.models import MCPServerConfig

router = APIRouter(prefix="/mcp/servers", tags=["MCP Servers"])

@router.get("")
def list_servers():
    return {
        "status": "success",
        "servers": mcp_registry.list_servers()
    }

@router.post("")
def register_external_server(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    name = payload.get("name")
    transport = payload.get("transport", "stdio")
    command = payload.get("command")
    url = payload.get("url")

    if not name:
        raise HTTPException(status_code=400, detail="Server name is required.")

    server_id = f"srv-{uuid.uuid4().hex[:8]}"
    srv_entry = mcp_registry.register_server(
        server_id=server_id,
        name=name,
        transport=transport,
        command=command,
        url=url
    )

    db_server = MCPServerConfig(
        id=server_id,
        name=name,
        transport=transport,
        command=command,
        url=url,
        status="connected"
    )
    db.add(db_server)
    db.commit()

    return {"status": "success", "server": srv_entry}

@router.delete("/{server_id}")
def remove_server(server_id: str, db: Session = Depends(get_db)):
    mcp_registry.remove_server(server_id)
    db_server = db.query(MCPServerConfig).filter(MCPServerConfig.id == server_id).first()
    if db_server:
        db.delete(db_server)
        db.commit()
    return {"status": "success", "message": f"Server '{server_id}' removed."}
