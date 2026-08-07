from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseLLMProvider(ABC):
    """
    Abstract interface for LLM Providers (Gemini, OpenAI, Ollama, Fallback).
    """

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a completion response given conversation messages and MCP tools.
        Returns dict with:
          - 'content': text response
          - 'tool_calls': list of tool calls to execute if requested by LLM
          - 'model': model identifier used
        """
        pass
