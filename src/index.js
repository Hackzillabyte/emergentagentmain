/**
 * Emergent Agent System - Main Entry Point
 * 
 * This file initializes the complete emergent agent system including:
 * - Express server configuration
 * - Core agent orchestration layer
 * - Tool registry and management
 * - API routes for agent interaction
 * - Authentication and authorization
 * - Monitoring and telemetry
 */

import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

// Import core system components
import { initializeAgentOrchestrator } from './core/orchestrator.js';
import { setupToolRegistry } from './tools/registry.js';
import { connectDatabases } from './data/connections.js';
import { configureAuthentication } from './auth/setup.js';
import { setupMonitoring } from './monitoring/setup.js';
import { configLogger, logger } from './utils/logger.js';

// Import API routes
import agentRoutes from './routes/agent.routes.js';
import toolRoutes from './routes/tool.routes.js';
import sessionRoutes from './routes/session.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Setup environment variables
dotenv.config();

// Initialize the express application
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Get current file and directory paths (ESM equivalent of __filename and __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize error monitoring
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    tracesSampleRate: 1.0,
  });
  
  // The Sentry request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Configure basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Setup logging
configLogger();
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// System initialization sequence
async function initializeSystem() {
  try {
    // Step 1: Connect to required databases
    await connectDatabases();
    logger.info('Database connections established');

    // Step 2: Set up the tool registry
    const toolRegistry = await setupToolRegistry();
    logger.info(`Initialized tool registry with ${toolRegistry.size} tools`);
    
    // Step 3: Initialize the agent orchestration layer
    const orchestrator = await initializeAgentOrchestrator(toolRegistry);
    logger.info('Agent orchestrator initialized');
    
    // Step 4: Configure authentication mechanisms
    await configureAuthentication(app);
    logger.info('Authentication configured');
    
    // Step 5: Set up monitoring and telemetry
    await setupMonitoring(app, io);
    logger.info('Monitoring systems initialized');
    
    // Make the orchestrator available to routes
    app.locals.orchestrator = orchestrator;
    app.locals.toolRegistry = toolRegistry;
    
    return { orchestrator, toolRegistry };
  } catch (error) {
    logger.error('System initialization failed:', error);
    throw error;
  }
}

// API Routes
app.use('/api/agent', agentRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// The Sentry error handler must be before any other error middleware and after all controllers
if (process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
  
  // Add socket event handlers for real-time agent interactions
  socket.on('agent:query', async (data) => {
    try {
      const { orchestrator } = app.locals;
      const response = await orchestrator.processQuery(data, socket);
      socket.emit('agent:response', response);
    } catch (error) {
      logger.error('Error processing agent query:', error);
      socket.emit('agent:error', { 
        message: 'Failed to process your request',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;

// Initialize the system and start the server
initializeSystem()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`🚀 Emergent Agent System running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  // Close the HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections and perform cleanup
  try {
    // Add cleanup logic here (database disconnection, etc.)
    logger.info('Cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during cleanup:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error);
  }
  
  // In production, we should exit and let the process manager restart
  if (process.env.NODE_ENV === 'production') {
    shutdown();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(reason);
  }
});

export { app, server, io };