import pkg from 'pg';
import { logger } from './logger.js';

const { Pool } = pkg;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'solmail_indexer',
    user: process.env.DB_USER || 'cale',
    password: process.env.DB_PASSWORD || 'roan',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 10000,
    application_name: 'solmail_graphql_api'
};

let pool;

// Initialize database pool
export const getDbPool = () => {
    if (!pool) {
        pool = new Pool(dbConfig);
        
        // Pool event handlers
        pool.on('connect', (client) => {
            logger.info('New database client connected');
        });
        
        pool.on('error', (err, client) => {
            logger.error('Database pool error:', err);
            // Don't exit the process, let the application handle the error
        });
        
        pool.on('remove', (client) => {
            logger.info('Database client removed');
        });
        
        logger.info('Database pool initialized', {
            host: dbConfig.host,
            database: dbConfig.database,
            maxConnections: dbConfig.max
        });
    }
    return pool;
};

// Query wrapper with error handling and logging
export const query = async (text, params = []) => {
    const pool = getDbPool();
    const start = Date.now();
    const client = await pool.connect();
    
    try {
        logger.debug('Executing query:', { 
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params?.length || 0 
        });
        
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            logger.warn('Slow query detected:', {
                query: text.substring(0, 200),
                duration: `${duration}ms`,
                rowCount: result.rowCount
            });
        }
        
        logger.debug('Query completed:', {
            duration: `${duration}ms`,
            rowCount: result.rowCount
        });
        
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error('Query failed:', {
            query: text.substring(0, 200),
            error: error.message,
            duration: `${duration}ms`,
            params: params?.length || 0
        });
        throw error;
    } finally {
        client.release();
    }
};

// Transaction wrapper
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
        logger.error('Transaction failed:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Health check function
export const dbHealthCheck = async () => {
    try {
        const result = await query('SELECT NOW() as timestamp, version() as version');
        return {
            status: 'healthy',
            timestamp: result.rows[0].timestamp,
            version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
        };
    } catch (error) {
        logger.error('Database health check failed:', error);
        throw new Error('Database connection failed');
    }
};

// Graceful shutdown
export const closeDbPool = async () => {
    if (pool) {
        logger.info('Closing database pool...');
        await pool.end();
        pool = null;
        logger.info('Database pool closed');
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