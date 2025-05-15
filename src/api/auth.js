/**
 * Authentication API service
 */

import apiClient from './index';

/**
 * Login a user with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User and token data
 */
export const loginUser = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Register a new user
 * 
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and token
 */
export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout the current user
 * 
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
    // Still proceed with local logout even if API call fails
  }
};

/**
 * Get the current authenticated user
 * 
 * @returns {Promise<Object>} Current user data
 */
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Request password reset
 * 
 * @param {string} email - User email
 * @returns {Promise<Object>} Result message
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Reset password with token
 * 
 * @param {string} token - Reset token
 * @param {string} password - New password
 * @returns {Promise<Object>} Result message
 */
export const resetPassword = async (token, password) => {
  try {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * 
 * @param {Object} profileData - User profile data to update
 * @returns {Promise<Object>} Updated user data
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Change user password
 * 
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Result message
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};