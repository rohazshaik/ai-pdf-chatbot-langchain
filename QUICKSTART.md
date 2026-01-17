# 🚀 Quick Start Guide

Follow these steps to get the **AI PDF Chatbot** running on your local machine.

## 📋 Prerequisites

Ensure you have the following installed:
1.  **Python 3.10+**: [Download Here](https://www.python.org/downloads/)
2.  **Node.js 18+**: [Download Here](https://nodejs.org/)
3.  **Ollama**: [Download Here](https://ollama.com/) (Required for local AI)

---

## 🛠️ Step 1: AI Model Setup

This project uses **Ollama** to run the AI model locally. You must install the specific model used by the backend.

1.  Open your terminal.
2.  Run the following command to pull the model:
    ```bash
    ollama pull qwen2.5:0.5b
    ```
3.  Verify it's running:
    ```bash
    ollama list
    ```
    *You should see `qwen2.5:0.5b` in the list.*

---

## ⚙️ Step 2: Backend Setup

The backend handles the PDF processing and RAG logic.

1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```

2.  Create and activate a virtual environment (Recommended):
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # Mac/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Disable Auto-Reload** (Important for Stability):
    *Note: Auto-reload is disabled by default in `main.py` to prevent conflicts on Windows. Do not change this unless you are debugging.*

5.  Run the server:
    ```bash
    python main.py
    ```
    *You should see: `🚀 Starting AI PDF Chatbot API...`*
    *Server will start at: `http://localhost:8000`*

---

## 💻 Step 3: Frontend Setup

The frontend provides the Chat UI.

1.  Open a **new terminal window**.
2.  Navigate to the `frontend` folder:
    ```bash
    cd frontend
    ```

3.  Install dependencies:
    ```bash
    npm install
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```
    *Frontend will start at: `http://localhost:5173` (or similar)*

---

## ✅ Step 4: Using the App

1.  Open your browser to the Frontend URL (e.g., `http://localhost:5173`).
2.  **Upload a PDF**: Click the "Upload PDF" button.
    *   *First time only:* Processing might take ~30 seconds as it initializes the embedding model.
    *   *Subsequent uploads:* Will be nearly instant.
3.  **Ask Questions**: Type "Summarize this document" or specific questions.

---

## 🛑 Troubleshooting

- **"Ollama timed out"**: The backend is configured to wait 180s. If it still fails, your PC might be too slow. Try a smaller model or close other apps.
- **"RecursionError / Crash Loop"**: Ensure `reload=False` is set in `backend/main.py`.
- **"500 Internal Server Error"**: check the backend terminal for logs. It usually explains why (e.g., PDF too big, Ollama not running).
