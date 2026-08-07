from typing import Optional, List
from app.llm.base import BaseLLMProvider
from app.llm.gemini import GeminiProvider
from app.llm.openai_provider import OpenAIProvider, OllamaProvider
from app.llm.fallback import BuiltinFallbackLLM
from app.core.config import settings
from app.core.logger import logger

class LLMRouter:
    """
    Selects and instantiates the appropriate LLM Provider dynamically.
    Falls back gracefully if an external API key is missing or fails.
    """

    @staticmethod
    def get_providers_chain(provider_name: Optional[str] = None) -> List[BaseLLMProvider]:
        target = (provider_name or settings.DEFAULT_LLM_PROVIDER).lower()
        providers: List[BaseLLMProvider] = []

        if target == "gemini":
            if settings.GEMINI_API_KEY: providers.append(GeminiProvider())
            if settings.OPENAI_API_KEY: providers.append(OpenAIProvider())
        elif target == "openai":
            if settings.OPENAI_API_KEY: providers.append(OpenAIProvider())
            if settings.GEMINI_API_KEY: providers.append(GeminiProvider())
        elif target == "ollama":
            providers.append(OllamaProvider())
        else:
            # "auto" - try Gemini then OpenAI then fallback
            if settings.GEMINI_API_KEY: providers.append(GeminiProvider())
            if settings.OPENAI_API_KEY: providers.append(OpenAIProvider())

        # Ultimate fallback engine
        providers.append(BuiltinFallbackLLM())
        return providers

    @staticmethod
    def get_provider(provider_name: Optional[str] = None) -> BaseLLMProvider:
        chain = LLMRouter.get_providers_chain(provider_name)
        return chain[0]

llm_router = LLMRouter()
