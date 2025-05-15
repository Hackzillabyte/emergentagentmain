/**
 * Agent Orchestrator
 * 
 * Core component responsible for coordinating tool selection, execution, and results integration.
 * The orchestrator acts as the "brain" of the emergent agent system, making decisions about
 * which tools to use and how to combine their outputs to fulfill user requests.
 */

import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger.js';
import { createToolExecutionContext } from './context.js';
import { extractEntities } from '../nlp/entityExtraction.js';
import { analyzeIntent } from '../nlp/intentAnalysis.js';
import { generateToolPlan } from './planner.js';
import { executeToolChain } from './executor.js';
import { synthesizeResults } from './synthesizer.js';
import { storeSession, retrieveSession } from '../data/sessionManager.js';
import { evaluateToolSuccess } from '../monitoring/evaluator.js';

// LLM client instances
let openaiClient;

/**
 * Initializes the Agent Orchestrator with necessary resources and configurations
 * 
 * @param {Map} toolRegistry - Registry of available tools for the agent to use
 * @returns {Object} - The configured orchestrator instance
 */
export async function initializeAgentOrchestrator(toolRegistry) {
  logger.info('Initializing Agent Orchestrator');
  
  // Initialize LLM clients
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  } else {
    logger.warn('OpenAI API key not found, LLM capabilities will be limited');
  }
  
  // Create and return the orchestrator instance
  const orchestrator = {
    toolRegistry,
    activeContexts: new Map(),
    
    /**
     * Process a user query through the orchestration pipeline
     * 
     * @param {Object} queryData - The query data from the user
     * @param {Object} socket - Optional socket for real-time updates
     * @returns {Object} - The processed response
     */
    async processQuery(queryData, socket = null) {
      const { text, sessionId = uuidv4(), userId = 'anonymous', metadata = {} } = queryData;
      const startTime = Date.now();
      let contextId = uuidv4();
      
      try {
        // Step 1: Create or retrieve session context
        const context = await this.getOrCreateContext(sessionId, userId);
        context.currentQuery = text;
        contextId = context.id;
        
        // Step 2: Analyze query intent and entities
        const [intent, entities] = await Promise.all([
          analyzeIntent(text, openaiClient),
          extractEntities(text, openaiClient)
        ]);
        
        logger.info(`Query analysis - Intent: ${intent.primary}, Entities: ${entities.length}`);
        context.currentIntent = intent;
        context.currentEntities = entities;
        
        // Send real-time update if socket is available
        if (socket) {
          socket.emit('agent:status', { 
            status: 'analyzing',
            message: 'Analyzing your request...'
          });
        }
        
        // Step 3: Generate tool execution plan
        const plan = await generateToolPlan({
          intent,
          entities,
          context,
          toolRegistry: this.toolRegistry,
          llmClient: openaiClient
        });
        
        logger.info(`Generated execution plan with ${plan.steps.length} steps`);
        context.currentPlan = plan;
        
        // Send real-time update if socket is available
        if (socket) {
          socket.emit('agent:status', { 
            status: 'planning',
            message: 'Planning tool execution...',
            plan: {
              toolCount: plan.steps.length,
              estimatedTime: plan.estimatedCompletionTime
            }
          });
        }
        
        // Step 4: Execute the tool chain according to the plan
        const executionResults = await executeToolChain({
          plan,
          context,
          toolRegistry: this.toolRegistry,
          onProgress: socket ? (progress) => {
            socket.emit('agent:progress', progress);
          } : null
        });
        
        logger.info(`Tool execution completed with ${executionResults.outputs.length} results`);
        context.lastExecutionResults = executionResults;
        
        // Step 5: Synthesize results into a coherent response
        const response = await synthesizeResults({
          results: executionResults.outputs,
          context,
          intent,
          query: text,
          llmClient: openaiClient
        });
        
        // Step 6: Update context with the final response
        context.conversationHistory.push({
          role: 'user',
          content: text,
          timestamp: new Date().toISOString()
        });
        
        context.conversationHistory.push({
          role: 'assistant',
          content: response.text,
          toolsUsed: executionResults.toolsUsed.map(t => t.name),
          timestamp: new Date().toISOString()
        });
        
        // Step 7: Evaluate tool performance for learning
        if (process.env.ENABLE_TOOL_LEARNING === 'true') {
          this.scheduleToolEvaluation(executionResults, context, text, response);
        }
        
        // Step 8: Store updated session data
        await storeSession(sessionId, context);
        
        const processingTime = Date.now() - startTime;
        logger.info(`Query processed in ${processingTime}ms`);
        
        return {
          sessionId,
          text: response.text,
          html: response.html,
          sources: response.sources,
          processingTime,
          toolsUsed: executionResults.toolsUsed.map(t => ({
            name: t.name,
            executionTime: t.executionTime
          }))
        };
      } catch (error) {
        logger.error(`Error processing query (Context ID: ${contextId}):`, error);
        
        // Attempt to handle the error gracefully
        const errorResponse = await this.handleExecutionError(error, text, contextId);
        
        return {
          sessionId,
          text: errorResponse.text,
          error: true,
          errorType: errorResponse.type,
          errorMessage: process.env.NODE_ENV === 'production' 
            ? errorResponse.userMessage 
            : error.message
        };
      }
    },
    
    /**
     * Get an existing context or create a new one for a session
     */
    async getOrCreateContext(sessionId, userId) {
      // Try to get existing context from memory
      if (this.activeContexts.has(sessionId)) {
        return this.activeContexts.get(sessionId);
      }
      
      // Try to retrieve from persistent storage
      try {
        const savedSession = await retrieveSession(sessionId);
        if (savedSession) {
          this.activeContexts.set(sessionId, savedSession);
          return savedSession;
        }
      } catch (error) {
        logger.warn(`Failed to retrieve session ${sessionId}:`, error);
      }
      
      // Create new context
      const newContext = createToolExecutionContext(sessionId, userId);
      this.activeContexts.set(sessionId, newContext);
      return newContext;
    },
    
    /**
     * Handle execution errors and generate appropriate responses
     */
    async handleExecutionError(error, originalQuery, contextId) {
      logger.error(`Processing error in context ${contextId}:`, error);
      
      // Categorize the error
      let errorType = 'general';
      let userMessage = 'I encountered an issue while processing your request.';
      
      if (error.code === 'TOOL_EXECUTION_FAILED') {
        errorType = 'tool_failure';
        userMessage = 'I had trouble using one of my tools to answer your question.';
      } else if (error.code === 'CONTEXT_LIMIT_EXCEEDED') {
        errorType = 'context_limit';
        userMessage = 'Your question is too complex for me to handle at once.';
      } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
        errorType = 'rate_limit';
        userMessage = 'I\'m currently handling too many requests. Please try again shortly.';
      } else if (error.code === 'INVALID_REQUEST') {
        errorType = 'invalid_request';
        userMessage = 'I couldn\'t understand your request properly.';
      }
      
      // Try to generate a fallback response for retriable errors
      let responseText = userMessage;
      
      if (['tool_failure', 'general'].includes(errorType) && openaiClient) {
        try {
          const fallbackResponse = await openaiClient.chat.completions.create({
            model: process.env.OPENAI_FALLBACK_MODEL || 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant. The user's query couldn't be fully processed due to a tool error. 
                          Provide a helpful response without using advanced tools. Explain any limitations clearly.`
              },
              { role: 'user', content: originalQuery }
            ],
            max_tokens: 500
          });
          
          if (fallbackResponse.choices && fallbackResponse.choices[0]) {
            responseText = `${userMessage} ${fallbackResponse.choices[0].message.content}`;
          }
        } catch (fallbackError) {
          logger.error('Failed to generate fallback response:', fallbackError);
        }
      }
      
      return {
        text: responseText,
        type: errorType,
        userMessage
      };
    },
    
    /**
     * Schedule asynchronous evaluation of tool performance
     */
    scheduleToolEvaluation(executionResults, context, query, response) {
      // This runs asynchronously and doesn't block the response
      setTimeout(async () => {
        try {
          const evaluations = await Promise.all(
            executionResults.toolsUsed.map(tool => 
              evaluateToolSuccess({
                tool: tool.name,
                input: tool.input,
                output: tool.output,
                query,
                response: response.text,
                context
              })
            )
          );
          
          logger.debug('Tool evaluations completed:', evaluations);
        } catch (error) {
          logger.error('Error during tool evaluation:', error);
        }
      }, 0);
    },
    
    /**
     * Clear idle contexts to free up memory
     */
    cleanupIdleContexts(maxAgeMs = 30 * 60 * 1000) {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [sessionId, context] of this.activeContexts.entries()) {
        const lastUpdated = new Date(context.lastUpdated || 0).getTime();
        if (now - lastUpdated > maxAgeMs) {
          this.activeContexts.delete(sessionId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} idle contexts`);
      }
      
      return cleanedCount;
    }
  };
  
  // Set up periodic cleanup of idle contexts
  setInterval(() => {
    orchestrator.cleanupIdleContexts();
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  return orchestrator;
}

/**
 * Creates a simplified orchestrator for testing or lightweight usage
 * 
 * @param {Map} toolRegistry - Registry of available tools
 * @returns {Object} - Simplified orchestrator instance
 */
export function createSimpleOrchestrator(toolRegistry) {
  logger.info('Creating simple orchestrator without full capabilities');
  
  return {
    toolRegistry,
    activeContexts: new Map(),
    
    async processQuery(queryData) {
      const { text, sessionId = uuidv4() } = queryData;
      
      // Simplified processing logic for basic operation
      try {
        // Create a basic context
        const context = { 
          id: uuidv4(),
          sessionId,
          conversationHistory: []
        };
        
        // Find a suitable tool (simplified selection)
        const bestTool = this.findBestTool(text);
        
        if (!bestTool) {
          return {
            sessionId,
            text: "I don't know how to handle that request yet.",
            error: true
          };
        }
        
        // Execute the tool
        const result = await bestTool.execute(text, {});
        
        // Update conversation history
        context.conversationHistory.push({
          role: 'user',
          content: text
        });
        
        context.conversationHistory.push({
          role: 'assistant',
          content: result,
          toolsUsed: [bestTool.name]
        });
        
        return {
          sessionId,
          text: result,
          toolsUsed: [{ name: bestTool.name }]
        };
      } catch (error) {
        logger.error('Error in simple orchestrator:', error);
        
        return {
          sessionId,
          text: "I encountered an error while processing your request.",
          error: true,
          errorMessage: error.message
        };
      }
    },
    
    findBestTool(query) {
      // Simplified tool selection based on keyword matching
      // In a real implementation, this would use more sophisticated NLP
      for (const [name, tool] of this.toolRegistry.entries()) {
        if (tool.keywords && tool.keywords.some(keyword => 
          query.toLowerCase().includes(keyword.toLowerCase()))) {
          return tool;
        }
      }
      
      // Return default tool if available
      return this.toolRegistry.get('default') || null;
    }
  };
}