import React, { useState, useEffect } from 'react';
import { useAgent } from '../context/AgentContext';

const Tools = () => {
  const { tools, toolsLoading, refreshTools } = useAgent();
  const [filteredTools, setFilteredTools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [expandedTools, setExpandedTools] = useState(new Set());

  // Extract categories from tools
  useEffect(() => {
    if (tools.length > 0) {
      const uniqueCategories = [...new Set(tools.map(tool => tool.category || 'Uncategorized'))];
      setCategories(uniqueCategories);
    }
  }, [tools]);

  // Filter tools based on search and category
  useEffect(() => {
    let result = [...tools];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tool => 
        tool.name.toLowerCase().includes(query) || 
        (tool.description && tool.description.toLowerCase().includes(query)) ||
        (tool.keywords && tool.keywords.some(kw => kw.toLowerCase().includes(query)))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(tool => 
        (tool.category || 'Uncategorized') === selectedCategory
      );
    }
    
    setFilteredTools(result);
  }, [tools, searchQuery, selectedCategory]);

  // Toggle tool expansion
  const toggleToolExpansion = (toolId) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tool Ecosystem
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Explore the various tools available to the emergent agent system to
          help you accomplish tasks.
        </p>
      </div>

      {/* Filters and search */}
      <div className="mb-8 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          {/* Search */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              placeholder="Search tools..."
            />
          </div>

          {/* Category filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input"
            >
              <option value="all">All Categories</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={refreshTools}
          className="btn btn-secondary"
          disabled={toolsLoading}
        >
          {toolsLoading ? (
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
            <span className="flex items-center">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </span>
          )}
        </button>
      </div>

      {/* Tool grid */}
      {toolsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary-500"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading tools...</p>
          </div>
        </div>
      ) : filteredTools.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const toolId = tool.id || tool.name;
            const isExpanded = expandedTools.has(toolId);
            
            return (
              <div
                key={toolId}
                className="tool-card overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="p-6">
                  {/* Tool header */}
                  <div className="mb-4 flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
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
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tool.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{tool.category || 'Uncategorized'}</span>
                        {tool.version && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span>v{tool.version}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tool description */}
                  <p className="mb-4 text-gray-600 dark:text-gray-300">
                    {tool.description || 'No description available.'}
                  </p>

                  {/* Tool capabilities/keywords */}
                  {(tool.capabilities || tool.keywords) && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {tool.capabilities?.map((capability, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {capability}
                          </span>
                        ))}
                        {tool.keywords?.map((keyword, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show details button */}
                  <button
                    onClick={() => toggleToolExpansion(toolId)}
                    className="mt-2 flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {isExpanded ? 'Hide details' : 'Show details'}
                    <svg
                      className={`ml-1.5 h-4 w-4 transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-850">
                    {/* Input/Output Types */}
                    {(tool.inputTypes || tool.outputTypes) && (
                      <div className="mb-4">
                        <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                          Input/Output Types
                        </h4>
                        {tool.inputTypes && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Input:
                            </span>{' '}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {tool.inputTypes.join(', ')}
                            </span>
                          </div>
                        )}
                        {tool.outputTypes && (
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Output:
                            </span>{' '}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {tool.outputTypes.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Author/Source */}
                    {(tool.author || tool.source) && (
                      <div className="mb-4">
                        <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                          Attribution
                        </h4>
                        {tool.author && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Author:
                            </span>{' '}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {tool.author}
                            </span>
                          </div>
                        )}
                        {tool.source && (
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Source:
                            </span>{' '}
                            <a
                              href={tool.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                            >
                              {tool.source}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Example usage if available */}
                    {tool.examples && tool.examples.length > 0 && (
                      <div>
                        <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                          Example Usage
                        </h4>
                        {tool.examples.map((example, index) => (
                          <div
                            key={index}
                            className="mb-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                          >
                            <p className="text-sm italic text-gray-600 dark:text-gray-400">
                              "{example}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No tools found
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No tools are currently available in the system.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/50"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Tools;