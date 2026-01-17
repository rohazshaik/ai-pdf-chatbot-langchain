"""
Configuration file for the AI PDF Chatbot backend.
This centralizes all settings to make the code cleaner and easier to modify.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
FAISS_INDEX_DIR = BASE_DIR / "faiss_index"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
FAISS_INDEX_DIR.mkdir(exist_ok=True)

# API Keys - HuggingFace disabled, using Ollama only
HUGGINGFACE_API_TOKEN = ""  # Disabled - using Ollama only

# Ollama Configuration - Using qwen2.5:0.5b (smaller model, fits in available memory)
OLLAMA_MODEL = "qwen2.5:0.5b"  # 397MB - fits in 3.1GB available RAM
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Embedding Model Configuration
# Using a lightweight model that works well for semantic search
# all-MiniLM-L6-v2 is small (~80MB) but gives good results for RAG
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Text Chunking Parameters
# Why chunking? LLMs have token limits, and smaller chunks give more precise retrieval
# chunk_size: How many characters per chunk (1000 is a good balance)
# chunk_overlap: Overlap between chunks to avoid losing context at boundaries
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Retrieval Configuration
# How many relevant chunks to retrieve for answering questions
TOP_K_RETRIEVAL = 12

# Hugging Face Inference API Configuration
# Using a model that works well with free tier and is good at following prompts
# Mistral-7B-Instruct is reliable and fast on HF Inference API
HF_MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.2"
HF_MAX_TOKENS = 512
HF_TEMPERATURE = 0.7  # Lower = more focused, Higher = more creative

# FAISS Index Configuration
FAISS_INDEX_PATH = FAISS_INDEX_DIR / "index.faiss"
FAISS_METADATA_PATH = FAISS_INDEX_DIR / "metadata.pkl"
