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

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbStatus = await dbHealthCheck();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbStatus ? 'connected' : 'disconnected',
            version: process.env.npm_package_version || '1.0.0'
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

// Initialize Apollo Server
const server = gServer(app);
await server.start();

// Apply GraphQL middleware
app.use('/graphql', expressMiddleware(server, {
    context: async ({ req, res }) => ({
        req,
        res,
        user: req.user || null,
        requestId: Math.random().toString(36).substring(7)
    })
}));

// Handle non-GraphQL requests to /graphql
app.all('/graphql', (req, res) => {
    logger.warn(`Invalid ${req.method} request to /graphql`);
    res.status(405).json({ 
        errors: [{ message: "Method not allowed. Use POST for GraphQL queries." }] 
    });
});

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    logger.warn(`404 - ${req.method} ${req.path}`);
    res.status(404).json({ 
        errors: [{ message: "Resource not found" }] 
    });
});

const PORT = process.env.PORT || 3030;

app.listen(PORT, () => { 
    logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});