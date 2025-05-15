import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAgent } from '../context/AgentContext';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    tools, 
    sessions, 
    isProcessing, 
    toolsLoading, 
    sendQuery,
    startNewSession 
  } = useAgent();
  
  const [quickQuery, setQuickQuery] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [toolStats, setToolStats] = useState({});
  const [showWelcome, setShowWelcome] = useState(true);

  // Sample welcome questions
  const sampleQueries = [
    "What tools can you use to help me?",
    "Summarize my recent conversations",
    "How can I optimize my workflow with you?",
    "Create a plan for my next project"
  ];

  // Calculate tool usage statistics
  useEffect(() => {
    if (sessions.length > 0) {
      const toolUsage = {};
      
      sessions.forEach(session => {
        session.messages?.forEach(message => {
          if (message.role === 'assistant' && message.toolsUsed) {
            message.toolsUsed.forEach(tool => {
              if (!toolUsage[tool.name]) {
                toolUsage[tool.name] = 0;
              }
              toolUsage[tool.name]++;
            });
          }
        });
      });
      
      setToolStats(toolUsage);
      
      // Set recent activity
      const activity = sessions
        .slice(0, 5)
        .map(session => ({
          id: session.id,
          title: session.title || 'New conversation',
          timestamp: session.lastActivity,
          messageCount: session.messages?.length || 0
        }));
      
      setRecentActivity(activity);
    }
  }, [sessions]);

  // Handle quick query submission
  const handleQuickQuery = async (e) => {
    e.preventDefault();
    
    if (!quickQuery.trim() || isProcessing) return;
    
    try {
      await startNewSession();
      await sendQuery(quickQuery);
      setQuickQuery('');
      // Navigate to chat page would happen here in a real app
    } catch (err) {
      console.error('Failed to process query:', err);
    }
  };

  // Use a sample query
  const useSampleQuery = (query) => {
    setQuickQuery(query);
  };

  return (
    <div className="container mx-auto max-w-7xl">
      {/* Welcome section */}
      {showWelcome && (
        <div className="relative mb-8 overflow-hidden rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-8 text-white shadow-lg">
          <button
            onClick={() => setShowWelcome(false)}
            className="absolute top-4 right-4 rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Dismiss"
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
          <h1 className="mb-2 text-2xl font-bold">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="mb-4 max-w-3xl text-white/90">
            I'm your Emergent Agent, ready to assist you with a variety of tasks using my
            tool ecosystem. Ask me anything or select one of the suggestions below to
            get started.
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => useSampleQuery(query)}
                className="rounded-full bg-white/20 px-4 py-2 text-sm hover:bg-white/30"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick query form */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">
          Ask me anything
        </h2>
        <form onSubmit={handleQuickQuery} className="flex space-x-2">
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            className="input flex-1"
            placeholder="Enter your query here..."
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isProcessing || !quickQuery.trim()}
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
              <span>Ask</span>
            )}
          </button>
        </form>
      </div>

      {/* Dashboard content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Recent Conversations
            </h2>
            <Link
              to="/chat"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              View all
            </Link>
          </div>

          {recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()} • 
                      {activity.messageCount} messages
                    </p>
                  </div>
                  <Link
                    to={`/chat?session=${activity.id}`}
                    className="rounded-lg px-3 py-1 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                  >
                    Continue
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                No conversations yet
              </h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Start a new conversation to see your activity here.
              </p>
              <div className="mt-6">
                <Link to="/chat" className="btn btn-primary">
                  Start a conversation
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Available tools */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Available Tools
            </h2>
            <Link
              to="/tools"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              View all
            </Link>
          </div>

          {toolsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary-500"></div>
            </div>
          ) : tools.length > 0 ? (
            <div className="space-y-3">
              {tools.slice(0, 5).map((tool) => (
                <div
                  key={tool.id || tool.name}
                  className="tool-card rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-850"
                >
                  <div className="flex items-start">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tool.description?.substring(0, 60)}
                        {tool.description?.length > 60 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                No tools available at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;