import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import http from 'http';

import { typeDefs } from "../typedefs/index.js";
import { resolvers } from "../resolvers/index.js";
import { logger } from './logger.js';
import { jwtAuthenticator } from './auth.js';

// Enhanced error handler with detailed logging
const errorHandler = (formattedError, error) => {
    // Log the original error for debugging
    logger.error('GraphQL Error:', {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: error.extensions,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Determine error type and return appropriate message
    if (formattedError?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED') {
        return {
            message: formattedError.message,
            code: 'VALIDATION_ERROR',
            path: formattedError.path
        };
    }

    if (formattedError?.extensions?.code === 'INTERNAL_ERROR') {
        return {
            message: process.env.NODE_ENV === 'production' 
                ? "Internal server error" 
                : formattedError.message,
            code: 'INTERNAL_ERROR'
        };
    }

    if (formattedError?.extensions?.code === 'PERSISTED_QUERY_NOT_FOUND') {
        return {
            message: "Persisted query not found",
            code: 'PERSISTED_QUERY_ERROR'
        };
    }

    // Authentication and authorization errors
    if (error.name === 'AuthenticationError') {
        return {
            message: error.message,
            code: 'UNAUTHENTICATED',
            extensions: {
                code: 'UNAUTHENTICATED'
            }
        };
    }

    if (error.name === 'AuthorizationError') {
        return {
            message: error.message,
            code: 'FORBIDDEN',
            extensions: {
                code: 'FORBIDDEN'
            }
        };
    }

    // Rate limiting errors
    if (error.message?.includes('Rate limit')) {
        return {
            message: "Too many requests. Please try again later.",
            code: 'RATE_LIMIT_EXCEEDED'
        };
    }

    // Database connection errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connection')) {
        return {
            message: "Service temporarily unavailable",
            code: 'SERVICE_UNAVAILABLE'
        };
    }

    // Default error response
    return {
        message: process.env.NODE_ENV === 'production' 
            ? "An error occurred processing your request" 
            : formattedError.message,
        code: 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV === 'development' && { path: formattedError.path })
    };
};

// Performance monitoring plugin
const performancePlugin = {
    requestDidStart() {
        return {
            willSendResponse(requestContext) {
                const { request, response } = requestContext;
                const executionTime = Date.now() - requestContext.contextValue.startTime;
                
                if (executionTime > 1000) { // Log slow queries
                    logger.warn('Slow GraphQL Query:', {
                        query: request.query,
                        variables: request.variables,
                        executionTime: `${executionTime}ms`,
                        user: requestContext.contextValue.user?.publicKey?.substring(0, 8) + '...' || 'unauthenticated'
                    });
                }
            },
            
            didResolveOperation(requestContext) {
                requestContext.contextValue.startTime = Date.now();
            }
        };
    }
};

// Authentication plugin that handles JWT verification
const authenticationPlugin = {
    requestDidStart() {
        return {
            async didResolveOperation(requestContext) {
                const { request, contextValue } = requestContext;
                
                // Skip authentication for introspection queries in development
                if (process.env.NODE_ENV !== 'production' && 
                    request.query?.includes('__schema')) {
                    logger.debug('Skipping authentication for introspection query');
                    return;
                }

                // Skip authentication for health check queries
                if (request.query?.includes('healthCheck')) {
                    logger.debug('Skipping authentication for health check');
                    return;
                }

                try {
                    // Authenticate the request using JWT
                    const user = await jwtAuthenticator.authenticateRequest(
                        contextValue.req, 
                        request.variables || {}
                    );
                    
                    // Add authenticated user to context
                    contextValue.user = user;
                    
                    logger.debug('Request authenticated successfully', {
                        publicKey: user.publicKey.substring(0, 8) + '...',
                        role: user.role,
                        operation: request.operationName || 'anonymous'
                    });
                    
                } catch (error) {
                    // Log authentication failure
                    logger.warn('GraphQL authentication failed', {
                        error: error.message,
                        operation: request.operationName || 'anonymous',
                        ip: contextValue.req.ip,
                        userAgent: contextValue.req.get('User-Agent')
                    });
                    
                    // Throw the error to stop execution
                    throw error;
                }
            }
        };
    }
};

export const gServer = (app) => {
    const httpServer = http.createServer(app);
    
    return new ApolloServer({
        typeDefs,
        resolvers,
        introspection: process.env.NODE_ENV !== 'production',
        formatError: errorHandler,
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            authenticationPlugin, // Add authentication plugin
            performancePlugin,
            ...(process.env.NODE_ENV === 'development' 
                ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
                : []
            )
        ],
        // Enable query complexity analysis
        validationRules: [], // Add custom validation rules if needed
        // Cache control
        cache: process.env.NODE_ENV === 'production' ? 'bounded' : undefined,
        // Context function - now enhanced with authentication
        context: async ({ req, res }) => {
            return {
                req,
                res,
                user: null, // Will be populated by authentication plugin
                requestId: Math.random().toString(36).substring(7),
                startTime: Date.now(),
                // Helper methods for resolvers
                requireAuth: () => {
                    if (!req.user || !req.user.isAuthenticated) {
                        throw new AuthenticationError('Authentication required for this operation');
                    }
                    return req.user;
                },
                requireAdmin: () => {
                    const user = req.user;
                    if (!user || !user.isAuthenticated) {
                        throw new AuthenticationError('Authentication required for this operation');
                    }
                    if (!jwtAuthenticator.isAdmin(user)) {
                        throw new AuthorizationError('Admin privileges required for this operation');
                    }
                    return user;
                },
                requireOwnership: (resourcePublicKey) => {
                    const user = req.user;
                    if (!user || !user.isAuthenticated) {
                        throw new AuthenticationError('Authentication required for this operation');
                    }
                    if (!jwtAuthenticator.canAccessResource(user, resourcePublicKey)) {
                        throw new AuthorizationError('Insufficient permissions to access this resource');
                    }
                    return user;
                }
            };
        }
    });
};