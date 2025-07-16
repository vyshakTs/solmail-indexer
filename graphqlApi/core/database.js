import pkg from 'pg';
import { logger } from './logger.js';

const { Pool } = pkg;

// Database configuration optimized for Neon + AWS Server deployment
const dbConfig = {
    // For Neon, you can use either individual params or connection string
    host: process.env.DB_HOST || 'your-project.aws.neon.tech',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'neondb',
    user: process.env.DB_USER || 'your-username',
    password: process.env.DB_PASSWORD || 'your-password',
    
    // REQUIRED SSL configuration for Neon
    ssl: {
        rejectUnauthorized: false,
        // Neon requires SSL connections
        require: true,
        // Add channel binding if specified in env
        ...(process.env.DB_CHANNELBINDING === 'require' && { 
            channelBinding: 'require' 
        })
    },
    
    // Connection pool settings - optimized for GraphQL API on AWS server
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20, // Higher for concurrent GraphQL requests
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // Keep connections alive longer
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // Account for AWS <-> Neon network
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 15000, // Account for network latency
    application_name: 'solmail_graphql_api',
    
    // Recommended: Use connection string for Neon
    connectionString: process.env.DATABASE_URL,
};

let pool;

// Initialize database pool
export const getDbPool = () => {
    if (!pool) {
        pool = new Pool(dbConfig);
        
        // Pool event handlers
        pool.on('connect', (client) => {
            logger.info('New database client connected to Neon');
        });
        
        pool.on('error', (err, client) => {
            logger.error('Database pool error:', err);
            // Handle Neon-specific connection errors
            if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
                logger.warn('Network error, Neon may be scaling to zero');
            }
        });
        
        pool.on('remove', (client) => {
            logger.info('Database client removed');
        });
        
        logger.info('Database pool initialized for Neon', {
            host: dbConfig.host,
            database: dbConfig.database,
            maxConnections: dbConfig.max,
            ssl: 'enabled'
        });
    }
    return pool;
};

// Enhanced query wrapper with Neon-specific optimizations
export const query = async (text, params = [], options = {}) => {
    const pool = getDbPool();
    const start = Date.now();
    let client;
    
    try {
        // Account for potential cold start delays
        client = await pool.connect();
        
        // Set query timeout (higher for Neon due to network latency)
        const timeout = options.timeout || parseInt(process.env.DB_QUERY_TIMEOUT) || 15000;
        
        logger.debug('Executing query on Neon:', { 
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params?.length || 0,
            timeout: `${timeout}ms`
        });
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), timeout);
        });
        
        // Race between query and timeout
        const result = await Promise.race([
            client.query(text, params),
            timeoutPromise
        ]);
        
        const duration = Date.now() - start;
        
        // Adjust slow query threshold for Neon (network overhead)
        if (duration > 2000) {
            logger.warn('Slow query detected on Neon:', {
                query: text.substring(0, 200),
                duration: `${duration}ms`,
                rowCount: result.rowCount
            });
        }
        
        logger.debug('Query completed on Neon:', {
            duration: `${duration}ms`,
            rowCount: result.rowCount
        });
        
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        
        // Handle Neon-specific errors
        if (error.message.includes('connection') || error.code === 'ECONNRESET') {
            logger.warn('Neon connection issue (may be cold start):', {
                error: error.message,
                duration: `${duration}ms`
            });
        }
        
        logger.error('Query failed on Neon:', {
            query: text.substring(0, 200),
            error: error.message,
            duration: `${duration}ms`,
            params: params?.length || 0
        });
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Transaction wrapper with Neon considerations
export const transaction = async (callback) => {
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction failed on Neon:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Health check function with Neon-specific checks
export const dbHealthCheck = async () => {
    try {
        const start = Date.now();
        const result = await query('SELECT NOW() as timestamp, version() as version');
        const duration = Date.now() - start;
        
        return {
            status: 'healthy',
            timestamp: result.rows[0].timestamp,
            version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
            responseTime: `${duration}ms`,
            provider: 'Neon'
        };
    } catch (error) {
        logger.error('Neon database health check failed:', error);
        throw new Error(`Neon database connection failed: ${error.message}`);
    }
};

// Graceful shutdown - important for Neon connections
export const closeDbPool = async () => {
    if (pool) {
        logger.info('Closing Neon database pool...');
        await pool.end();
        pool = null;
        logger.info('Neon database pool closed');
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await closeDbPool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDbPool();
    process.exit(0);
});