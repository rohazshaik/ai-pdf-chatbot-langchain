
import os
# Disable TQDM to prevent Colorama regex usage which causes crashes on Windows reloading
os.environ["TQDM_DISABLE"] = "1"

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import logging
from pathlib import Path

from models import UploadResponse, QueryRequest, QueryResponse, GraphState
from graph import upload_graph, query_graph
from config import UPLOAD_DIR

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI PDF Chatbot API",
    description="RAG-based chatbot for querying PDF documents",
    version="1.0.0"
)

# Enable CORS so frontend can talk to backend
# In production, you'd restrict this to specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store the current PDF filename (in production, use a database)
current_pdf_path = None


@app.on_event("startup")
async def startup_event():
    """Check dependencies on startup"""
    logger.info("🚀 Starting AI PDF Chatbot API...")
    
    # Check if Ollama is running
    try:
        import requests
        from config import OLLAMA_BASE_URL, OLLAMA_MODEL
        
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
            if response.status_code == 200:
                models = [model['name'] for model in response.json()['models']]
                if any(OLLAMA_MODEL in m for m in models):
                    logger.info(f"✅ Ollama is running and model '{OLLAMA_MODEL}' is available")
                else:
                    logger.warning(f"⚠️ Ollama is running but model '{OLLAMA_MODEL}' not found. Available: {models}")
                    logger.warning(f"Run 'ollama pull {OLLAMA_MODEL}' to fix this.")
            else:
                logger.warning(f"⚠️ Ollama returned status {response.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ Could not connect to Ollama at {OLLAMA_BASE_URL}. Is it running?")
            logger.warning(f"Error: {str(e)}")
            
    except Exception as e:
        logger.error(f"Startup check failed: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI PDF Chatbot API is running",
        "status": "healthy",
        "endpoints": {
            "upload": "/upload",
            "ask": "/ask"
        }
    }


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and process it through the RAG pipeline.
    
    Steps:
    1. Save the uploaded file
    2. Run through LangGraph: extract → chunk → embed → index
    3. Return success/failure
    
    This endpoint might take 10-30 seconds for large PDFs because:
    - PDF parsing takes time
    - Embedding generation is CPU-intensive
    - FAISS index creation
    """
    global current_pdf_path
    
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported"
            )
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"📤 Uploaded file: {file.filename}")
        
        # Create initial state for LangGraph
        initial_state = GraphState(pdf_path=str(file_path))
        
        # Run the upload graph (PDF ingestion → processing → indexing)
        logger.info("🚀 Starting RAG pipeline...")
        final_state = upload_graph.invoke(initial_state)
        
        # LangGraph returns a dict, not GraphState object
        # Check for errors in the returned state
        if isinstance(final_state, dict):
            error = final_state.get('error')
            if error:
                raise HTTPException(
                    status_code=500,
                    detail=f"Processing failed: {error}"
                )
        else:
            # Fallback for GraphState object
            if final_state.error:
                raise HTTPException(
                    status_code=500,
                    detail=f"Processing failed: {final_state.error}"
                )
        
        # Store the path for future queries
        current_pdf_path = str(file_path)
        
        logger.info("✅ PDF processed successfully")
        
        return UploadResponse(
            message="PDF uploaded and processed successfully",
            filename=file.filename,
            status="success"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )


@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest):
    """
    Ask a question about the uploaded PDF.
    
    Steps:
    1. Take user question
    2. Run through query graph: search → prompt → LLM → response
    3. Return answer
    
    This demonstrates the "retrieval-augmented generation" in action:
    - Retrieve: Find relevant chunks from FAISS
    - Augment: Add them to the prompt
    - Generate: LLM creates the answer
    """
    try:
        # Check if a PDF has been uploaded
        if not current_pdf_path:
            raise HTTPException(
                status_code=400,
                detail="Please upload a PDF first before asking questions"
            )
        
        logger.info(f"❓ Question: {request.question}")
        
        # Create initial state with the question
        initial_state = GraphState(question=request.question)
        
        # Run the query graph
        final_state = query_graph.invoke(initial_state)
        
        # LangGraph returns a dict, not GraphState object
        # Check for errors and extract answer
        if isinstance(final_state, dict):
            error = final_state.get('error')
            answer = final_state.get('answer')
            llm_source = final_state.get('llm_source', 'unknown')
            
            if error:
                raise HTTPException(
                    status_code=500,
                    detail=f"Query failed: {error}"
                )
            
            if not answer:
                raise HTTPException(
                    status_code=500,
                    detail="No answer generated"
                )
        else:
            # Fallback for GraphState object
            if final_state.error:
                raise HTTPException(
                    status_code=500,
                    detail=f"Query failed: {final_state.error}"
                )
            
            if not final_state.answer:
                raise HTTPException(
                    status_code=500,
                    detail="No answer generated"
                )
            
            answer = final_state.answer
            llm_source = final_state.llm_source or "unknown"
        
        logger.info(f"✅ Answer generated using {llm_source}")
        
        return QueryResponse(
            question=request.question,
            answer=answer,
            source=llm_source
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    # In production, use gunicorn or similar
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False  # Disabled to prevent Windows regex recursion crashes
    )
