// Mock User Profile
const MOCK_USER = {
    name: 'ikkiseek',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ikkiseek',
    plan: 'Pro Plan'
};

import React, { useState, useRef, useEffect } from 'react';

function App() {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadHistory, setUploadHistory] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Chat');
    const [isListening, setIsListening] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState('');

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Load histories from localStorage
    useEffect(() => {
        const savedUploads = localStorage.getItem('uploadHistory');
        if (savedUploads) setUploadHistory(JSON.parse(savedUploads));

        const savedChats = localStorage.getItem('chatHistory');
        if (savedChats) setChatHistory(JSON.parse(savedChats));
    }, []);

    // Save chat history when messages change
    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
            // In a real app, this would be more sophisticated.
            // For now, we don't auto-save to history list on every message to avoid clutter,
            // but we prepare the session data.
        }
    }, [messages]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !file.name.endsWith('.pdf')) {
            alert('Please upload a PDF file');
            return;
        }

        // Start upload animation
        setIsUploading(true);
        setUploadingFileName(file.name);
        setUploadProgress(0);

        // Simulate smooth progress animation
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + Math.random() * 15;
            });
        }, 200);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();

            // Complete progress
            clearInterval(progressInterval);
            setUploadProgress(100);

            // Wait a moment to show 100%
            await new Promise(resolve => setTimeout(resolve, 500));

            setUploadedFile(data.filename);

            const updated = [data.filename, ...uploadHistory.filter(f => f !== data.filename)].slice(0, 10);
            setUploadHistory(updated);
            localStorage.setItem('uploadHistory', JSON.stringify(updated));

            // Add welcome message
            setMessages([{
                role: 'assistant',
                content: `Great! I've processed "${data.filename}". What would you like to know about this document?`,
            }]);

            // Reset upload state
            setIsUploading(false);
            setUploadProgress(0);
            setUploadingFileName('');
        } catch (err) {
            clearInterval(progressInterval);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadingFileName('');
            alert('Upload failed: ' + err.message);
        }
    };

    const generateChatName = (messages) => {
        const firstUserMsg = messages.find(m => m.role === 'user');
        const firstAssistantMsg = messages.find(m => m.role === 'assistant');

        if (!firstUserMsg) return `Chat ${new Date().toLocaleTimeString()}`;

        // Extract key words from question and answer
        const question = firstUserMsg.content.toLowerCase();
        const answer = firstAssistantMsg ? firstAssistantMsg.content.toLowerCase() : '';

        // Simple keyword extraction
        let name = '';
        if (question.includes('summarize') || question.includes('summary')) {
            name = 'Summary: ';
        } else if (question.includes('what is') || question.includes('what are')) {
            name = 'About: ';
        } else if (question.includes('how')) {
            name = 'How to: ';
        } else if (question.includes('why')) {
            name = 'Why: ';
        } else if (question.includes('when')) {
            name = 'When: ';
        } else {
            name = 'Q: ';
        }

        // Add truncated question
        const cleanQuestion = firstUserMsg.content.replace(/[?!.]/g, '').trim();
        name += cleanQuestion.slice(0, 35 - name.length);
        if (cleanQuestion.length > 35 - name.length) name += '...';

        return name;
    };

    const saveCurrentSessionToHistory = () => {
        if (messages.length === 0) return;

        const name = generateChatName(messages);

        const session = {
            id: Date.now(),
            name,
            date: new Date().toLocaleDateString(),
            messages
        };

        const updated = [session, ...chatHistory].slice(0, 10);
        setChatHistory(updated);
        localStorage.setItem('chatHistory', JSON.stringify(updated));
    };

    const handleSelectHistory = (filename) => {
        setUploadedFile(filename);
        setMessages([{
            role: 'assistant',
            content: `📄 Switched to "${filename}"`,
        }]);
    };

    const handleSelectChatSession = (session) => {
        setMessages(session.messages);
    };

    const handleDeleteChatSession = (id, e) => {
        e.stopPropagation();
        if (window.confirm('Delete this chat session?')) {
            const updated = chatHistory.filter(session => session.id !== id);
            setChatHistory(updated);
            localStorage.setItem('chatHistory', JSON.stringify(updated));
        }
    };

    const handleDeleteUpload = (filename, e) => {
        e.stopPropagation();
        if (window.confirm(`Delete "${filename}" from history?`)) {
            const updated = uploadHistory.filter(f => f !== filename);
            setUploadHistory(updated);
            localStorage.setItem('uploadHistory', JSON.stringify(updated));
            if (uploadedFile === filename) {
                setUploadedFile(null);
                setMessages([]);
            }
        }
    };

    const handleCopyMessage = async (content) => {
        try {
            await navigator.clipboard.writeText(content);
            // Optionally could add a toast here, but button feedback is often enough
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleAskQuestion = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !uploadedFile) return;

        const question = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setIsLoading(true);

        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to get answer');
            }

            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                source: data.source,
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${err.message}`,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        if (messages.length > 0) {
            saveCurrentSessionToHistory();
        }
        setMessages([]);
    };

    const clearChat = () => {
        if (messages.length > 0) {
            if (window.confirm("Save current chat to history before clearing?")) {
                saveCurrentSessionToHistory();
            }
            setMessages([]);
        }
    };

    const handleBrowsePrompts = () => {
        const prompts = [
            "Summarize this document in 3 bullet points.",
            "What are the main key takeaways?",
            "Explain the technical concepts in simple terms.",
            "Find any deadlines or dates mentioned.",
            "What is the tone of this document?"
        ];
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        setInputValue(randomPrompt);
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Voice recognition is not supported in this browser. Please use Chrome/Edge.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    return (
        <div className="min-h-screen bg-[#e8e8e8] p-6 flex flex-col">
            <div className="max-w-[1400px] w-full mx-auto flex-1 flex gap-4 min-h-0">

                {/* LEFT SIDEBAR - Icon Toolbar */}
                <div className="w-[72px] flex flex-col gap-3">
                    {/* Clear Chat Button */}
                    <button
                        onClick={clearChat}
                        className="w-[72px] h-[72px] rounded-[24px] bg-white/90 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:scale-105 hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition-all flex flex-col items-center justify-center gap-1 border border-white/60 group"
                        title="Clear Chat"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                    </button>

                    {/* New Chat Button */}
                    <button
                        onClick={startNewChat}
                        className="w-[72px] h-[72px] rounded-[24px] bg-black shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:scale-105 hover:shadow-[0_12px_28px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center border border-gray-800"
                        title="New Chat"
                    >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* MAIN CHAT PANEL */}
                <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.04)] border border-white/60 overflow-hidden relative">
                    {/* Header */}
                    <div className="px-10 py-6 border-b border-gray-200/40 bg-white/30 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">Super Chat</h1>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-bold uppercase tracking-wider rounded-full">Beta</span>
                                </div>
                                {uploadedFile && (
                                    <p className="text-[13px] text-gray-500 mt-1 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Now analyzing: {uploadedFile}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative px-6 py-2.5 bg-[#4ade80] hover:bg-[#3dd072] text-white rounded-[16px] text-[14px] font-semibold shadow-[0_8px_20px_rgba(74,222,128,0.25)] hover:shadow-[0_12px_24px_rgba(74,222,128,0.35)] transition-all overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Upload PDF
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    {/* Messages Area - Fixed Scrolling */}
                    <div className="flex-1 overflow-y-auto px-10 py-8 scroll-smooth relative min-h-0">
                        {/* Upload Progress Overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex items-center justify-center">
                                <div className="max-w-md w-full px-8">
                                    <div className="text-center mb-8">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-[24px] bg-gradient-to-tr from-[#4ade80] to-[#22c55e] flex items-center justify-center shadow-[0_20px_40px_rgba(74,222,128,0.3)] animate-pulse">
                                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <h3 className="text-[20px] font-bold text-gray-900 mb-2">Uploading PDF</h3>
                                        <p className="text-[14px] text-gray-600 truncate">{uploadingFileName}</p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative">
                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-300 ease-out rounded-full"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-center mt-3 text-[14px] font-semibold text-gray-700">
                                            {Math.round(uploadProgress)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && !uploadedFile ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center max-w-md mx-auto">
                                    <div className="w-24 h-24 mx-auto mb-8 rounded-[32px] bg-gradient-to-tr from-[#4ade80] to-[#22c55e] flex items-center justify-center shadow-[0_20px_40px_rgba(74,222,128,0.3)] rotate-3 hover:rotate-6 transition-transform duration-500">
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-[28px] font-bold text-gray-900 mb-3 tracking-tight">Welcome to Super Chat</h2>
                                    <p className="text-[16px] text-gray-500 leading-relaxed">
                                        Upload any PDF document to instantly analyze, summarize, and extract insights using our advanced AI.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {messages.map((message, index) => (
                                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[80%] rounded-[24px] px-8 py-6 ${message.role === 'user'
                                            ? 'bg-gradient-to-r from-[#e8ffe8] to-[#f0fff0] text-gray-800 shadow-sm border border-[#4ade80]/20'
                                            : 'bg-white/80 backdrop-blur-md text-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-white/60'
                                            }`}>
                                            {message.role === 'assistant' && (
                                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100/50">
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4ade80] to-[#22c55e] flex items-center justify-center flex-shrink-0 shadow-sm">
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[13px] font-bold text-gray-900">AI Assistant</span>
                                                </div>
                                            )}
                                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            {message.source && (
                                                <div className="mt-4 pt-3 border-t border-gray-100/50 flex items-center gap-2">
                                                    <span className="text-[11px] font-semibold text-[#4ade80] uppercase tracking-wider bg-green-50 px-2 py-1 rounded-md">Source</span>
                                                    <span className="text-[12px] text-gray-500">{message.source}</span>
                                                </div>
                                            )}

                                            {/* Action buttons */}
                                            <div className="flex items-center justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCopyMessage(message.content)}
                                                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-md transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </button>
                                                <button className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-md transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start animate-pulse">
                                        <div className="bg-white/90 backdrop-blur-sm rounded-[24px] px-8 py-6 shadow-sm border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-500">Generating response...</span>
                                                <div className="flex gap-1.5">
                                                    <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-bounce"></div>
                                                    <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                    <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="px-10 py-6 border-t border-gray-200/40 bg-white/40 backdrop-blur-md">
                        <form onSubmit={handleAskQuestion} className="flex gap-4 relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask anything about your document..."
                                className="flex-1 pl-6 pr-32 py-5 rounded-[20px] bg-white border border-gray-200/60 focus:outline-none focus:ring-4 focus:ring-[#4ade80]/10 focus:border-[#4ade80] text-[15px] text-gray-700 placeholder-gray-400 shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all"
                                disabled={isLoading || !uploadedFile}
                            />
                            <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleVoiceInput}
                                    className={`p-2 transition-colors rounded-full ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                    title="Voice Input"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !inputValue.trim() || !uploadedFile}
                                    className="h-10 w-10 bg-black hover:bg-gray-800 text-white rounded-[14px] shadow-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed group mr-1"
                                >
                                    <svg className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                        <div className="flex items-center gap-4 mt-3 px-2">
                            <button
                                onClick={handleBrowsePrompts}
                                className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-800 transition-colors bg-white/50 px-3 py-1.5 rounded-full border border-gray-200/50"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Browse Prompts
                            </button>
                            <button className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-800 transition-colors bg-white/50 px-3 py-1.5 rounded-full border border-gray-200/50">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                No Brand Voice
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR - History & Profile */}
                <div className="w-[320px] flex flex-col gap-4">

                    {/* History Card */}
                    <div className="flex-1 bg-white/70 backdrop-blur-2xl rounded-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.04)] border border-white/60 p-6 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">History Chat</h2>
                            <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            </button>
                        </div>

                        {/* Scrollable Area for Uploads AND Chats */}
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">

                            {/* Section 1: Chat Sessions */}
                            <div>
                                <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">Conversations</h3>
                                <div className="space-y-3">
                                    {chatHistory.length === 0 ? (
                                        <p className="text-[13px] text-gray-400 pl-1">No saved chats</p>
                                    ) : (
                                        chatHistory.map((session) => (
                                            <button
                                                key={session.id}
                                                onClick={() => handleSelectChatSession(session)}
                                                className="w-full text-left p-4 rounded-[20px] bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#4ade80]/30 transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4ade80]/10 transition-colors">
                                                        <svg className="w-4 h-4 text-gray-400 group-hover:text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-relaxed">{session.name}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleDeleteChatSession(session.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete chat"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Uploads */}
                            <div>
                                <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">Uploads</h3>
                                <div className="space-y-2">
                                    {uploadHistory.length === 0 ? (
                                        <p className="text-[13px] text-gray-400 pl-1">No uploads yet</p>
                                    ) : (
                                        uploadHistory.map((filename, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSelectHistory(filename)}
                                                className={`w-full text-left px-4 py-3 rounded-[16px] transition-all flex items-center gap-3 group ${uploadedFile === filename
                                                    ? 'bg-[#4ade80]/10 text-green-800 font-medium'
                                                    : 'hover:bg-gray-50 text-gray-600'
                                                    }`}
                                            >
                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                <span className="truncate text-[13px] flex-1">{filename}</span>
                                                <button
                                                    onClick={(e) => handleDeleteUpload(filename, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete upload"
                                                >
                                                    <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default App;
