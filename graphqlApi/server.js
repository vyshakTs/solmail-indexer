import "dotenv/config";
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import compression from 'compression';
import helmet from "helmet";
import express from 'express';

import { gServer, logger, errorHandler, rateLimiter, dbHealthCheck } from './core/index.js';


const app = express();

// CORS configuration
const corsOpts = { 
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"], 
    optionsSuccessStatus: 204,
    credentials: true
};

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(cors(corsOpts));
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// Rate limiting
app.use(rateLimiter(100, 60000)); // 100 requests per minute

// Custom headers
app.use((req, res, next) => { 
    res.setHeader('X-Powered-By', 'SolmailGraphQL'); 
    next();
});

// Health check endpoint (public, no authentication required)
app.get('/health', async (req, res) => {
    try {
        const dbStatus = await dbHealthCheck();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbStatus ? 'connected' : 'disconnected',
            version: process.env.npm_package_version || '1.0.0',
            authentication: 'enabled'
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Authentication status endpoint (public, for debugging)
app.get('/auth/status', (req, res) => {
    const authHeader = req.headers.authorization;
    
    res.json({
        hasAuthHeader: !!authHeader,
        authHeaderFormat: authHeader ? 
            (authHeader.startsWith('Bearer ') ? 'valid' : 'invalid') : 
            'missing',
        timestamp: new Date().toISOString(),
        message: 'JWT authentication is required for GraphQL operations'
    });
});

// Initialize Apollo Server
const server = gServer(app);
await server.start();

// Apply GraphQL middleware with JWT authentication context
app.use('/graphql', expressMiddleware(server, {
    context: async ({ req, res }) => {
        // Create base context
        const baseContext = {
            req,
            res,
            user: null, // Will be populated by authentication plugin
            requestId: Math.random().toString(36).substring(7),
            startTime: Date.now()
        };

        // The authentication will be handled by the Apollo Server authentication plugin
        // Context will be enhanced with user information during request processing
        return baseContext;
    }
}));

// Handle non-GraphQL requests to /graphql
app.all('/graphql', (req, res) => {
    logger.warn(`Invalid ${req.method} request to /graphql`);
    res.status(405).json({ 
        errors: [{ 
            message: "Method not allowed. Use POST for GraphQL queries.",
            extensions: {
                code: 'METHOD_NOT_ALLOWED'
            }
        }] 
    });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
    res.json({
        name: 'Solmail GraphQL API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        authentication: {
            type: 'JWT Bearer Token',
            header: 'Authorization: Bearer <token>',
            requirements: [
                'Valid JWT token signed with JWT_SECRET_KEY',
                'Token must contain publicKey and role fields',
                'publicKey in token must match publicKey in request variables',
                'Token must not be expired'
            ]
        },
        endpoints: {
            graphql: '/graphql',
            health: '/health',
            authStatus: '/auth/status',
            documentation: '/docs'
        },
        sampleRequests: {
            headers: {
                'Authorization': 'Bearer <your-jwt-token>',
                'Content-Type': 'application/json'
            },
            body: {
                query: 'query GetUserStats($userAddress: String!) { getUserStats(userAddress: $userAddress) { totalMailsSent totalMailsReceived } }',
                variables: {
                    userAddress: 'your-solana-public-key'
                }
            }
        }
    });
});

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    logger.warn(`404 - ${req.method} ${req.path}`);
    res.status(404).json({ 
        errors: [{ 
            message: "Resource not found",
            extensions: {
                code: 'NOT_FOUND',
                availableEndpoints: ['/graphql', '/health', '/auth/status', '/docs']
            }
        }] 
    });
});

const PORT = process.env.PORT || 3030;

app.listen(PORT, () => { 
    logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    logger.info(`🔐 JWT Authentication enabled - all GraphQL operations require valid tokens`);
    logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📚 API docs available at http://localhost:${PORT}/docs`);
    
    // Log authentication requirements
    logger.info('🔑 Authentication Requirements:');
    logger.info('  - Authorization header: Bearer <jwt-token>');
    logger.info('  - Token must contain: publicKey, role, exp');
    logger.info('  - publicKey in token must match publicKey in request variables');
    logger.info('  - JWT_SECRET_KEY must be configured in environment');
});