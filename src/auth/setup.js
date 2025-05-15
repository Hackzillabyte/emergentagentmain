/**
 * Authentication Setup
 * 
 * Configures and initializes authentication mechanisms for the agent system.
 * Supports multiple authentication strategies including JWT, OAuth providers,
 * API keys, and custom authentication schemes.
 */

import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { OAuth2Strategy as MicrosoftStrategy } from 'passport-microsoft';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { getConnection } from '../data/connections.js';
import { createUserIfNotExists, findUserById, findUserByEmail, validateUserCredentials } from './userManager.js';
import { storeToken, revokeToken, validateToken } from './tokenManager.js';
import { getRolePermissions, hasPermission } from './permissions.js';

// Cache for API keys to reduce database lookups
const apiKeyCache = new Map();

/**
 * Configure the authentication system
 * 
 * @param {Object} app - Express application instance
 * @returns {Promise<Object>} Authentication manager
 */
export async function configureAuthentication(app) {
  logger.info('Configuring authentication system...');
  
  // Initialize Passport
  app.use(passport.initialize());
  
  // Configure session if enabled
  if (process.env.USE_SESSION_AUTH === 'true') {
    const session = await import('express-session');
    const RedisStore = (await import('connect-redis')).default;
    
    const redisClient = getConnection('redis');
    
    app.use(
      session.default({
        store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
        secret: process.env.SESSION_SECRET || 'agent-system-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      })
    );
    
    app.use(passport.session());
    
    // Serialize and deserialize user for session management
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await findUserById(id);
        done(null, user);
      } catch (err) {
        done(err);
      }
    });
  }
  
  // Initialize authentication strategies
  await initializeStrategies();
  
  // Create authentication middleware factory
  const authMiddleware = createAuthMiddleware();
  
  // API Key validation middleware
  const apiKeyAuth = createApiKeyMiddleware();
  
  // Token management functions
  const tokenManager = {
    generateToken,
    verifyToken,
    revokeToken,
  };
  
  // Add authentication manager to app locals
  app.locals.auth = {
    requireAuth: authMiddleware,
    requireApiKey: apiKeyAuth,
    requirePermission: createPermissionMiddleware(),
    tokens: tokenManager,
  };
  
  logger.info('Authentication system configured successfully');
  
  return {
    requireAuth: authMiddleware,
    requireApiKey: apiKeyAuth,
    requirePermission: createPermissionMiddleware(),
    tokens: tokenManager,
  };
}

/**
 * Initialize authentication strategies
 */
async function initializeStrategies() {
  // JWT Strategy
  if (process.env.JWT_SECRET) {
    logger.info('Configuring JWT authentication strategy');
    
    const jwtOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      issuer: process.env.JWT_ISSUER || 'agent-system',
      audience: process.env.JWT_AUDIENCE || 'agent-system-api',
    };
    
    passport.use(
      new JwtStrategy(jwtOptions, async (payload, done) => {
        try {
          const user = await findUserById(payload.sub);
          
          if (!user) {
            return done(null, false);
          }
          
          if (user.disabled) {
            return done(null, false, { message: 'Account disabled' });
          }
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      })
    );
  }
  
  // Local Strategy (username/password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await findUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }
          
          if (user.disabled) {
            return done(null, false, { message: 'Account disabled' });
          }
          
          const isValidPassword = await validateUserCredentials(user, password);
          
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid credentials' });
          }
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    logger.info('Configuring Google OAuth authentication strategy');
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (!email) {
              return done(null, false, { message: 'Email not provided by Google' });
            }
            
            const user = await createUserIfNotExists({
              email,
              displayName: profile.displayName,
              provider: 'google',
              providerId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            });
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  
  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    logger.info('Configuring GitHub OAuth authentication strategy');
    
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (!email) {
              return done(null, false, { message: 'Email not provided by GitHub' });
            }
            
            const user = await createUserIfNotExists({
              email,
              displayName: profile.displayName || profile.username,
              provider: 'github',
              providerId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            });
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  
  // Microsoft OAuth Strategy
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    logger.info('Configuring Microsoft OAuth authentication strategy');
    
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/api/auth/microsoft/callback',
          scope: ['user.read', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (!email) {
              return done(null, false, { message: 'Email not provided by Microsoft' });
            }
            
            const user = await createUserIfNotExists({
              email,
              displayName: profile.displayName,
              provider: 'microsoft',
              providerId: profile.id,
              avatar: null, // Microsoft doesn't provide avatar URL in the standard profile
            });
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
}

/**
 * Create authentication middleware factory
 * 
 * @returns {Function} Authentication middleware factory
 */
function createAuthMiddleware() {
  return (strategy = 'jwt') => {
    return (req, res, next) => {
      // Skip authentication if disabled
      if (process.env.DISABLE_AUTH === 'true') {
        req.user = { id: 'anonymous', role: 'guest' };
        return next();
      }
      
      passport.authenticate(strategy, { session: false }, (err, user, info) => {
        if (err) {
          logger.error('Authentication error:', err);
          return res.status(500).json({ error: 'Authentication error' });
        }
        
        if (!user) {
          return res.status(401).json({ error: info?.message || 'Unauthorized' });
        }
        
        req.user = user;
        next();
      })(req, res, next);
    };
  };
}

/**
 * Create API key authentication middleware
 * 
 * @returns {Function} API key middleware
 */
function createApiKeyMiddleware() {
  return async (req, res, next) => {
    // Skip authentication if disabled
    if (process.env.DISABLE_AUTH === 'true') {
      req.user = { id: 'anonymous', role: 'guest' };
      return next();
    }
    
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    try {
      // Check cache first
      if (apiKeyCache.has(apiKey)) {
        const cachedData = apiKeyCache.get(apiKey);
        
        // Check if cached data is still valid
        if (cachedData.expiresAt > Date.now()) {
          req.user = cachedData.user;
          return next();
        } else {
          // Remove expired key from cache
          apiKeyCache.delete(apiKey);
        }
      }
      
      // Validate API key
      const userData = await validateApiKey(apiKey);
      
      if (!userData) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Cache the result for future requests
      if (userData.expiresAt) {
        apiKeyCache.set(apiKey, {
          user: userData.user,
          expiresAt: userData.expiresAt,
        });
      }
      
      req.user = userData.user;
      next();
    } catch (err) {
      logger.error('API key authentication error:', err);
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

/**
 * Create permission checking middleware
 * 
 * @returns {Function} Permission middleware factory
 */
function createPermissionMiddleware() {
  return (permission) => {
    return async (req, res, next) => {
      // Skip permission check if auth is disabled
      if (process.env.DISABLE_AUTH === 'true') {
        return next();
      }
      
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      try {
        const role = req.user.role || 'guest';
        const userHasPermission = await hasPermission(role, permission);
        
        if (!userHasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
      } catch (err) {
        logger.error('Permission check error:', err);
        return res.status(500).json({ error: 'Permission check failed' });
      }
    };
  };
}

/**
 * Generate a JWT token for a user
 * 
 * @param {Object} user - User object
 * @param {Object} options - Token options
 * @returns {Promise<Object>} Token data
 */
async function generateToken(user, options = {}) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const tokenId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRATION || '1d';
  
  // Calculate numeric expiration
  let expirationSeconds;
  
  if (typeof expiresIn === 'number') {
    expirationSeconds = expiresIn;
  } else if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 's':
          expirationSeconds = value;
          break;
        case 'm':
          expirationSeconds = value * 60;
          break;
        case 'h':
          expirationSeconds = value * 60 * 60;
          break;
        case 'd':
          expirationSeconds = value * 24 * 60 * 60;
          break;
        default:
          expirationSeconds = 24 * 60 * 60; // Default to 1 day
      }
    } else {
      expirationSeconds = 24 * 60 * 60; // Default to 1 day
    }
  } else {
    expirationSeconds = 24 * 60 * 60; // Default to 1 day
  }
  
  const exp = now + expirationSeconds;
  
  // Create payload
  const payload = {
    sub: user.id,
    name: user.displayName || user.email,
    email: user.email,
    role: user.role || 'user',
    jti: tokenId,
    iat: now,
    exp,
    iss: process.env.JWT_ISSUER || 'agent-system',
    aud: process.env.JWT_AUDIENCE || 'agent-system-api',
  };
  
  // Add custom claims if provided
  if (options.claims && typeof options.claims === 'object') {
    Object.assign(payload, options.claims);
  }
  
  // Sign the token
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  
  // Store token information if token management is enabled
  if (process.env.ENABLE_TOKEN_MANAGEMENT === 'true') {
    await storeToken({
      id: tokenId,
      userId: user.id,
      expiresAt: new Date(exp * 1000),
      scope: options.scope || 'api',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  }
  
  return {
    token,
    expiresAt: new Date(exp * 1000),
    tokenId,
  };
}

/**
 * Verify a JWT token
 * 
 * @param {String} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload
 */
async function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'agent-system',
      audience: process.env.JWT_AUDIENCE || 'agent-system-api',
    });
    
    // Check if token has been revoked (if token management is enabled)
    if (process.env.ENABLE_TOKEN_MANAGEMENT === 'true' && decoded.jti) {
      const isValid = await validateToken(decoded.jti);
      
      if (!isValid) {
        throw new Error('Token has been revoked');
      }
    }
    
    return decoded;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (err.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else {
      throw err;
    }
  }
}

/**
 * Validate an API key
 * 
 * @param {String} apiKey - API key to validate
 * @returns {Promise<Object|null>} User data if valid, null otherwise
 */
async function validateApiKey(apiKey) {
  try {
    // Implement API key validation logic
    // This would typically involve checking against a database
    
    // Example implementation:
    const mongoClient = getConnection('mongodb');
    
    if (!mongoClient) {
      logger.error('Cannot validate API key: MongoDB connection not available');
      return null;
    }
    
    const db = mongoClient.db();
    const apiKeyDoc = await db.collection('apiKeys').findOne({ key: apiKey });
    
    if (!apiKeyDoc) {
      return null;
    }
    
    // Check if the API key has expired
    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      return null;
    }
    
    // Get the associated user
    const user = await db.collection('users').findOne({ _id: apiKeyDoc.userId });
    
    if (!user) {
      return null;
    }
    
    // Check if user is disabled
    if (user.disabled) {
      return null;
    }
    
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role || 'user',
        displayName: user.displayName,
      },
      expiresAt: apiKeyDoc.expiresAt,
    };
  } catch (err) {
    logger.error('API key validation error:', err);
    return null;
  }
}