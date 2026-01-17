"""
Pydantic models for request/response validation and type safety.
These models ensure that data coming in and going out of our API is properly structured.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class UploadResponse(BaseModel):
    """Response after uploading a PDF file"""
    message: str
    filename: str
    status: str

class QueryRequest(BaseModel):
    """Request model for asking questions about the PDF"""
    question: str = Field(..., min_length=1, description="The question to ask about the PDF")

class QueryResponse(BaseModel):
    """Response model containing the AI's answer"""
    question: str
    answer: str
    source: str  # Which LLM was used: "huggingface" or "ollama"

class GraphState(BaseModel):
    """
    State object that flows through the LangGraph nodes.
    This is how we pass data between different steps in our RAG pipeline.
    
    Think of this as a shared notebook that each node can read from and write to.
    """
    # Input
    pdf_path: Optional[str] = None
    question: Optional[str] = None
    
    # Processing
    extracted_text: Optional[str] = None
    text_chunks: Optional[List[str]] = None
    
    # Retrieval
    retrieved_contexts: Optional[List[str]] = None
    
    # Prompt
    constructed_prompt: Optional[str] = None
    
    # Output
    answer: Optional[str] = None
    llm_source: Optional[str] = None  # Track which LLM was used
    
    # Error handling
    error: Optional[str] = None
    
    class Config:
        # Allow arbitrary types for compatibility with LangGraph
        arbitrary_types_allowed = True
