from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class MessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    content: str
    model: Optional[str] = "auto"
    mcp_enabled: Optional[bool] = True

class ToolCallInfo(BaseModel):
    id: str
    server_name: str
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Any] = None
    status: str = "success"
    execution_time_ms: Optional[float] = None

class MessageResponse(BaseModel):
    id: int
    conversation_id: str
    role: str
    content: str
    timestamp: datetime
    tool_calls: Optional[List[Dict[str, Any]]] = None
    model_used: Optional[str] = None

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

class MCPServerSchema(BaseModel):
    id: str
    name: str
    transport: str # 'builtin', 'stdio', 'sse'
    command: Optional[str] = None
    args: Optional[List[str]] = None
    url: Optional[str] = None
    is_active: bool = True
    status: str = "connected"

class MCPToolSchema(BaseModel):
    name: str
    description: str
    server_id: str
    server_name: str
    parameters: Dict[str, Any]

class DocumentSchema(BaseModel):
    id: str
    filename: str
    file_type: str
    size_bytes: int
    embedding_status: str
    chunk_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class SettingsUpdateSchema(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None
    default_llm_provider: Optional[str] = None
