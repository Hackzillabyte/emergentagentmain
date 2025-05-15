/**
 * Database Connections Manager
 * 
 * Manages connections to various databases and data stores used by the agent system.
 * Provides centralized connection management, pooling, and graceful error handling.
 */

import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import { Sequelize } from 'sequelize';
import { createClient as createRedisClient } from 'redis';
import { PineconeClient } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger.js';

// Connection instances
const connections = {
  mongodb: null,
  mongoose: null,
  postgres: null,
  redis: null,
  pinecone: null,
};

// Connection status
const connectionStatus = {
  mongodb: 'disconnected',
  mongoose: 'disconnected',
  postgres: 'disconnected',
  redis: 'disconnected',
  pinecone: 'disconnected',
};

// Retry configuration
const retryConfig = {
  maxRetries: 5,
  retryDelay: 2000, // ms
  currentRetries: {
    mongodb: 0,
    mongoose: 0,
    postgres: 0,
    redis: 0,
    pinecone: 0,
  },
};

/**
 * Connect to MongoDB using the native driver
 * 
 * @returns {Promise<Object>} MongoDB client instance
 */
async function connectToMongoDB() {
  if (connections.mongodb && connectionStatus.mongodb === 'connected') {
    return connections.mongodb;
  }
  
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/agent';
  
  try {
    logger.info('Connecting to MongoDB...');
    connectionStatus.mongodb = 'connecting';
    
    const client = new MongoClient(mongoUrl, {
      maxPoolSize: 10,
      minPoolSize: 1,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await client.connect();
    
    // Test the connection
    await client.db().command({ ping: 1 });
    
    connections.mongodb = client;
    connectionStatus.mongodb = 'connected';
    retryConfig.currentRetries.mongodb = 0;
    
    logger.info('MongoDB connection established successfully');
    
    // Set up connection monitoring
    client.on('close', () => {
      logger.warn('MongoDB connection closed');
      connectionStatus.mongodb = 'disconnected';
      // Attempt reconnection
      setTimeout(() => {
        if (connectionStatus.mongodb === 'disconnected') {
          connectToMongoDB().catch(err => {
            logger.error('MongoDB reconnection failed:', err);
          });
        }
      }, retryConfig.retryDelay);
    });
    
    return client;
  } catch (error) {
    connectionStatus.mongodb = 'error';
    logger.error('MongoDB connection error:', error);
    
    // Implement retry logic
    retryConfig.currentRetries.mongodb++;
    
    if (retryConfig.currentRetries.mongodb <= retryConfig.maxRetries) {
      logger.info(`Retrying MongoDB connection (${retryConfig.currentRetries.mongodb}/${retryConfig.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      return connectToMongoDB();
    }
    
    throw error;
  }
}

/**
 * Connect to MongoDB using Mongoose
 * 
 * @returns {Promise<Object>} Mongoose connection instance
 */
async function connectToMongoose() {
  if (connections.mongoose && connectionStatus.mongoose === 'connected') {
    return connections.mongoose;
  }
  
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/agent';
  
  try {
    logger.info('Connecting to MongoDB with Mongoose...');
    connectionStatus.mongoose = 'connecting';
    
    // Configure mongoose
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(mongoUrl, {
      maxPoolSize: 10,
      minPoolSize: 1,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    connections.mongoose = mongoose.connection;
    connectionStatus.mongoose = 'connected';
    retryConfig.currentRetries.mongoose = 0;
    
    logger.info('Mongoose connection established successfully');
    
    // Set up connection monitoring
    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose connection disconnected');
      connectionStatus.mongoose = 'disconnected';
      
      // Attempt reconnection
      if (retryConfig.currentRetries.mongoose <= retryConfig.maxRetries) {
        setTimeout(() => {
          if (connectionStatus.mongoose === 'disconnected') {
            connectToMongoose().catch(err => {
              logger.error('Mongoose reconnection failed:', err);
            });
          }
        }, retryConfig.retryDelay);
      }
    });
    
    return mongoose.connection;
  } catch (error) {
    connectionStatus.mongoose = 'error';
    logger.error('Mongoose connection error:', error);
    
    // Implement retry logic
    retryConfig.currentRetries.mongoose++;
    
    if (retryConfig.currentRetries.mongoose <= retryConfig.maxRetries) {
      logger.info(`Retrying Mongoose connection (${retryConfig.currentRetries.mongoose}/${retryConfig.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      return connectToMongoose();
    }
    
    throw error;
  }
}

/**
 * Connect to PostgreSQL using Sequelize
 * 
 * @returns {Promise<Object>} Sequelize instance
 */
async function connectToPostgres() {
  if (connections.postgres && connectionStatus.postgres === 'connected') {
    return connections.postgres;
  }
  
  // PostgreSQL connection parameters
  const dbName = process.env.POSTGRES_DB || 'agent';
  const dbUser = process.env.POSTGRES_USER || 'postgres';
  const dbPass = process.env.POSTGRES_PASSWORD || 'postgres';
  const dbHost = process.env.POSTGRES_HOST || 'localhost';
  const dbPort = process.env.POSTGRES_PORT || 5432;
  
  try {
    logger.info('Connecting to PostgreSQL...');
    connectionStatus.postgres = 'connecting';
    
    // Initialize Sequelize
    const sequelize = new Sequelize(dbName, dbUser, dbPass, {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' 
        ? msg => logger.debug(msg) 
        : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
    
    // Test the connection
    await sequelize.authenticate();
    
    connections.postgres = sequelize;
    connectionStatus.postgres = 'connected';
    retryConfig.currentRetries.postgres = 0;
    
    logger.info('PostgreSQL connection established successfully');
    return sequelize;
  } catch (error) {
    connectionStatus.postgres = 'error';
    logger.error('PostgreSQL connection error:', error);
    
    // Implement retry logic
    retryConfig.currentRetries.postgres++;
    
    if (retryConfig.currentRetries.postgres <= retryConfig.maxRetries) {
      logger.info(`Retrying PostgreSQL connection (${retryConfig.currentRetries.postgres}/${retryConfig.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      return connectToPostgres();
    }
    
    // For non-critical databases, we might want to proceed even if connection fails
    if (process.env.POSTGRES_REQUIRED !== 'true') {
      logger.warn('PostgreSQL connection failed, but continuing as it is not marked as required');
      return null;
    }
    
    throw error;
  }
}

/**
 * Connect to Redis
 * 
 * @returns {Promise<Object>} Redis client instance
 */
async function connectToRedis() {
  if (connections.redis && connectionStatus.redis === 'connected') {
    return connections.redis;
  }
  
  // Redis connection parameters
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;
  
  try {
    logger.info('Connecting to Redis...');
    connectionStatus.redis = 'connecting';
    
    // Create Redis client
    const redisClient = createRedisClient({
      url: redisUrl || undefined,
      socket: {
        host: redisUrl ? undefined : redisHost,
        port: redisUrl ? undefined : redisPort,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > retryConfig.maxRetries) {
            return new Error('Redis connection retry limit exceeded');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: redisPassword || undefined,
    });
    
    // Set up event handlers
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
      if (connectionStatus.redis === 'connected') {
        connectionStatus.redis = 'error';
      }
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
      connectionStatus.redis = 'connecting';
    });
    
    // Connect to Redis
    await redisClient.connect();
    
    connections.redis = redisClient;
    connectionStatus.redis = 'connected';
    retryConfig.currentRetries.redis = 0;
    
    logger.info('Redis connection established successfully');
    return redisClient;
  } catch (error) {
    connectionStatus.redis = 'error';
    logger.error('Redis connection error:', error);
    
    // Implement retry logic
    retryConfig.currentRetries.redis++;
    
    if (retryConfig.currentRetries.redis <= retryConfig.maxRetries) {
      logger.info(`Retrying Redis connection (${retryConfig.currentRetries.redis}/${retryConfig.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      return connectToRedis();
    }
    
    // For non-critical databases, we might want to proceed even if connection fails
    if (process.env.REDIS_REQUIRED !== 'true') {
      logger.warn('Redis connection failed, but continuing as it is not marked as required');
      return null;
    }
    
    throw error;
  }
}

/**
 * Connect to Pinecone vector database
 * 
 * @returns {Promise<Object>} Pinecone client instance
 */
async function connectToPinecone() {
  if (connections.pinecone && connectionStatus.pinecone === 'connected') {
    return connections.pinecone;
  }
  
  // Check if Pinecone API key is available
  if (!process.env.PINECONE_API_KEY) {
    logger.warn('Pinecone API key not provided, skipping connection');
    return null;
  }
  
  try {
    logger.info('Connecting to Pinecone...');
    connectionStatus.pinecone = 'connecting';
    
    // Initialize Pinecone client
    const pinecone = new PineconeClient();
    
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
    });
    
    connections.pinecone = pinecone;
    connectionStatus.pinecone = 'connected';
    retryConfig.currentRetries.pinecone = 0;
    
    logger.info('Pinecone connection established successfully');
    return pinecone;
  } catch (error) {
    connectionStatus.pinecone = 'error';
    logger.error('Pinecone connection error:', error);
    
    // Implement retry logic
    retryConfig.currentRetries.pinecone++;
    
    if (retryConfig.currentRetries.pinecone <= retryConfig.maxRetries) {
      logger.info(`Retrying Pinecone connection (${retryConfig.currentRetries.pinecone}/${retryConfig.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      return connectToPinecone();
    }
    
    // For non-critical databases, we might want to proceed even if connection fails
    if (process.env.PINECONE_REQUIRED !== 'true') {
      logger.warn('Pinecone connection failed, but continuing as it is not marked as required');
      return null;
    }
    
    throw error;
  }
}

/**
 * Connect to all required databases based on configuration
 * 
 * @returns {Promise<Object>} Object containing all database connections
 */
export async function connectDatabases() {
  logger.info('Initializing database connections...');
  
  const connectionsToEstablish = [];
  const requiredConnections = [];
  
  // Determine which connections to establish based on environment variables
  if (process.env.MONGO_URL || process.env.USE_MONGODB === 'true') {
    connectionsToEstablish.push({ name: 'mongodb', fn: connectToMongoDB });
    
    if (process.env.USE_MONGOOSE === 'true') {
      connectionsToEstablish.push({ name: 'mongoose', fn: connectToMongoose });
    }
    
    if (process.env.MONGODB_REQUIRED === 'true') {
      requiredConnections.push('mongodb');
    }
  }
  
  if (process.env.POSTGRES_HOST || process.env.USE_POSTGRES === 'true') {
    connectionsToEstablish.push({ name: 'postgres', fn: connectToPostgres });
    
    if (process.env.POSTGRES_REQUIRED === 'true') {
      requiredConnections.push('postgres');
    }
  }
  
  if (process.env.REDIS_URL || process.env.REDIS_HOST || process.env.USE_REDIS === 'true') {
    connectionsToEstablish.push({ name: 'redis', fn: connectToRedis });
    
    if (process.env.REDIS_REQUIRED === 'true') {
      requiredConnections.push('redis');
    }
  }
  
  if (process.env.PINECONE_API_KEY || process.env.USE_PINECONE === 'true') {
    connectionsToEstablish.push({ name: 'pinecone', fn: connectToPinecone });
    
    if (process.env.PINECONE_REQUIRED === 'true') {
      requiredConnections.push('pinecone');
    }
  }
  
  // MongoDB is required by default if not specified otherwise
  if (requiredConnections.length === 0 && connectionsToEstablish.some(c => c.name === 'mongodb')) {
    requiredConnections.push('mongodb');
  }
  
  // Establish all connections in parallel
  const results = await Promise.allSettled(
    connectionsToEstablish.map(({ fn }) => fn())
  );
  
  // Check for failures in required connections
  const failedRequired = results
    .map((result, index) => ({ result, connection: connectionsToEstablish[index].name }))
    .filter(({ result, connection }) => 
      result.status === 'rejected' && requiredConnections.includes(connection)
    );
  
  if (failedRequired.length > 0) {
    const failedNames = failedRequired.map(f => f.connection).join(', ');
    logger.error(`Failed to connect to required databases: ${failedNames}`);
    throw new Error(`Failed to connect to required databases: ${failedNames}`);
  }
  
  // Log results
  const connectedCount = results.filter(r => r.status === 'fulfilled').length;
  logger.info(`Database initialization complete. Connected to ${connectedCount}/${connectionsToEstablish.length} databases`);
  
  return { ...connections };
}

/**
 * Get database connection by name
 * 
 * @param {String} name - Connection name
 * @returns {Object} Database connection
 */
export function getConnection(name) {
  if (!connections[name]) {
    logger.warn(`Requested connection '${name}' does not exist`);
    return null;
  }
  
  return connections[name];
}

/**
 * Get status of all database connections
 * 
 * @returns {Object} Connection status object
 */
export function getConnectionStatus() {
  return { ...connectionStatus };
}

/**
 * Close all database connections
 * 
 * @returns {Promise<void>}
 */
export async function closeDatabases() {
  logger.info('Closing database connections...');
  
  const closePromises = [];
  
  // Close MongoDB connection
  if (connections.mongodb && connectionStatus.mongodb === 'connected') {
    closePromises.push(
      connections.mongodb.close()
        .then(() => {
          logger.info('MongoDB connection closed');
          connectionStatus.mongodb = 'disconnected';
        })
        .catch(err => {
          logger.error('Error closing MongoDB connection:', err);
        })
    );
  }
  
  // Close Mongoose connection
  if (connections.mongoose && connectionStatus.mongoose === 'connected') {
    closePromises.push(
      mongoose.connection.close()
        .then(() => {
          logger.info('Mongoose connection closed');
          connectionStatus.mongoose = 'disconnected';
        })
        .catch(err => {
          logger.error('Error closing Mongoose connection:', err);
        })
    );
  }
  
  // Close PostgreSQL connection
  if (connections.postgres && connectionStatus.postgres === 'connected') {
    closePromises.push(
      connections.postgres.close()
        .then(() => {
          logger.info('PostgreSQL connection closed');
          connectionStatus.postgres = 'disconnected';
        })
        .catch(err => {
          logger.error('Error closing PostgreSQL connection:', err);
        })
    );
  }
  
  // Close Redis connection
  if (connections.redis && connectionStatus.redis === 'connected') {
    closePromises.push(
      connections.redis.quit()
        .then(() => {
          logger.info('Redis connection closed');
          connectionStatus.redis = 'disconnected';
        })
        .catch(err => {
          logger.error('Error closing Redis connection:', err);
        })
    );
  }
  
  // Wait for all connections to close
  await Promise.allSettled(closePromises);
  logger.info('All database connections closed');
}