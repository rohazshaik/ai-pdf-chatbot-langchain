# 🧠 Local AI PDF Chatbot

A powerful, privacy-focused RAG (Retrieval-Augmented Generation) application that allows you to chat with your PDF documents using local LLMs. Built with **LangGraph** orchestration and a modern **Glassmorphism UI**.

![Project Screenshot](https://via.placeholder.com/800x400?text=AI+PDF+Chatbot+Screenshot)

## 🌟 Key Features

-   **🔒 100% Local & Private**: Powered by **Ollama**, no data leaves your machine.
-   **🧠 Advanced RAG Pipeline**: Uses **LangGraph** for structured, reliable document processing and retrieval.
-   **🎨 Modern UI**: Beautiful, responsive interface with Glassmorphism design and smooth animations.
-   **💾 Smart History**: Automatically saves chat sessions with AI-generated titles based on context.
-   **⚡ Fast & Efficient**: Optimized embedding pipeline with global model caching for instant uploads.

## 🏗️ Architecture

This project demonstrates a production-ready RAG architecture:

1.  **Ingestion**: PDFs are parsed and split into semantic chunks.
2.  **Embedding**: Text is converted to vectors using `all-MiniLM-L6-v2` (running locally).
3.  **Storage**: Vectors are indexed in **FAISS** for millisecond-level retrieval.
4.  **Orchestration**: **LangGraph** manages the state and flow between retrieval and generation.
5.  **Generation**: **Ollama** (`qwen2.5:0.5b`) generates accurate answers based *strictly* on retrieved context.

## 🛠️ Tech Stack

-   **Backend**: Python, FastAPI, LangChain, LangGraph, FAISS
-   **Frontend**: React, one, Tailwind CSS, Framer Motion
-   **AI Engine**: Ollama (Qwen 2.5), HuggingFace Embeddings

## 🚀 Getting Started

We have prepared a detailed step-by-step guide to get you up and running in minutes.

👉 **[Read the Quick Start Guide](QUICKSTART.md)**

## 📄 License

This project is open-source and available under the MIT License.
