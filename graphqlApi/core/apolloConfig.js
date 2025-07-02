import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import http from 'http';

import { typeDefs } from "../typedefs/index.js";
import { resolvers } from "../resolvers/index.js";
import { logger } from './logger.js';

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
                        executionTime: `${executionTime}ms`
                    });
                }
            },
            
            didResolveOperation(requestContext) {
                requestContext.contextValue.startTime = Date.now();
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
    });
};