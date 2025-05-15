import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAgent } from '../context/AgentContext';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const {
    messages,
    sessions,
    currentSession,
    isProcessing,
    sendQuery,
    switchSession,
    startNewSession,
    clearMessages,
    deleteSession
  } = useAgent();
  
  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load specified session if provided in URL
  useEffect(() => {
    if (sessionId && sessions.find(s => s.id === sessionId) && (!currentSession || currentSession.id !== sessionId)) {
      switchSession(sessionId);
    }
  }, [sessionId, sessions, currentSession, switchSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    try {
      await sendQuery(input);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date for session list
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Sessions Sidebar (hidden on mobile by default) */}
      <div
        className={`fixed inset-y-0 left-0 z-20 w-80 transform overflow-y-auto bg-white transition-transform dark:bg-gray-800 lg:relative lg:translate-x-0 ${
          showSessions ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button */}
        <button
          className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
          onClick={() => setShowSessions(false)}
          aria-label="Close sessions sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Sessions List */}
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Conversations
            </h2>
            <button
              onClick={startNewSession}
              className="rounded-lg bg-primary-50 p-2 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/50"
              aria-label="New conversation"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {sessions.length > 0 ? (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    switchSession(session.id);
                    setShowSessions(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentSession?.id === session.id
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">
                      {session.title || 'New conversation'}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(session.lastActivity)} • 
                      {session.messages?.length || 0} messages
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                    aria-label="Delete conversation"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No conversations yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                className="mr-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
                onClick={() => setShowSessions(true)}
                aria-label="Show sessions"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {currentSession?.title || 'New conversation'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={clearMessages}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Clear conversation"
                disabled={!currentSession || messages.length === 0}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button
                onClick={startNewSession}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="New conversation"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`chat-bubble ${
                      message.role === 'user' ? 'user' : 'agent'
                    } ${message.pending ? 'opacity-70' : ''}`}
                  >
                    {message.pending ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-pulse rounded-full bg-primary-500"></div>
                        <div className="h-4 w-4 animate-pulse rounded-full bg-primary-500" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-4 w-4 animate-pulse rounded-full bg-primary-500" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Tools used */}
                        {message.role === 'assistant' && message.toolsUsed && message.toolsUsed.length > 0 && (
                          <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            <p>Tools used:</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {message.toolsUsed.map((tool, idx) => (
                                <span 
                                  key={idx}
                                  className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                >
                                  {tool.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Sources if available */}
                        {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                          <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            <p>Sources:</p>
                            <ul className="mt-1 list-inside list-disc">
                              {message.sources.map((source, idx) => (
                                <li key={idx}>
                                  <a 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:underline dark:text-primary-400"
                                  >
                                    {source.title || source.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.timestamp)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-4 h-16 w-16 rounded-full bg-primary-100 p-4 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <svg
                  className="h-full w-full"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white">
                Start a new conversation
              </h3>
              <p className="max-w-sm text-center text-gray-500 dark:text-gray-400">
                Ask me anything, and I'll assist you using my tool ecosystem.
              </p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input flex-1"
              placeholder="Type your message..."
              disabled={isProcessing}
              ref={inputRef}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing || !input.trim()}
            >
              {isProcessing ? (
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;