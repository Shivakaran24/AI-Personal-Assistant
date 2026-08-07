import os
import json
import httpx
from typing import List, Dict, Any, Optional
from app.llm.base import BaseLLMProvider
from app.core.config import settings
from app.core.logger import logger

class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM Provider integration via Google GenAI REST / API key.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-2.0-flash-lite"]

        contents = []
        for m in messages:
            role = "user" if m.get("role") in ["user", "system"] else "model"
            contents.append({
                "role": role,
                "parts": [{"text": m.get("content", "")}]
            })

        payload = {"contents": contents}

        async with httpx.AsyncClient(timeout=30.0) as client:
            last_err = None
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    try:
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        return {
                            "content": text,
                            "tool_calls": [],
                            "model": model_name
                        }
                    except (KeyError, IndexError):
                        return {
                            "content": "Received empty response from Gemini API.",
                            "tool_calls": [],
                            "model": model_name
                        }
                else:
                    last_err = f"Gemini API Error ({model_name}): {res.status_code} - {res.text}"
                    logger.warning(last_err)

            raise RuntimeError(last_err or "Gemini API returned error for all model endpoints.")
