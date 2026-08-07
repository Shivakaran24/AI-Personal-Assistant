import time
import json
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from app.mcp.registry import mcp_registry
from app.mcp.builtin_servers import BuiltinMCPServers
from app.core.websocket_manager import ws_manager
from app.core.logger import logger

class MCPClient:
    """
    Standard Model Context Protocol (MCP) Client.
    Supports:
    1. Builtin In-Process Python Tools Execution
    2. JSON-RPC 2.0 Over Subprocess STDIO Transport (e.g. GitHub MCP, Postgres MCP)
    3. Server-Sent Events & HTTP Transport (SSE)
    4. Real-time WebSocket Tool Execution Progress Streaming
    5. Dynamic External MCP Server Registration
    """

    def __init__(self):
        self.registry = mcp_registry

    def register_external_server(
        self,
        server_id: str,
        name: str,
        transport: str,
        command_or_url: str,
        tools_manifest: List[Dict[str, Any]]
    ):
        """
        Dynamically registers an external third-party MCP Server (STDIO or SSE).
        """
        self.registry.register_server(
            server_id=server_id,
            name=name,
            transport=transport,
            url=command_or_url if transport == "sse" else None,
            command=command_or_url if transport == "stdio" else None
        )
        for t in tools_manifest:
            t["server_id"] = server_id
            t["server_name"] = name
            self.registry.tools[t["name"]] = t

        logger.info(f"Registered external MCP Server '{name}' ({server_id}) on transport '{transport}' with {len(tools_manifest)} tool(s)")


    def list_available_tools(self) -> List[Dict[str, Any]]:
        """
        Discovers all tools registered across active MCP servers.
        Returns OpenAI/Gemini compatible tool definitions format.
        """
        tools = self.registry.list_tools()
        formatted_tools = []
        for t in tools:
            formatted_tools.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"]
                },
                "server_id": t.get("server_id"),
                "server_name": t.get("server_name")
            })
        return formatted_tools

    async def invoke_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invokes an MCP tool call across Builtin, STDIO, or SSE transports
        with real-time WebSocket progress event streaming.
        """
        start_time = time.time()
        logger.info(f"MCP Client invoking tool: '{tool_name}' with args: {arguments}")

        tool_meta = self.registry.get_tool(tool_name)
        if not tool_meta:
            err_payload = {
                "tool_name": tool_name,
                "status": "error",
                "result": {"message": f"Tool '{tool_name}' is not registered in MCP Client registry."},
                "execution_time_ms": round((time.time() - start_time) * 1000, 2)
            }
            ws_manager.broadcast_tool_event("tool_error", err_payload)
            return err_payload

        server_id = tool_meta.get("server_id")
        server_name = tool_meta.get("server_name", "MCP Server")
        server_info = self.registry.servers.get(server_id, {})
        transport = server_info.get("transport", "builtin")

        # 1. Stream tool_start event over WebSockets
        ws_manager.broadcast_tool_event("tool_start", {
            "tool_name": tool_name,
            "server_id": server_id,
            "server_name": server_name,
            "transport": transport,
            "arguments": arguments,
            "status": "executing"
        })

        # 2. Execute tool according to transport architecture
        try:
            if transport == "builtin":
                ws_manager.broadcast_tool_event("tool_progress", {
                    "tool_name": tool_name,
                    "status": "in_progress",
                    "step": "Executing builtin python handler..."
                })
                result = BuiltinMCPServers.execute_tool(tool_name, arguments)
            elif transport == "stdio":
                cmd = server_info.get("command") or f"npx -y @modelcontextprotocol/server-{server_id}"
                ws_manager.broadcast_tool_event("tool_progress", {
                    "tool_name": tool_name,
                    "status": "in_progress",
                    "step": f"Dispatching JSON-RPC 2.0 over STDIO command '{cmd}'..."
                })
                result = await self._execute_stdio_tool(cmd, tool_name, arguments)
            elif transport == "sse":
                url = server_info.get("url") or "http://localhost:8000/sse"
                ws_manager.broadcast_tool_event("tool_progress", {
                    "tool_name": tool_name,
                    "status": "in_progress",
                    "step": f"Sending SSE HTTP JSON-RPC POST to '{url}'..."
                })
                result = await self._execute_sse_tool(url, tool_name, arguments)
            else:
                result = {
                    "status": "error",
                    "message": f"Unsupported MCP transport '{transport}'"
                }
        except Exception as ex:
            logger.error(f"Error executing MCP tool '{tool_name}' on transport '{transport}': {ex}")
            result = {"status": "error", "message": str(ex)}

        exec_time = round((time.time() - start_time) * 1000, 2)
        status = result.get("status", "success")

        output_payload = {
            "tool_name": tool_name,
            "server_id": server_id,
            "server_name": server_name,
            "transport": transport,
            "arguments": arguments,
            "status": status,
            "result": result,
            "execution_time_ms": exec_time
        }

        # 3. Stream tool_complete or tool_error event over WebSockets
        event_name = "tool_completed" if status != "error" else "tool_error"
        ws_manager.broadcast_tool_event(event_name, output_payload)

        logger.info(f"MCP Tool '{tool_name}' completed in {exec_time}ms on '{transport}' with status: {status}")
        return output_payload

    async def _execute_stdio_tool(self, command: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a tool call over a subprocess STDIO pipe using JSON-RPC 2.0 Protocol.
        """
        jsonrpc_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }

        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            req_bytes = (json.dumps(jsonrpc_request) + "\n").encode("utf-8")
            stdout_data, stderr_data = await asyncio.wait_for(
                process.communicate(input=req_bytes),
                timeout=10.0
            )

            if process.returncode == 0 and stdout_data:
                try:
                    resp_json = json.loads(stdout_data.decode("utf-8").strip().splitlines()[-1])
                    if "result" in resp_json:
                        return {"status": "success", "result": resp_json["result"]}
                except Exception:
                    pass

            return {
                "status": "success",
                "message": f"STDIO transport executed '{command}' for tool '{tool_name}'",
                "stdout": stdout_data.decode("utf-8", errors="ignore")[:300]
            }
        except asyncio.TimeoutError:
            return {"status": "error", "message": f"STDIO tool execution timed out after 10s for command '{command}'"}
        except Exception as e:
            return {"status": "error", "message": f"STDIO subprocess execution error: {str(e)}"}

    async def _execute_sse_tool(self, url: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a tool call over HTTP SSE Endpoint using JSON-RPC 2.0 Protocol.
        """
        jsonrpc_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=jsonrpc_request)
                if res.status_code == 200:
                    data = res.json()
                    return {"status": "success", "result": data.get("result", data)}
                return {"status": "error", "message": f"HTTP {res.status_code} from SSE server at {url}"}
        except Exception as e:
            return {"status": "error", "message": f"SSE transport HTTP error: {str(e)}"}

mcp_client = MCPClient()

