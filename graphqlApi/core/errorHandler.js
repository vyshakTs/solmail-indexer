import { logger } from './logger.js';

// Custom error classes
export class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

export class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
    }
}

export class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = 403;
    }
}

export class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = 429;
    }
}

export class DatabaseError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = 503;
        this.originalError = originalError;
    }
}

// Express error handler middleware
export const errorHandler = (error, req, res, next) => {
    // Log the error with context
    logger.error('Express Error Handler:', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId || 'unknown'
    });

    // Handle specific error types
    if (error instanceof ValidationError) {
        return res.status(400).json({
            error: 'Validation Error',
            message: error.message,
            field: error.field,
            code: 'VALIDATION_ERROR'
        });
    }

    if (error instanceof NotFoundError) {
        return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'NOT_FOUND'
        });
    }

    if (error instanceof AuthenticationError) {
        return res.status(401).json({
            error: 'Authentication Required',
            message: error.message,
            code: 'AUTHENTICATION_ERROR'
        });
    }

    if (error instanceof AuthorizationError) {
        return res.status(403).json({
            error: 'Access Denied',
            message: error.message,
            code: 'AUTHORIZATION_ERROR'
        });
    }

    if (error instanceof RateLimitError) {
        return res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: error.message,
            code: 'RATE_LIMIT_ERROR',
            retryAfter: 60 // seconds
        });
    }

    if (error instanceof DatabaseError) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database service is temporarily unavailable',
            code: 'DATABASE_ERROR'
        });
    }

    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database connection failed',
            code: 'DATABASE_CONNECTION_ERROR'
        });
    }

    // PostgreSQL specific errors
    if (error.code?.startsWith('23')) { // Integrity constraint violations
        return res.status(400).json({
            error: 'Data Integrity Error',
            message: 'The operation violates data constraints',
            code: 'CONSTRAINT_VIOLATION'
        });
    }

    if (error.code === '42P01') { // Table doesn't exist
        return res.status(500).json({
            error: 'Configuration Error',
            message: 'Database schema issue detected',
            code: 'SCHEMA_ERROR'
        });
    }

    // JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body contains invalid JSON',
            code: 'JSON_PARSE_ERROR'
        });
    }

    // Request too large errors
    if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FIELD_SIZE') {
        return res.status(413).json({
            error: 'Payload Too Large',
            message: 'Request size exceeds limit',
            code: 'PAYLOAD_TOO_LARGE'
        });
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT') {
        return res.status(504).json({
            error: 'Gateway Timeout',
            message: 'Request timeout',
            code: 'TIMEOUT_ERROR'
        });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : error.message,
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        })
    });
};

// Async error wrapper for route handlers
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Error wrapper for resolvers
export const resolverErrorHandler = (fn) => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            logger.error('Resolver Error:', {
                resolver: fn.name,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
            
            // Re-throw with enhanced context
            if (error instanceof ValidationError || 
                error instanceof NotFoundError ||
                error instanceof AuthenticationError ||
                error instanceof AuthorizationError) {
                throw error;
            }
            
            // Wrap unknown errors
            throw new Error(`Error in ${fn.name}: ${error.message}`);
        }
    };
};

// Database error handler
export const handleDatabaseError = (error, operation) => {
    logger.error(`Database error in ${operation}:`, {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
    });
    
    // Transform PostgreSQL errors to application errors
    if (error.code === 'ECONNREFUSED') {
        throw new DatabaseError('Database connection failed', error);
    }
    
    if (error.code?.startsWith('23')) {
        throw new ValidationError('Data validation failed', error.column);
    }
    
    if (error.code === '42P01') {
        throw new DatabaseError('Database schema error', error);
    }
    
    // Default database error
    throw new DatabaseError('Database operation failed', error);
};