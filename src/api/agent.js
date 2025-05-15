/**
 * Agent API service
 */

import apiClient from './index';

/**
 * Send a query to the agent
 * 
 * @param {string} text - The user's query text
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Agent response
 */
export const sendQuery = async (text, options = {}) => {
  try {
    const response = await apiClient.post('/agent/query', {
      text,
      ...options,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch available tools for the agent
 * 
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} List of available tools
 */
export const fetchAvailableTools = async (options = {}) => {
  try {
    const response = await apiClient.get('/tools', { params: options });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get tool details
 * 
 * @param {string} toolId - Tool ID
 * @returns {Promise<Object>} Tool details
 */
export const getToolDetails = async (toolId) => {
  try {
    const response = await apiClient.get(`/tools/${toolId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new session
 * 
 * @param {Object} sessionData - Initial session data
 * @returns {Promise<Object>} Created session
 */
export const createSession = async (sessionData = {}) => {
  try {
    const response = await apiClient.post('/sessions', sessionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get session history
 * 
 * @param {string} sessionId - Session ID (optional, if not provided returns list of sessions)
 * @returns {Promise<Object|Array>} Session data or list of sessions
 */
export const getSessionHistory = async (sessionId) => {
  try {
    const url = sessionId ? `/sessions/${sessionId}` : '/sessions';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update session data
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated session
 */
export const updateSession = async (sessionId, updateData) => {
  try {
    const response = await apiClient.put(`/sessions/${sessionId}`, updateData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a session
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Result message
 */
export const deleteSession = async (sessionId) => {
  try {
    const response = await apiClient.delete(`/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get agent execution metrics
 * 
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Agent metrics
 */
export const getAgentMetrics = async (params = {}) => {
  try {
    const response = await apiClient.get('/agent/metrics', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Submit feedback for an agent response
 * 
 * @param {string} responseId - Response ID
 * @param {Object} feedback - Feedback data
 * @returns {Promise<Object>} Result message
 */
export const submitResponseFeedback = async (responseId, feedback) => {
  try {
    const response = await apiClient.post(`/agent/responses/${responseId}/feedback`, feedback);
    return response.data;
  } catch (error) {
    throw error;
  }
};