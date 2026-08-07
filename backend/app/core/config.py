import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from pydantic import BaseModel

import socket

def get_local_ip() -> str:
    """Returns machine's primary local network IP address (e.g. 192.168.x.x or 10.x.x.x)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def resolve_public_api_url() -> str:
    env_url = os.getenv("PUBLIC_API_URL", "").strip()
    if env_url and not any(loc in env_url for loc in ["127.0.0.1", "localhost"]):
        return env_url.rstrip("/")
    local_ip = get_local_ip()
    return f"http://{local_ip}:8000"

class Settings(BaseModel):
    PROJECT_NAME: str = "MCP-Powered AI Assistant"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    
    # LLM & External API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", os.getenv("OPENWEATHERMAP_API_KEY", ""))
    
    # Real Email / IMAP / SMTP Credentials
    EMAIL_USER: str = os.getenv("EMAIL_USER", os.getenv("GMAIL_ADDRESS", ""))
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", os.getenv("GMAIL_APP_PASSWORD", ""))
    IMAP_SERVER: str = os.getenv("IMAP_SERVER", "imap.gmail.com")
    IMAP_PORT: int = int(os.getenv("IMAP_PORT", "993"))
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    
    # Default active provider
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "auto")
    
    # Public API URL for Email invitation links & web endpoints
    @property
    def PUBLIC_API_URL(self) -> str:
        return resolve_public_api_url()

settings = Settings()
