import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(32), nullable=False) # 'user', 'assistant', 'system', 'tool'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    token_count = Column(Integer, default=0)
    tool_calls = Column(JSON, nullable=True) # list of tool executions
    model_used = Column(String(64), nullable=True)

    conversation = relationship("Conversation", back_populates="messages")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(64), nullable=False)
    size_bytes = Column(Integer, default=0)
    embedding_status = Column(String(32), default="pending") # pending, ready, failed
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="documents")

class MCPServerConfig(Base):
    __tablename__ = "mcp_servers"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    transport = Column(String(32), nullable=False) # 'builtin', 'stdio', 'sse'
    command = Column(String(512), nullable=True)
    args = Column(JSON, nullable=True)
    url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String(32), default="connected")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
