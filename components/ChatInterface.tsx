/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import Spinner from './Spinner';
import SendIcon from './icons/SendIcon';
import RefreshIcon from './icons/RefreshIcon';

interface ChatInterfaceProps {
    documentName: string;
    history: ChatMessage[];
    isQueryLoading: boolean;
    onSendMessage: (message: string) => void;
    onNewChat: () => void;
    exampleQuestions: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentName, history, isQueryLoading, onSendMessage, onNewChat, exampleQuestions }) => {
    const [query, setQuery] = useState('');
    const [currentSuggestion, setCurrentSuggestion] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (exampleQuestions.length === 0) {
            setCurrentSuggestion('');
            return;
        }

        setCurrentSuggestion(exampleQuestions[0]);
        let suggestionIndex = 0;
        const intervalId = setInterval(() => {
            suggestionIndex = (suggestionIndex + 1) % exampleQuestions.length;
            setCurrentSuggestion(exampleQuestions[suggestionIndex]);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [exampleQuestions]);
    
    const renderMarkdown = (text: string) => {
        if (!text) return { __html: '' };

        const lines = text.split('\n');
        let html = '';
        let listType: 'ul' | 'ol' | null = null;
        let paraBuffer = '';

        function flushPara() {
            if (paraBuffer) {
                html += `<p class="my-2">${paraBuffer}</p>`;
                paraBuffer = '';
            }
        }

        function flushList() {
            if (listType) {
                html += `</${listType}>`;
                listType = null;
            }
        }

        for (const rawLine of lines) {
            const line = rawLine
                .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
                .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-gem-mist/50 px-1 py-0.5 rounded-sm font-mono text-sm">$1</code>');

            const isOl = line.match(/^\s*\d+\.\s(.*)/);
            const isUl = line.match(/^\s*[\*\-]\s(.*)/);

            if (isOl) {
                flushPara();
                if (listType !== 'ol') {
                    flushList();
                    html += '<ol class="list-decimal list-inside my-2 pl-5 space-y-1">';
                    listType = 'ol';
                }
                html += `<li>${isOl[1]}</li>`;
            } else if (isUl) {
                flushPara();
                if (listType !== 'ul') {
                    flushList();
                    html += '<ul class="list-disc list-inside my-2 pl-5 space-y-1">';
                    listType = 'ul';
                }
                html += `<li>${isUl[1]}</li>`;
            } else {
                flushList();
                if (line.trim() === '') {
                    flushPara();
                } else {
                    paraBuffer += (paraBuffer ? '<br/>' : '') + line;
                }
            }
        }

        flushPara();
        flushList();

        return { __html: html };
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSendMessage(query);
            setQuery('');
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isQueryLoading]);

    return (
        <div className="flex flex-col h-full relative">
            <header className="absolute top-0 left-0 right-0 p-4 bg-gem-onyx/80 backdrop-blur-sm z-10 flex justify-between items-center border-b border-gem-mist">
                <div className="w-full max-w-4xl mx-auto flex justify-between items-center px-4">
                    <h1 className="text-2xl font-bold text-gem-offwhite truncate" title={`Chat with ${documentName}`}>Chat with {documentName}</h1>
                    <button
                        onClick={onNewChat}
                        className="flex items-center px-4 py-2 bg-gem-blue hover:bg-blue-500 rounded-full text-white transition-colors flex-shrink-0"
                        title="End current chat and start a new one"
                    >
                        <RefreshIcon />
                        <span className="ml-2 hidden sm:inline">New Chat</span>
                    </button>
                </div>
            </header>

            <div className="flex-grow pt-24 pb-32 overflow-y-auto px-4">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    {history.map((message, messageIndex) => (
                        <div key={messageIndex} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl ${
                                message.role === 'user' 
                                ? 'bg-gem-blue text-white' 
                                : 'bg-gem-slate'
                            }`}>
                                <div dangerouslySetInnerHTML={renderMarkdown(message.parts[0].text)} />
                                {message.role === 'model' && message.groundingChunks && message.groundingChunks.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-gem-mist/50">
                                        <h4 className="text-xs font-semibold text-gem-offwhite/70 mb-2 text-right">Sources:</h4>
                                        <div className="flex flex-col items-end gap-2">
                                            {message.groundingChunks.map((chunk, chunkIndex) => (
                                                chunk.retrievedContext?.text && (
                                                    <details
                                                        key={chunkIndex}
                                                        className="group w-full text-right"
                                                        onToggle={(e) => {
                                                            if ((e.target as HTMLDetailsElement).open) {
                                                                // Delay to allow layout to shift and ensure element is visible before scrolling
                                                                setTimeout(() => {
                                                                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                                }, 150);
                                                            }
                                                        }}
                                                    >
                                                        <summary className="cursor-pointer list-none inline-block bg-gem-mist/50 hover:bg-gem-mist text-xs px-3 py-1 rounded-md transition-colors group-open:bg-gem-blue group-open:text-white">
                                                            Source {chunkIndex + 1}
                                                        </summary>
                                                        <div
                                                            className="mt-2 p-3 bg-gem-mist/20 rounded-lg text-sm text-gem-offwhite/90 border border-gem-mist/30 text-left"
                                                        >
                                                            <div className="max-w-none" dangerouslySetInnerHTML={renderMarkdown(chunk.retrievedContext.text)}></div>
                                                        </div>
                                                    </details>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isQueryLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl bg-gem-slate flex items-center">
                                <Spinner />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gem-onyx/80 backdrop-blur-sm">
                 <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-2 min-h-[3rem] flex items-center justify-center">
                        {!isQueryLoading && currentSuggestion && (
                            <button
                                onClick={() => setQuery(currentSuggestion)}
                                className="text-base text-gem-offwhite bg-gem-slate hover:bg-gem-mist transition-colors px-4 py-2 rounded-full"
                                title="Use this suggestion as your prompt"
                            >
                                Try: "{currentSuggestion}"
                            </button>
                        )}
                    </div>
                     <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask a question about the manuals..."
                            className="flex-grow bg-gem-mist border border-gem-mist/50 rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-gem-blue"
                            disabled={isQueryLoading}
                        />
                        <button type="submit" disabled={isQueryLoading || !query.trim()} className="p-3 bg-gem-blue hover:bg-blue-500 rounded-full text-white disabled:bg-gem-mist transition-colors" title="Send message">
                            <SendIcon />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;