import time
from typing import Dict, List, Any, Optional
from app.mcp.builtin_servers import BuiltinMCPServers
from app.core.logger import logger

class MCPRegistry:
    """
    Registry for managing MCP servers, tool discovery, and tool metadata lookup.
    Supports dynamic registration of external stdio / SSE MCP servers.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MCPRegistry, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.servers: Dict[str, Dict[str, Any]] = {}
        self.tools: Dict[str, Dict[str, Any]] = {}
        self._initialize_builtin_servers()

    def _initialize_builtin_servers(self):
        # Register standard built-in MCP servers
        builtin_servers_def = [
            {"id": "supervisor_server", "name": "Multi-Agent Supervisor Server", "transport": "builtin", "status": "connected"},
            {"id": "calendar_agent_server", "name": "Calendar Agent Server", "transport": "builtin", "status": "connected"},
            {"id": "email_agent_server", "name": "Email Agent Server", "transport": "builtin", "status": "connected"},
            {"id": "filesystem_server", "name": "Filesystem Tool Server", "transport": "builtin", "status": "connected"},
            {"id": "workspace_server", "name": "Google Workspace Server", "transport": "builtin", "status": "connected"},
            {"id": "github_server", "name": "GitHub Integration Server", "transport": "builtin", "status": "connected"},
            {"id": "code_interpreter_server", "name": "Python Code Interpreter Server", "transport": "builtin", "status": "connected"},
            {"id": "database_server", "name": "Database Query Server", "transport": "builtin", "status": "connected"},
            {"id": "web_tools_server", "name": "Web & Weather Server", "transport": "builtin", "status": "connected"},
        ]

        for s in builtin_servers_def:
            self.servers[s["id"]] = s

        # Discover & index built-in tools
        raw_tools = BuiltinMCPServers.get_tool_definitions()
        for t in raw_tools:
            self.tools[t["name"]] = t
            
        logger.info(f"Initialized MCP Registry with {len(self.servers)} servers and {len(self.tools)} tools.")

    def list_servers(self) -> List[Dict[str, Any]]:
        return list(self.servers.values())

    def list_tools(self) -> List[Dict[str, Any]]:
        return list(self.tools.values())

    def get_tool(self, tool_name: str) -> Optional[Dict[str, Any]]:
        return self.tools.get(tool_name)

    def register_server(self, server_id: str, name: str, transport: str, command: Optional[str] = None, url: Optional[str] = None) -> Dict[str, Any]:
        server_entry = {
            "id": server_id,
            "name": name,
            "transport": transport,
            "command": command,
            "url": url,
            "status": "connected",
            "is_active": True
        }
        self.servers[server_id] = server_entry
        logger.info(f"Registered new external MCP Server: {name} [{transport}]")
        return server_entry

    def remove_server(self, server_id: str):
        if server_id in self.servers:
            del self.servers[server_id]
            # Remove associated tools
            to_del = [name for name, t in self.tools.items() if t.get("server_id") == server_id]
            for name in to_del:
                del self.tools[name]
            logger.info(f"Removed MCP Server: {server_id}")

mcp_registry = MCPRegistry()
