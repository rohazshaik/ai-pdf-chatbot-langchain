"""
LangGraph workflow for RAG-based PDF chatbot.

This is the CORE of the project - it demonstrates understanding of:
1. RAG pipeline architecture
2. LangGraph for orchestration
3. How each step connects to the next

The graph is intentionally linear and simple - perfect for learning and explaining.
"""

from typing import Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langgraph.graph import StateGraph, END
import pickle
import logging

from models import GraphState
from llm_client import llm_client
from config import (
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    EMBEDDING_MODEL_NAME,
    TOP_K_RETRIEVAL,
    FAISS_INDEX_PATH,
    FAISS_METADATA_PATH
)

logger = logging.getLogger(__name__)

# Global variable to store the FAISS vector store
# This persists across requests so we don't reload it every time
vector_store = None

# Global embedding model to avoid re-initializing on every request
# This speeds up both upload and query significantly
logger.info("loading embedding model...")
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL_NAME,
    model_kwargs={'device': 'cpu'}
)
logger.info("✓ Embedding model loaded")


# ============================================================================
# NODE 1: PDF INGESTION
# ============================================================================
def pdf_ingestion_node(state: GraphState) -> GraphState:
    """
    Extracts text from the uploaded PDF file.
    
    Why this is a separate node:
    - Validates the PDF before processing
    - Handles errors early (empty files, corrupted PDFs)
    - Makes the pipeline modular and testable
    """
    logger.info("📄 Node 1: PDF Ingestion")
    
    try:
        pdf_path = state.pdf_path
        if not pdf_path:
            state.error = "No PDF path provided"
            return state
        
        # Use LangChain's PDF loader - it handles the complexity of PDF parsing
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        
        if not documents:
            state.error = "PDF appears to be empty or unreadable"
            return state
        
        # Combine all pages into one text string
        extracted_text = "\n\n".join([doc.page_content for doc in documents])
        
        if len(extracted_text.strip()) < 50:
            state.error = "PDF contains too little text to process"
            return state
        
        state.extracted_text = extracted_text
        logger.info(f"✓ Extracted {len(extracted_text)} characters from PDF")
        
    except Exception as e:
        state.error = f"PDF ingestion failed: {str(e)}"
        logger.error(state.error)
    
    return state


# ============================================================================
# NODE 2: TEXT PROCESSING (Chunking)
# ============================================================================
def text_processing_node(state: GraphState) -> GraphState:
    """
    Splits the extracted text into smaller chunks.
    
    Why chunking is necessary:
    1. LLMs have token limits (can't process entire books)
    2. Smaller chunks = more precise retrieval
    3. Each chunk can be embedded and searched independently
    
    Think of it like creating an index in a textbook - you want specific
    sections, not the whole book every time.
    """
    logger.info("✂️  Node 2: Text Processing (Chunking)")
    
    try:
        if state.error or not state.extracted_text:
            return state
        
        # RecursiveCharacterTextSplitter is smart - it tries to split on
        # natural boundaries (paragraphs, sentences) rather than mid-word
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]  # Try these in order
        )
        
        chunks = text_splitter.split_text(state.extracted_text)
        
        if not chunks:
            state.error = "Text splitting produced no chunks"
            return state
        
        state.text_chunks = chunks
        logger.info(f"✓ Created {len(chunks)} chunks")
        
    except Exception as e:
        state.error = f"Text processing failed: {str(e)}"
        logger.error(state.error)
    
    return state


# ============================================================================
# NODE 3: EMBEDDING & INDEXING
# ============================================================================
def embedding_indexing_node(state: GraphState) -> GraphState:
    """
    Converts text chunks into vector embeddings and stores them in FAISS.
    
    What's happening here:
    1. Each chunk is converted to a vector (list of numbers)
    2. These vectors capture the semantic meaning of the text
    3. FAISS creates an index for fast similarity search
    
    Why FAISS:
    - Fast and efficient
    - Works locally (no cloud dependency)
    - Industry standard for vector search
    """
    logger.info("🧮 Node 3: Embedding & Indexing")
    
    global vector_store
    
    try:
        if state.error or not state.text_chunks:
            return state
        
        # Create FAISS vector store from chunks
        # This is where the "magic" happens - text becomes searchable vectors
        # Use our pre-loaded global embeddings model
        vector_store = FAISS.from_texts(
            texts=state.text_chunks,
            embedding=embeddings
        )
        
        # Persist to disk so we don't have to re-embed on every question
        vector_store.save_local(str(FAISS_INDEX_PATH.parent))
        
        logger.info(f"✓ Created and saved FAISS index with {len(state.text_chunks)} vectors")
        
    except Exception as e:
        state.error = f"Embedding/indexing failed: {str(e)}"
        logger.error(state.error)
    
    return state


# ============================================================================
# NODE 4: QUERY (Similarity Search)
# ============================================================================
def query_node(state: GraphState) -> GraphState:
    """
    Searches the vector store for chunks most relevant to the user's question.
    
    How it works:
    1. User question is converted to a vector
    2. FAISS finds the closest matching chunk vectors
    3. Those chunks become the "context" for the LLM
    
    This is the "Retrieval" part of RAG!
    """
    logger.info("🔍 Node 4: Query (Similarity Search)")
    
    global vector_store
    
    try:
        if state.error or not state.question:
            return state
        
        # Load vector store if not already in memory
        if vector_store is None:
            # Use global embeddings model
            vector_store = FAISS.load_local(
                str(FAISS_INDEX_PATH.parent),
                embeddings,
                allow_dangerous_deserialization=True  # We trust our own data
            )
        
        # Perform similarity search
        # This returns the TOP_K most relevant chunks
        docs = vector_store.similarity_search(state.question, k=TOP_K_RETRIEVAL)
        
        if not docs:
            state.error = "No relevant context found in the document"
            return state
        
        # Extract just the text content
        retrieved_contexts = [doc.page_content for doc in docs]
        state.retrieved_contexts = retrieved_contexts
        
        logger.info(f"✓ Retrieved {len(retrieved_contexts)} relevant chunks")
        
    except Exception as e:
        state.error = f"Query failed: {str(e)}"
        logger.error(state.error)
    
    return state


# ============================================================================
# NODE 5: PROMPT CONSTRUCTION
# ============================================================================
def prompt_construction_node(state: GraphState) -> GraphState:
    """
    Builds the final prompt that will be sent to the LLM.
    
    A good RAG prompt has:
    1. Clear instructions (answer only from context)
    2. The retrieved context
    3. The user's question
    
    This is crucial - a bad prompt = bad answers, even with good context.
    """
    logger.info("📝 Node 5: Prompt Construction")
    
    try:
        if state.error or not state.retrieved_contexts or not state.question:
            return state
        
        # Combine all retrieved chunks into one context block with numbering
        context_parts = []
        for i, chunk in enumerate(state.retrieved_contexts, 1):
            context_parts.append(f"[Chunk {i}]\n{chunk}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Build the improved prompt with strict instructions
        prompt = f"""You are a helpful AI assistant analyzing a PDF document. Your task is to answer questions STRICTLY based on the provided document content.

CRITICAL RULES:
1. ONLY use information from the document chunks below
2. If the answer is in the document, provide it and cite which chunk(s) you used (e.g., "According to Chunk 1...")
3. If the information is NOT in the document, respond EXACTLY like this:
   "I cannot find this information in the provided document.
   
   Would you like me to answer this question using my general AI knowledge instead?"
4. Be concise but thorough - extract ALL relevant details
5. Quote relevant parts from the document when helpful
6. Do NOT make up or infer information not explicitly stated in the document

Document Content:
{context}

User Question: {state.question}

Your Answer (remember to cite chunk numbers if answering from document):"""
        
        state.constructed_prompt = prompt
        logger.info("✓ Prompt constructed with strict source attribution")
        
    except Exception as e:
        state.error = f"Prompt construction failed: {str(e)}"
        logger.error(state.error)
    
    return state


# ============================================================================
# NODE 6: LLM EXECUTION (with fallback)
# ============================================================================
def llm_execution_node(state: GraphState) -> GraphState:
    """
    Sends the prompt to the LLM and gets the answer.
    
    This node demonstrates:
    1. Integration with external APIs (Hugging Face)
    2. Fallback strategy (Ollama as backup)
    3. Error handling
    
    Why fallback? 
    - HF free tier has rate limits
    - Shows you think about reliability
    - Ollama is free and unlimited (but local only)
    """
    logger.info("🤖 Node 6: LLM Execution")
    
    try:
        if state.error or not state.constructed_prompt:
            return state
        
        # Call LLM with automatic fallback
        answer, source = llm_client.generate(state.constructed_prompt)
        
        state.answer = answer
        state.llm_source = source
        
        logger.info(f"✓ Generated answer using {source}")
        
    except Exception as e:
        state.error = f"LLM execution failed: {str(e)}"
        logger.error(state.error)
    
    return state


# ============================================================================
# NODE 7: RESPONSE
# ============================================================================
def response_node(state: GraphState) -> GraphState:
    """
    Final node - just validates and returns the answer.
    
    In a more complex system, this might:
    - Format the response
    - Add citations
    - Log the interaction
    
    For our learning project, we keep it simple.
    """
    logger.info("✅ Node 7: Response")
    
    if state.error:
        logger.error(f"Pipeline failed: {state.error}")
    elif state.answer:
        logger.info("✓ Pipeline completed successfully")
    
    return state


# ============================================================================
# BUILD THE GRAPH
# ============================================================================
def create_rag_graph():
    """
    Assembles nodes for PDF upload workflow.
    
    The flow is linear:
    PDF → Extract → Chunk → Embed → Store
    """
    workflow = StateGraph(GraphState)
    
    # Add nodes for upload flow only
    workflow.add_node("pdf_ingestion", pdf_ingestion_node)
    workflow.add_node("text_processing", text_processing_node)
    workflow.add_node("embedding_indexing", embedding_indexing_node)
    workflow.add_node("response", response_node)
    
    # Set entry point
    workflow.set_entry_point("pdf_ingestion")
    
    # Define edges (how nodes connect)
    # For PDF upload flow:
    workflow.add_edge("pdf_ingestion", "text_processing")
    workflow.add_edge("text_processing", "embedding_indexing")
    workflow.add_edge("embedding_indexing", "response")
    workflow.add_edge("response", END)
    
    return workflow.compile()


def create_query_graph():
    """
    Separate graph for handling questions (after PDF is already indexed).
    """
    workflow = StateGraph(GraphState)
    
    workflow.add_node("query", query_node)
    workflow.add_node("prompt_construction", prompt_construction_node)
    workflow.add_node("llm_execution", llm_execution_node)
    workflow.add_node("response", response_node)
    
    workflow.set_entry_point("query")
    workflow.add_edge("query", "prompt_construction")
    workflow.add_edge("prompt_construction", "llm_execution")
    workflow.add_edge("llm_execution", "response")
    workflow.add_edge("response", END)
    
    return workflow.compile()


# Create graph instances
upload_graph = create_rag_graph()
query_graph = create_query_graph()
