import winston from 'winston';

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Development format (more readable)
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += '\n' + JSON.stringify(meta, null, 2);
        }
        return msg;
    })
);

// Create transports based on environment
const transports = [
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : devFormat,
        level: process.env.LOG_LEVEL || 'info'
    })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
}

// Create logger instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { 
        service: 'solmail-graphql-api',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports,
    // Don't exit on handled exceptions
    exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
    logger.exceptions.handle(
        new winston.transports.File({ filename: 'logs/exceptions.log' })
    );
    
    logger.rejections.handle(
        new winston.transports.File({ filename: 'logs/rejections.log' })
    );
}

// Add request logging utility
export const logRequest = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        });
    });
    
    next();
};

// Performance logging helper
export const logPerformance = (operation, startTime, metadata = {}) => {
    const duration = Date.now() - startTime;
    const level = duration > 1000 ? 'warn' : 'info';
    
    logger[level]('Performance', {
        operation,
        duration: `${duration}ms`,
        ...metadata
    });
};

// Database query logging helper
export const logQuery = (query, params, duration, error = null) => {
    const logData = {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        paramCount: params?.length || 0,
        duration: `${duration}ms`
    };
    
    if (error) {
        logger.error('Database Query Failed', { ...logData, error: error.message });
    } else if (duration > 1000) {
        logger.warn('Slow Database Query', logData);
    } else {
        logger.debug('Database Query', logData);
    }
};

// GraphQL operation logging helper
export const logGraphQLOperation = (operationName, query, variables, duration, error = null) => {
    const logData = {
        operation: operationName || 'anonymous',
        query: query?.substring(0, 200) + (query?.length > 200 ? '...' : ''),
        variableCount: Object.keys(variables || {}).length,
        duration: `${duration}ms`
    };
    
    if (error) {
        logger.error('GraphQL Operation Failed', { ...logData, error: error.message });
    } else if (duration > 1000) {
        logger.warn('Slow GraphQL Operation', logData);
    } else {
        logger.info('GraphQL Operation', logData);
    }
};

export default logger;