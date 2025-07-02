import { logger } from './logger.js';
import { RateLimitError } from './errorHandler.js';

// In-memory rate limit store
const rateLimitStore = new Map();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    const expiredThreshold = now - (5 * 60 * 1000); // 5 minutes ago
    
    for (const [key, data] of rateLimitStore.entries()) {
        if (data.resetTime < expiredThreshold) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

// Rate limiter middleware factory
export const rateLimiter = (maxRequests = 100, windowMs = 60000, options = {}) => {
    const {
        keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown',
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
        message = 'Too many requests, please try again later.',
        standardHeaders = true,
        legacyHeaders = false
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get or create rate limit data for this key
        let data = rateLimitStore.get(key);
        
        if (!data || data.resetTime <= now) {
            // Initialize or reset the window
            data = {
                count: 0,
                resetTime: now + windowMs,
                firstRequest: now
            };
        }

        // Count this request
        data.count++;
        rateLimitStore.set(key, data);

        // Check if limit exceeded
        const isLimitExceeded = data.count > maxRequests;
        const timeUntilReset = Math.max(0, data.resetTime - now);

        // Set standard headers
        if (standardHeaders) {
            res.set({
                'X-RateLimit-Limit': maxRequests,
                'X-RateLimit-Remaining': Math.max(0, maxRequests - data.count),
                'X-RateLimit-Reset': new Date(data.resetTime).toISOString()
            });
        }

        // Set legacy headers for backwards compatibility
        if (legacyHeaders) {
            res.set({
                'X-Rate-Limit-Limit': maxRequests,
                'X-Rate-Limit-Remaining': Math.max(0, maxRequests - data.count),
                'X-Rate-Limit-Reset': Math.ceil(data.resetTime / 1000)
            });
        }

        if (isLimitExceeded) {
            // Set retry-after header
            res.set('Retry-After', Math.ceil(timeUntilReset / 1000));

            // Log the rate limit violation
            logger.warn('Rate limit exceeded', {
                key,
                count: data.count,
                limit: maxRequests,
                windowMs,
                userAgent: req.get('User-Agent'),
                path: req.path
            });

            // Return rate limit error
            const error = new RateLimitError(message);
            return next(error);
        }

        // Log high usage (80% of limit)
        if (data.count > maxRequests * 0.8) {
            logger.info('High rate limit usage', {
                key,
                count: data.count,
                limit: maxRequests,
                percentage: Math.round((data.count / maxRequests) * 100),
                path: req.path
            });
        }

        next();
    };
};

// Specialized rate limiters for different endpoints
export const graphqlRateLimiter = rateLimiter(200, 60000, {
    message: 'Too many GraphQL requests, please try again later.',
    keyGenerator: (req) => {
        // Use user ID if available, otherwise fall back to IP
        const userId = req.user?.id;
        const ip = req.ip || req.connection.remoteAddress;
        return userId || ip || 'unknown';
    }
});

export const authRateLimiter = rateLimiter(10, 60000, {
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
});

export const healthCheckRateLimiter = rateLimiter(60, 60000, {
    message: 'Too many health check requests.'
});

// Query complexity rate limiter (for GraphQL)
export const complexityRateLimiter = (maxComplexity = 1000, windowMs = 60000) => {
    const complexityStore = new Map();

    return (req, res, next) => {
        // This would be used in GraphQL context to track query complexity
        // For now, just pass through
        next();
    };
};

// Sliding window rate limiter (more sophisticated)
export class SlidingWindowRateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    isAllowed(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Get existing requests for this key
        let keyRequests = this.requests.get(key) || [];

        // Remove requests outside the window
        keyRequests = keyRequests.filter(timestamp => timestamp > windowStart);

        // Check if we can add another request
        if (keyRequests.length >= this.maxRequests) {
            this.requests.set(key, keyRequests);
            return {
                allowed: false,
                count: keyRequests.length,
                resetTime: keyRequests[0] + this.windowMs
            };
        }

        // Add this request
        keyRequests.push(now);
        this.requests.set(key, keyRequests);

        return {
            allowed: true,
            count: keyRequests.length,
            resetTime: now + this.windowMs
        };
    }

    cleanup() {
        const now = Date.now();
        const expiredThreshold = now - this.windowMs;

        for (const [key, requests] of this.requests.entries()) {
            const validRequests = requests.filter(timestamp => timestamp > expiredThreshold);
            if (validRequests.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validRequests);
            }
        }
    }
}

// Global rate limiter instance for complex scenarios
export const globalRateLimiter = new SlidingWindowRateLimiter(1000, 60000);

// Cleanup global rate limiter periodically
setInterval(() => {
    globalRateLimiter.cleanup();
}, 30000); // Clean every 30 seconds