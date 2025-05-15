/**
 * Tool Registry
 * 
 * Manages the registration, discovery, and lifecycle of all tools available to the agent.
 * The registry maintains metadata about each tool's capabilities, requirements, and performance
 * characteristics to enable intelligent tool selection and orchestration.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { validateToolDefinition } from './validator.js';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Represents the registry of all available tools for the agent
 */
class ToolRegistry extends Map {
  constructor() {
    super();
    this.categories = new Map();
    this.capabilities = new Set();
    this.metadataIndex = new Map();
    this.usageStats = new Map();
  }
  
  /**
   * Register a new tool in the registry
   * 
   * @param {Object} toolDefinition - The tool definition object
   * @returns {Boolean} - True if registration was successful
   */
  registerTool(toolDefinition) {
    try {
      // Validate the tool definition
      const validatedTool = validateToolDefinition(toolDefinition);
      const toolId = validatedTool.id || uuidv4();
      
      // Store the tool with its ID as the key
      this.set(toolId, validatedTool);
      
      // Index the tool by name for easier lookups
      this.metadataIndex.set('name:' + validatedTool.name.toLowerCase(), toolId);
      
      // Add to category index
      if (validatedTool.category) {
        if (!this.categories.has(validatedTool.category)) {
          this.categories.set(validatedTool.category, new Set());
        }
        this.categories.get(validatedTool.category).add(toolId);
      }
      
      // Index by capabilities
      if (validatedTool.capabilities && Array.isArray(validatedTool.capabilities)) {
        for (const capability of validatedTool.capabilities) {
          this.capabilities.add(capability);
          const key = 'capability:' + capability.toLowerCase();
          if (!this.metadataIndex.has(key)) {
            this.metadataIndex.set(key, new Set());
          }
          this.metadataIndex.get(key).add(toolId);
        }
      }
      
      // Index by keywords
      if (validatedTool.keywords && Array.isArray(validatedTool.keywords)) {
        for (const keyword of validatedTool.keywords) {
          const key = 'keyword:' + keyword.toLowerCase();
          if (!this.metadataIndex.has(key)) {
            this.metadataIndex.set(key, new Set());
          }
          this.metadataIndex.get(key).add(toolId);
        }
      }
      
      // Initialize usage statistics
      this.usageStats.set(toolId, {
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        totalExecutions: 0,
        lastUsed: null
      });
      
      logger.info(`Tool registered: ${validatedTool.name} (${toolId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to register tool: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Unregister a tool from the registry
   * 
   * @param {String} toolIdentifier - Tool ID or name
   * @returns {Boolean} - True if the tool was successfully unregistered
   */
  unregisterTool(toolIdentifier) {
    // Determine if the identifier is an ID or name
    let toolId = toolIdentifier;
    if (!this.has(toolIdentifier)) {
      // Try looking up by name
      const key = 'name:' + toolIdentifier.toLowerCase();
      if (this.metadataIndex.has(key)) {
        toolId = this.metadataIndex.get(key);
      } else {
        return false; // Tool not found
      }
    }
    
    if (!this.has(toolId)) {
      return false;
    }
    
    const tool = this.get(toolId);
    
    // Remove from main registry
    this.delete(toolId);
    
    // Remove from name index
    this.metadataIndex.delete('name:' + tool.name.toLowerCase());
    
    // Remove from category index
    if (tool.category && this.categories.has(tool.category)) {
      this.categories.get(tool.category).delete(toolId);
      if (this.categories.get(tool.category).size === 0) {
        this.categories.delete(tool.category);
      }
    }
    
    // Remove from capability index
    if (tool.capabilities && Array.isArray(tool.capabilities)) {
      for (const capability of tool.capabilities) {
        const key = 'capability:' + capability.toLowerCase();
        if (this.metadataIndex.has(key)) {
          const tools = this.metadataIndex.get(key);
          tools.delete(toolId);
          if (tools.size === 0) {
            this.metadataIndex.delete(key);
          }
        }
      }
    }
    
    // Remove from keyword index
    if (tool.keywords && Array.isArray(tool.keywords)) {
      for (const keyword of tool.keywords) {
        const key = 'keyword:' + keyword.toLowerCase();
        if (this.metadataIndex.has(key)) {
          const tools = this.metadataIndex.get(key);
          tools.delete(toolId);
          if (tools.size === 0) {
            this.metadataIndex.delete(key);
          }
        }
      }
    }
    
    // Remove usage statistics
    this.usageStats.delete(toolId);
    
    logger.info(`Tool unregistered: ${tool.name} (${toolId})`);
    return true;
  }
  
  /**
   * Find tools by specified criteria
   * 
   * @param {Object} criteria - Search criteria
   * @returns {Array} - Array of matching tools
   */
  findTools(criteria = {}) {
    let toolIds = new Set(this.keys());
    
    // Filter by category if specified
    if (criteria.category) {
      const categoryTools = this.categories.get(criteria.category);
      if (categoryTools) {
        // Intersect current results with category tools
        toolIds = new Set([...toolIds].filter(id => categoryTools.has(id)));
      } else {
        return []; // No tools in this category
      }
    }
    
    // Filter by capability if specified
    if (criteria.capability) {
      const key = 'capability:' + criteria.capability.toLowerCase();
      const capabilityTools = this.metadataIndex.get(key);
      if (capabilityTools) {
        toolIds = new Set([...toolIds].filter(id => capabilityTools.has(id)));
      } else {
        return []; // No tools with this capability
      }
    }
    
    // Filter by keywords if specified
    if (criteria.keywords && Array.isArray(criteria.keywords)) {
      for (const keyword of criteria.keywords) {
        const key = 'keyword:' + keyword.toLowerCase();
        const keywordTools = this.metadataIndex.get(key);
        if (keywordTools) {
          toolIds = new Set([...toolIds].filter(id => keywordTools.has(id)));
        }
      }
    }
    
    // Filter by input/output types if specified
    if (criteria.inputType) {
      toolIds = new Set([...toolIds].filter(id => {
        const tool = this.get(id);
        return tool.inputTypes && tool.inputTypes.includes(criteria.inputType);
      }));
    }
    
    if (criteria.outputType) {
      toolIds = new Set([...toolIds].filter(id => {
        const tool = this.get(id);
        return tool.outputTypes && tool.outputTypes.includes(criteria.outputType);
      }));
    }
    
    // Return matching tools
    return [...toolIds].map(id => this.get(id));
  }
  
  /**
   * Get all available tool categories
   * 
   * @returns {Array} - Array of category names
   */
  getAllCategories() {
    return [...this.categories.keys()];
  }
  
  /**
   * Get all available tool capabilities
   * 
   * @returns {Array} - Array of capability names
   */
  getAllCapabilities() {
    return [...this.capabilities];
  }
  
  /**
   * Record usage statistics for a tool
   * 
   * @param {String} toolId - The ID of the tool
   * @param {Object} stats - Usage statistics to record
   */
  recordToolUsage(toolId, stats) {
    if (!this.usageStats.has(toolId)) {
      return false;
    }
    
    const currentStats = this.usageStats.get(toolId);
    const now = new Date();
    
    // Update success/failure counts
    if (stats.success) {
      currentStats.successCount++;
    } else {
      currentStats.failureCount++;
    }
    
    // Update execution time statistics
    if (typeof stats.executionTime === 'number') {
      const totalExecTime = currentStats.averageExecutionTime * currentStats.totalExecutions;
      currentStats.totalExecutions++;
      currentStats.averageExecutionTime = (totalExecTime + stats.executionTime) / currentStats.totalExecutions;
    }
    
    // Update last used timestamp
    currentStats.lastUsed = now.toISOString();
    
    return true;
  }
  
  /**
   * Get tool recommendations based on query and context
   * 
   * @param {String} query - User query text
   * @param {Object} context - Query context
   * @returns {Array} - Recommended tools sorted by relevance
   */
  getToolRecommendations(query, context = {}) {
    const recommendations = [];
    
    // Simple keyword-based matching
    const queryLower = query.toLowerCase();
    const matchScores = new Map();
    
    // Score each tool based on keyword matches
    for (const [id, tool] of this.entries()) {
      let score = 0;
      
      // Check for keyword matches
      if (tool.keywords && Array.isArray(tool.keywords)) {
        for (const keyword of tool.keywords) {
          if (queryLower.includes(keyword.toLowerCase())) {
            score += 10; // Base score for keyword match
          }
        }
      }
      
      // Check for name match
      if (queryLower.includes(tool.name.toLowerCase())) {
        score += 5;
      }
      
      // Check for description match
      if (tool.description && queryLower.includes(tool.description.toLowerCase())) {
        score += 3;
      }
      
      // Adjust score based on past performance
      if (this.usageStats.has(id)) {
        const stats = this.usageStats.get(id);
        const totalUses = stats.successCount + stats.failureCount;
        
        if (totalUses > 0) {
          const successRate = stats.successCount / totalUses;
          score *= (0.5 + (0.5 * successRate)); // Weight by success rate
        }
      }
      
      if (score > 0) {
        matchScores.set(id, score);
      }
    }
    
    // Sort tools by score
    const sortedTools = [...matchScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.get(id));
    
    return sortedTools;
  }
  
  /**
   * Load tool definitions from a directory
   * 
   * @param {String} directory - Path to tool definitions directory
   * @returns {Promise<Number>} - Number of tools loaded
   */
  async loadFromDirectory(directory = path.join(__dirname, 'definitions')) {
    try {
      logger.info(`Loading tools from directory: ${directory}`);
      
      // Ensure the directory exists
      try {
        await fs.access(directory);
      } catch (error) {
        logger.warn(`Tools directory ${directory} does not exist or is not accessible`);
        return 0;
      }
      
      // List all files in the directory
      const files = await fs.readdir(directory);
      let loadedCount = 0;
      
      // Process each file
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.json')) {
          try {
            const filePath = path.join(directory, file);
            
            // Load the tool definition
            let toolDefinition;
            
            if (file.endsWith('.json')) {
              // Load JSON definition
              const content = await fs.readFile(filePath, 'utf8');
              toolDefinition = JSON.parse(content);
            } else {
              // Import JS module
              const module = await import(`file://${filePath}`);
              toolDefinition = module.default || module;
            }
            
            // Register the tool
            if (this.registerTool(toolDefinition)) {
              loadedCount++;
            }
          } catch (fileError) {
            logger.error(`Error loading tool from file ${file}:`, fileError);
          }
        }
      }
      
      logger.info(`Loaded ${loadedCount} tools from directory`);
      return loadedCount;
    } catch (error) {
      logger.error('Error loading tools from directory:', error);
      throw error;
    }
  }
  
  /**
   * Export registry data for persistence
   * 
   * @returns {Object} - Registry data for serialization
   */
  exportData() {
    const toolDefinitions = [];
    
    for (const [id, tool] of this.entries()) {
      // Only include serializable properties
      const { execute, ...serializableTool } = tool;
      toolDefinitions.push({
        ...serializableTool,
        id
      });
    }
    
    return {
      tools: toolDefinitions,
      usageStats: Object.fromEntries(this.usageStats)
    };
  }
  
  /**
   * Import registry data from persistence
   * 
   * @param {Object} data - Registry data to import
   * @returns {Number} - Number of tools imported
   */
  importData(data) {
    let importCount = 0;
    
    // Clear existing registry
    this.clear();
    this.categories.clear();
    this.capabilities.clear();
    this.metadataIndex.clear();
    this.usageStats.clear();
    
    // Import tools
    if (data.tools && Array.isArray(data.tools)) {
      for (const toolDefinition of data.tools) {
        if (this.registerTool(toolDefinition)) {
          importCount++;
        }
      }
    }
    
    // Import usage stats
    if (data.usageStats) {
      for (const [toolId, stats] of Object.entries(data.usageStats)) {
        if (this.has(toolId)) {
          this.usageStats.set(toolId, stats);
        }
      }
    }
    
    return importCount;
  }
}

/**
 * Set up the tool registry with default tools
 * 
 * @returns {ToolRegistry} - The configured tool registry
 */
export async function setupToolRegistry() {
  logger.info('Setting up Tool Registry');
  
  const registry = new ToolRegistry();
  
  // Load built-in tools
  await registry.loadFromDirectory(path.join(__dirname, 'builtin'));
  
  // Load custom tools if available
  const customToolsDir = process.env.CUSTOM_TOOLS_DIR || path.join(__dirname, 'custom');
  
  try {
    await registry.loadFromDirectory(customToolsDir);
  } catch (error) {
    logger.warn(`Failed to load custom tools from ${customToolsDir}:`, error);
  }
  
  logger.info(`Tool Registry initialized with ${registry.size} tools`);
  
  // Register registry as a tool for introspection
  registry.registerTool({
    name: 'ToolDiscovery',
    description: 'Discovers and provides information about available tools',
    category: 'system',
    version: '1.0.0',
    author: 'System',
    capabilities: ['introspection', 'discovery'],
    keywords: ['tools', 'list', 'available', 'discover'],
    execute: async (input, context) => {
      // Basic implementation for tool discovery
      if (input.toLowerCase().includes('list') || input.toLowerCase().includes('available')) {
        return {
          toolCount: registry.size,
          categories: registry.getAllCategories(),
          capabilities: registry.getAllCapabilities(),
          tools: [...registry.values()].map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.category,
            capabilities: tool.capabilities
          }))
        };
      }
      
      // Search for specific tools
      const searchTerm = input.toLowerCase().replace(/find|search|tool|tools/g, '').trim();
      if (searchTerm) {
        const matchingTools = [...registry.values()].filter(tool => 
          tool.name.toLowerCase().includes(searchTerm) || 
          (tool.description && tool.description.toLowerCase().includes(searchTerm)) ||
          (tool.keywords && tool.keywords.some(k => k.toLowerCase().includes(searchTerm)))
        );
        
        return {
          searchTerm,
          matchCount: matchingTools.length,
          results: matchingTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.category,
            capabilities: tool.capabilities
          }))
        };
      }
      
      return {
        error: 'Please specify what tool information you need'
      };
    }
  });
  
  return registry;
}