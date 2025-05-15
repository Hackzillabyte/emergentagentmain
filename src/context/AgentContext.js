import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  fetchAvailableTools, 
  sendQuery, 
  getSessionHistory, 
  createSession 
} from '../api/agent';

// Create agent context
const AgentContext = createContext();

// Agent provider component
export const AgentProvider = ({ children }) => {
  const { user } = useAuth();
  const [tools, setTools] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load available tools
  useEffect(() => {
    const loadTools = async () => {
      try {
        setToolsLoading(true);
        const availableTools = await fetchAvailableTools();
        setTools(availableTools);
      } catch (err) {
        console.error('Failed to load tools:', err);
        setError('Failed to load available tools');
      } finally {
        setToolsLoading(false);
      }
    };

    loadTools();
  }, []);

  // Load user sessions when user changes
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) {
        setSessions([]);
        setCurrentSession(null);
        setMessages([]);
        return;
      }

      try {
        setSessionsLoading(true);
        const userSessions = await getSessionHistory();
        setSessions(userSessions);
        
        // If there are sessions, set the most recent one as current
        if (userSessions.length > 0) {
          const mostRecent = userSessions.reduce((latest, session) => {
            return new Date(session.lastActivity) > new Date(latest.lastActivity)
              ? session
              : latest;
          }, userSessions[0]);
          
          setCurrentSession(mostRecent);
          loadSessionMessages(mostRecent.id);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  // Load messages for a specific session
  const loadSessionMessages = async (sessionId) => {
    if (!sessionId) return;

    try {
      const session = await getSessionHistory(sessionId);
      setMessages(session.messages || []);
    } catch (err) {
      console.error(`Failed to load messages for session ${sessionId}:`, err);
      setError(`Failed to load conversation history`);
    }
  };

  // Create a new session
  const startNewSession = async () => {
    try {
      const newSession = await createSession();
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      return newSession;
    } catch (err) {
      console.error('Failed to create new session:', err);
      setError('Failed to start new conversation');
      throw err;
    }
  };

  // Switch to a different session
  const switchSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    setCurrentSession(session);
    await loadSessionMessages(sessionId);
  };

  // Send a query to the agent
  const sendAgentQuery = async (query, options = {}) => {
    setError(null);
    setIsProcessing(true);

    try {
      // If no current session, create one
      let sessionId = currentSession?.id;
      if (!sessionId) {
        const newSession = await startNewSession();
        sessionId = newSession.id;
      }

      // Add user message to UI immediately
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
        pending: false
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Add pending agent message
      const pendingAgentMessage = {
        id: `pending-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        pending: true,
        toolsUsed: []
      };
      
      setMessages(prev => [...prev, pendingAgentMessage]);
      
      // Send query to API
      const response = await sendQuery(query, {
        sessionId,
        ...options
      });
      
      // Update with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === pendingAgentMessage.id 
          ? {
              id: response.id || `response-${Date.now()}`,
              role: 'assistant',
              content: response.text,
              timestamp: new Date().toISOString(),
              pending: false,
              toolsUsed: response.toolsUsed || [],
              sources: response.sources || []
            }
          : msg
      ));
      
      // Update session in list
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { 
              ...s, 
              lastActivity: new Date().toISOString(),
              title: s.title || query.substring(0, 30) 
            }
          : s
      ));
      
      return response;
    } catch (err) {
      console.error('Query processing error:', err);
      setError(err.message || 'Failed to process your request');
      
      // Remove pending message on error
      setMessages(prev => prev.filter(msg => !msg.pending));
      
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear messages in current session
  const clearMessages = async () => {
    if (!currentSession) return;
    
    try {
      // Here you would typically call an API to clear the conversation
      // For now, we'll just update the local state
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
      setError('Failed to clear conversation');
    }
  };

  // Delete a session
  const deleteSession = async (sessionId) => {
    try {
      // Call API to delete session
      // For now, just update local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If the deleted session was the current one, switch to another
      if (currentSession?.id === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          await switchSession(remainingSessions[0].id);
        } else {
          setCurrentSession(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete conversation');
    }
  };

  // Context value
  const value = {
    tools,
    sessions,
    currentSession,
    messages,
    isProcessing,
    toolsLoading,
    sessionsLoading,
    error,
    sendQuery: sendAgentQuery,
    startNewSession,
    switchSession,
    clearMessages,
    deleteSession,
    refreshTools: () => fetchAvailableTools().then(setTools)
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};

// Custom hook for using the agent context
export const useAgent = () => {
  const context = useContext(AgentContext);
  
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  
  return context;
};