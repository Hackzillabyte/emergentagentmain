import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { user, updateUserData } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // This would be connected to the updateProfile API in a real app
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Update user data in context
      updateUserData({
        name: profileForm.name,
        bio: profileForm.bio,
      });
      
      setNotification({
        type: 'success',
        message: 'Profile updated successfully',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message || 'Failed to update profile',
      });
    } finally {
      setIsSubmitting(false);
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 rounded-lg p-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
            : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
        {/* Sidebar */}
        <aside className="w-full lg:w-64">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex w-full items-center rounded-lg px-4 py-2 text-left font-medium ${
                activeTab === 'profile'
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex w-full items-center rounded-lg px-4 py-2 text-left font-medium ${
                activeTab === 'appearance'
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex w-full items-center rounded-lg px-4 py-2 text-left font-medium ${
                activeTab === 'notifications'
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex w-full items-center rounded-lg px-4 py-2 text-left font-medium ${
                activeTab === 'security'
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Security
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex w-full items-center rounded-lg px-4 py-2 text-left font-medium ${
                activeTab === 'api'
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              API Keys
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          <div className="card">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div>
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Profile Settings
                  </h2>
                </div>
                <div className="card-body">
                  <form onSubmit={handleProfileSubmit}>
                    <div className="mb-8 flex items-center">
                      <div className="mr-5 h-16 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'User'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary-100 text-xl font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Change Photo
                        </button>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          JPG, GIF or PNG. Max size of 1MB.
                        </p>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="name" className="form-label">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className="input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email" className="form-label">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className="input bg-gray-100 dark:bg-gray-800"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Contact support to change your email address.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="bio" className="form-label">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows="4"
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                        className="input"
                        placeholder="Tell us a little about yourself"
                      ></textarea>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
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
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div>
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Appearance Settings
                  </h2>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Theme</label>
                    <div className="mt-2 flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className={`flex items-center rounded-lg border px-4 py-2 ${
                          !darkMode
                            ? 'border-primary-500 bg-primary-50 text-primary-600 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        <svg
                          className="mr-2 h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className={`flex items-center rounded-lg border px-4 py-2 ${
                          darkMode
                            ? 'border-primary-500 bg-primary-50 text-primary-600 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        <svg
                          className="mr-2 h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                        Dark
                      </button>
                      <button
                        type="button"
                        className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <svg
                          className="mr-2 h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        System
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                    <div className="form-group">
                      <label className="form-label">Font Size</label>
                      <div className="mt-2">
                        <select className="input">
                          <option>Small</option>
                          <option selected>Medium (Default)</option>
                          <option>Large</option>
                          <option>X-Large</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                    <div className="form-group">
                      <label className="form-label">Chat Density</label>
                      <div className="mt-2 flex items-center space-x-3">
                        <button
                          type="button"
                          className="flex items-center rounded-lg border border-primary-500 bg-primary-50 px-4 py-2 text-primary-600 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400"
                        >
                          <svg
                            className="mr-2 h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                          Compact
                        </button>
                        <button
                          type="button"
                          className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <svg
                            className="mr-2 h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                            />
                          </svg>
                          Comfortable
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other settings panels would be added here with similar structure */}
            {activeTab === 'notifications' && (
              <div>
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Notification Settings
                  </h2>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 dark:text-gray-300">
                    Configure how and when you receive notifications.
                  </p>
                  {/* Notification settings would go here */}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Security Settings
                  </h2>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage your password and account security.
                  </p>
                  {/* Security settings would go here */}
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div>
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    API Keys
                  </h2>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage API keys for programmatic access to the agent system.
                  </p>
                  {/* API key management would go here */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;