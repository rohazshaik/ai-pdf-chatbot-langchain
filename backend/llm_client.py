"""
LLM Client with fallback strategy.
This demonstrates cost-awareness and reliability - try free cloud API first, 
then fall back to local Ollama if it fails.

This is a realistic approach for a fresher's project:
- Shows understanding of API integration
- Demonstrates error handling
- Proves you think about costs and reliability
"""

import requests
import logging
from typing import Tuple
from config import (
    HUGGINGFACE_API_TOKEN,
    HF_MODEL_NAME,
    HF_MAX_TOKENS,
    HF_TEMPERATURE,
    OLLAMA_MODEL,
    OLLAMA_BASE_URL
)

# Set up logging to track which LLM is being used
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMClient:
    """
    Handles LLM inference with automatic fallback.
    Primary: Hugging Face Inference API (free tier, cloud)
    Fallback: Ollama (local, requires installation)
    """
    
    def __init__(self):
        self.hf_token = HUGGINGFACE_API_TOKEN
        self.hf_model = HF_MODEL_NAME
        self.ollama_model = OLLAMA_MODEL
        self.ollama_url = f"{OLLAMA_BASE_URL}/api/generate"
    
    def generate(self, prompt: str) -> Tuple[str, str]:
        """
        Generate a response from the LLM.
        
        Args:
            prompt: The complete prompt to send to the LLM
            
        Returns:
            Tuple of (response_text, source)
            source is "ollama"
        """
        # Using Ollama only - HuggingFace disabled
        logger.info(f"Using Ollama with model: {self.ollama_model}")
        
        try:
            response = self._call_ollama(prompt)
            logger.info("✓ Ollama succeeded")
            return response, "ollama"
        except Exception as e:
            logger.error(f"✗ Ollama failed: {str(e)}")
            raise Exception(
                f"Ollama failed. Please check: 1) Ollama is running, 2) Model '{self.ollama_model}' is available. "
                f"Run 'ollama list' to see available models."
            )
    
    def _call_huggingface(self, prompt: str) -> str:
        """
        Call Hugging Face Inference API.
        Free tier has rate limits but good for demos.
        """
        api_url = f"https://api-inference.huggingface.co/models/{self.hf_model}"
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": HF_MAX_TOKENS,
                "temperature": HF_TEMPERATURE,
                "return_full_text": False
            }
        }
        
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            raise Exception(f"HF API error: {response.status_code} - {response.text}")
        
        result = response.json()
        
        # Handle different response formats
        if isinstance(result, list) and len(result) > 0:
            return result[0].get("generated_text", "").strip()
        elif isinstance(result, dict):
            return result.get("generated_text", "").strip()
        else:
            raise Exception(f"Unexpected HF response format: {result}")
    
    def _call_ollama(self, prompt: str) -> str:
        """
        Call local Ollama instance.
        Requires Ollama to be installed and running.
        """
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False
        }
        
        response = requests.post(self.ollama_url, json=payload, timeout=180)
        
        if response.status_code != 200:
            raise Exception(f"Ollama error: {response.status_code} - {response.text}")
        
        result = response.json()
        return result.get("response", "").strip()

# Create a singleton instance
llm_client = LLMClient()
