/**
 * API client configuration and helper functions
 */

import axios from 'axios';

// Create API client instance
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Handle 401 Unauthorized (token expired/invalid)
    if (response && response.status === 401) {
      // If not on login page, clear token and redirect
      if (!window.location.pathname.includes('/login')) {
        console.log('Session expired. Redirecting to login.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    
    // Return normalized error object
    return Promise.reject({
      status: response?.status,
      message: response?.data?.error || error.message || 'An unexpected error occurred',
      data: response?.data,
      originalError: error,
    });
  }
);

export default apiClient;