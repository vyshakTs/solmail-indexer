import jwt from 'jsonwebtoken';
import { logger } from './logger.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';

// JWT Authentication Middleware
export class JWTAuthenticator {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET_KEY;
        
        if (!this.jwtSecret) {
            throw new Error('JWT_SECRET_KEY environment variable is required for authentication');
        }
        
        // Validate JWT secret strength in production
        if (process.env.NODE_ENV === 'production' && this.jwtSecret.length < 32) {
            throw new Error('JWT_SECRET_KEY must be at least 32 characters long in production');
        }
        
        logger.info('JWT Authenticator initialized');
    }

    /**
     * Extract Bearer token from Authorization header
     * @param {Object} req - Express request object
     * @returns {string|null} - JWT token or null if not found
     */
    extractTokenFromHeader(req) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return null;
        }
        
        // Check for Bearer token format
        const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        if (!tokenMatch) {
            logger.warn('Invalid Authorization header format', { 
                authHeader: authHeader.substring(0, 20) + '...',
                ip: req.ip 
            });
            return null;
        }
        
        return tokenMatch[1];
    }

    /**
     * Verify and decode JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} - Decoded token payload
     * @throws {AuthenticationError} - If token is invalid
     */
    verifyToken(token) {
        try {
            // Verify token with comprehensive options
            const decoded = jwt.verify(token, this.jwtSecret, {
                algorithms: ['HS256'], // Only allow HMAC SHA256
                clockTolerance: 30, // 30 seconds clock tolerance
                ignoreExpiration: false,
                ignoreNotBefore: false
            });
            
            // Validate required fields
            if (!decoded.publicKey || !decoded.role) {
                throw new AuthenticationError('Token missing required fields: publicKey and role');
            }
            
            // Validate public key format (basic Solana address validation)
            if (typeof decoded.publicKey !== 'string' || decoded.publicKey.length !== 44) {
                throw new AuthenticationError('Invalid publicKey format in token');
            }
            
            // Validate role
            if (typeof decoded.role !== 'string' || decoded.role.trim().length === 0) {
                throw new AuthenticationError('Invalid role in token');
            }
            
            // Check if token is about to expire (within 5 minutes)
            if (decoded.exp && (decoded.exp - Math.floor(Date.now() / 1000)) < 300) {
                logger.warn('Token expiring soon', { 
                    publicKey: decoded.publicKey.substring(0, 8) + '...',
                    expiresIn: decoded.exp - Math.floor(Date.now() / 1000) 
                });
            }
            
            return decoded;
        } catch (error) {
            // Handle different JWT errors with specific messages
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError('Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new AuthenticationError('Invalid token format or signature');
            } else if (error.name === 'NotBeforeError') {
                throw new AuthenticationError('Token not yet valid');
            } else if (error instanceof AuthenticationError) {
                throw error; // Re-throw our custom errors
            } else {
                logger.error('Unexpected JWT verification error:', error);
                throw new AuthenticationError('Token verification failed');
            }
        }
    }

    /**
     * Extract publicKey from GraphQL request variables
     * @param {Object} variables - GraphQL variables object
     * @returns {string|null} - Public key from variables or null
     */
    extractPublicKeyFromVariables(variables) {
        if (!variables || typeof variables !== 'object') {
            return null;
        }
        
        // Look for publicKey in various possible variable names
        const possibleKeys = ['publicKey', 'userAddress', 'address', 'userPublicKey'];
        
        for (const key of possibleKeys) {
            if (variables[key] && typeof variables[key] === 'string') {
                return variables[key];
            }
        }
        
        return null;
    }

    /**
     * Compare token public key with request public key
     * @param {string} tokenPublicKey - Public key from JWT token
     * @param {string} requestPublicKey - Public key from request variables
     * @throws {AuthenticationError} - If keys don't match
     */
    validatePublicKeyMatch(tokenPublicKey, requestPublicKey) {
        if (!requestPublicKey) {
            throw new AuthenticationError('Request must include user publicKey in variables');
        }
        
        if (tokenPublicKey !== requestPublicKey) {
            logger.warn('Public key mismatch detected', { 
                tokenKey: tokenPublicKey.substring(0, 8) + '...',
                requestKey: requestPublicKey.substring(0, 8) + '...',
                timestamp: new Date().toISOString()
            });
            throw new AuthenticationError('Token publicKey does not match request publicKey');
        }
    }

    /**
     * Main authentication method for GraphQL context
     * @param {Object} req - Express request object
     * @param {Object} variables - GraphQL variables
     * @returns {Object|null} - User context or null for unauthenticated
     */
    async authenticateRequest(req, variables = {}) {
        try {
            // Extract token from Authorization header
            const token = this.extractTokenFromHeader(req);
            if (!token) {
                throw new AuthenticationError('Authorization header with Bearer token is required');
            }
            
            // Verify and decode the token
            const decoded = this.verifyToken(token);
            
            // Extract public key from request variables
            const requestPublicKey = this.extractPublicKeyFromVariables(variables);
            
            // Validate public key match
            this.validatePublicKeyMatch(decoded.publicKey, requestPublicKey);
            
            // Log successful authentication
            logger.debug('Successful authentication', { 
                publicKey: decoded.publicKey.substring(0, 8) + '...',
                role: decoded.role,
                exp: decoded.exp,
                ip: req.ip
            });
            
            // Return user context
            return {
                publicKey: decoded.publicKey,
                role: decoded.role,
                isAuthenticated: true,
                tokenExp: decoded.exp,
                tokenIat: decoded.iat,
                // Include original token claims (excluding sensitive data)
                claims: {
                    exp: decoded.exp,
                    iat: decoded.iat,
                    role: decoded.role
                }
            };
            
        } catch (error) {
            // Log authentication failures
            logger.warn('Authentication failed', { 
                error: error.message,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                timestamp: new Date().toISOString()
            });
            
            // Re-throw authentication errors to be handled by Apollo Server
            throw error;
        }
    }

    /**
     * Middleware for checking if user has required role
     * @param {Array<string>} allowedRoles - Array of allowed roles
     * @returns {Function} - Middleware function
     */
    requireRole(allowedRoles = []) {
        return (user) => {
            if (!user || !user.isAuthenticated) {
                throw new AuthenticationError('Authentication required');
            }
            
            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                throw new AuthorizationError(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`);
            }
            
            return true;
        };
    }

    /**
     * Check if user is admin
     * @param {Object} user - User context object
     * @returns {boolean} - True if user is admin
     */
    isAdmin(user) {
        return user && user.isAuthenticated && user.role === 'admin';
    }

    /**
     * Check if user owns the resource (publicKey matches)
     * @param {Object} user - User context object
     * @param {string} resourcePublicKey - Public key of the resource owner
     * @returns {boolean} - True if user owns the resource
     */
    isOwner(user, resourcePublicKey) {
        return user && user.isAuthenticated && user.publicKey === resourcePublicKey;
    }

    /**
     * Check if user can access resource (is owner or admin)
     * @param {Object} user - User context object
     * @param {string} resourcePublicKey - Public key of the resource owner
     * @returns {boolean} - True if user can access resource
     */
    canAccessResource(user, resourcePublicKey) {
        return this.isOwner(user, resourcePublicKey) || this.isAdmin(user);
    }
}

// Create singleton instance
export const jwtAuthenticator = new JWTAuthenticator();

// Helper function for resolvers to check authentication
export const requireAuth = (user) => {
    if (!user || !user.isAuthenticated) {
        throw new AuthenticationError('Authentication required for this operation');
    }
    return user;
};

// Helper function for resolvers to check admin role
export const requireAdmin = (user) => {
    requireAuth(user);
    if (!jwtAuthenticator.isAdmin(user)) {
        throw new AuthorizationError('Admin privileges required for this operation');
    }
    return user;
};

// Helper function for resolvers to check resource ownership
export const requireOwnership = (user, resourcePublicKey) => {
    requireAuth(user);
    if (!jwtAuthenticator.canAccessResource(user, resourcePublicKey)) {
        throw new AuthorizationError('Insufficient permissions to access this resource');
    }
    return user;
};