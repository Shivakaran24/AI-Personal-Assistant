import json
import httpx
from typing import List, Dict, Any, Optional
from app.llm.base import BaseLLMProvider
from app.core.config import settings
from app.core.logger import logger

class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI LLM Provider supporting GPT-4o / GPT-3.5 with function/tool calling.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": "gpt-4o-mini",
            "messages": formatted_messages,
            "temperature": 0.7
        }

        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"OpenAI API error: {res.status_code} - {res.text}")

            data = res.json()
            choice = data["choices"][0]["message"]
            content = choice.get("content") or ""
            
            tool_calls = []
            if choice.get("tool_calls"):
                for tc in choice["tool_calls"]:
                    fn = tc["function"]
                    try:
                        args = json.loads(fn.get("arguments", "{}"))
                    except:
                        args = {}
                    tool_calls.append({
                        "id": tc.get("id"),
                        "name": fn.get("name"),
                        "arguments": args
                    })

            return {
                "content": content,
                "tool_calls": tool_calls,
                "model": "gpt-4o-mini"
            }

class OllamaProvider(BaseLLMProvider):
    """
    Local Ollama LLM Provider (Llama 3, Qwen 2.5, DeepSeek R1).
    """

    def __init__(self, base_url: Optional[str] = None, model: str = "llama3"):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/api/chat"
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Ollama error: {res.status_code}")
                data = res.json()
                content = data.get("message", {}).get("content", "")
                return {
                    "content": content,
                    "tool_calls": [],
                    "model": f"ollama-{self.model}"
                }
            except Exception as e:
                raise RuntimeError(f"Ollama connection error to {self.base_url}: {str(e)}")
