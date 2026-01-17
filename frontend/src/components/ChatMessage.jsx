import React from 'react';

export default function ChatMessage({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div
                className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-lg ${isUser
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200/50'
                    }`}
            >
                <div className="flex items-start gap-3">
                    {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                    )}
                    <div className="flex-1">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                        </p>
                        {!isUser && message.source && (
                            <p className={`text-xs mt-2 ${isUser ? 'text-emerald-100' : 'text-gray-500'}`}>
                                Source: {message.source}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
