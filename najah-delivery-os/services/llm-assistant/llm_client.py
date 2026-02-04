"""OpenRouter LLM client implementation."""
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class OpenRouterClient:
    """Client for interacting with OpenRouter API."""
    
    def __init__(self, api_key: str, model: str = "openai/gpt-4o-mini"):
        """
        Initialize OpenRouter client.
        
        Args:
            api_key: OpenRouter API key
            model: Model identifier (default: openai/gpt-4o-mini)
        """
        self.api_key = api_key
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 500,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate text completion using OpenRouter API.
        
        Args:
            prompt: User prompt
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate
            system_prompt: Optional system prompt
            
        Returns:
            Generated text response
            
        Raises:
            httpx.HTTPError: On API request failure
            ValueError: On invalid response format
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                
                data = response.json()
                
                if "choices" not in data or not data["choices"]:
                    raise ValueError("Invalid response format from OpenRouter API")
                
                return data["choices"][0]["message"]["content"].strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.error("Rate limit exceeded for OpenRouter API")
                raise ValueError("Rate limit exceeded. Please try again later.") from e
            elif e.response.status_code == 401:
                logger.error("Invalid API key for OpenRouter")
                raise ValueError("Invalid API key") from e
            else:
                logger.error(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
                raise ValueError(f"API request failed: {e.response.status_code}") from e
                
        except httpx.RequestError as e:
            logger.error(f"Network error calling OpenRouter API: {str(e)}")
            raise ValueError(f"Network error: {str(e)}") from e
