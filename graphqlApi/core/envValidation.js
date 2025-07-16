import { logger } from './logger.js';

// Environment variable validation schema
const requiredEnvVars = {
    // Database configuration
    DB_HOST: {
        required: true,
        type: 'string',
        description: 'Database host'
    },
    DB_PORT: {
        required: false,
        type: 'number',
        default: 5432,
        description: 'Database port'
    },
    DB_NAME: {
        required: true,
        type: 'string',
        description: 'Database name'
    },
    DB_USER: {
        required: true,
        type: 'string',
        description: 'Database user'
    },
    DB_PASSWORD: {
        required: true,
        type: 'string',
        sensitive: true,
        description: 'Database password'
    },
    
    // Server configuration
    PORT: {
        required: false,
        type: 'number',
        default: 3030,
        description: 'Server port'
    },
    NODE_ENV: {
        required: false,
        type: 'string',
        default: 'development',
        enum: ['development', 'production', 'staging', 'test'],
        description: 'Node environment'
    },
    
    // Security configuration
    ALLOWED_ORIGINS: {
        required: false,
        type: 'string',
        default: 'http://localhost:3000',
        description: 'Comma-separated list of allowed CORS origins'
    },
    JWT_SECRET_KEY: {
        required: true,
        type: 'string',
        sensitive: true,
        minLength: 32,
        description: 'JWT secret key for token verification (minimum 32 characters)'
    },
    
    // Cache configuration
    REDIS_ENABLED: {
        required: false,
        type: 'boolean',
        default: false,
        description: 'Enable Redis caching'
    },
    REDIS_HOST: {
        required: false,
        type: 'string',
        default: 'localhost',
        description: 'Redis host'
    },
    REDIS_PORT: {
        required: false,
        type: 'number',
        default: 6379,
        description: 'Redis port'
    },
    REDIS_PASSWORD: {
        required: false,
        type: 'string',
        sensitive: true,
        description: 'Redis password'
    },
    REDIS_DB: {
        required: false,
        type: 'number',
        default: 0,
        description: 'Redis database number'
    },
    
    // Performance configuration
    DB_MAX_CONNECTIONS: {
        required: false,
        type: 'number',
        default: 20,
        description: 'Maximum database connections'
    },
    DB_IDLE_TIMEOUT: {
        required: false,
        type: 'number',
        default: 30000,
        description: 'Database idle timeout in ms'
    },
    DB_CONNECTION_TIMEOUT: {
        required: false,
        type: 'number',
        default: 2000,
        description: 'Database connection timeout in ms'
    },
    DB_QUERY_TIMEOUT: {
        required: false,
        type: 'number',
        default: 10000,
        description: 'Database query timeout in ms'
    },
    
    // Logging configuration
    LOG_LEVEL: {
        required: false,
        type: 'string',
        default: 'info',
        enum: ['error', 'warn', 'info', 'debug'],
        description: 'Logging level'
    },
    
    // Cache configuration
    CACHE_KEY_PREFIX: {
        required: false,
        type: 'string',
        default: 'solmail:',
        description: 'Cache key prefix'
    }
};

class EnvValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.config = {};
    }

    validate() {
        logger.info('🔍 Validating environment configuration...');
        
        // Check each required environment variable
        for (const [key, schema] of Object.entries(requiredEnvVars)) {
            this.validateEnvVar(key, schema);
        }

        // Check for unknown environment variables (optional warning)
        this.checkUnknownVars();

        // Report results
        this.reportResults();

        if (this.errors.length > 0) {
            logger.error('❌ Environment validation failed!');
            throw new Error(`Environment validation failed with ${this.errors.length} errors`);
        }

        logger.info('✅ Environment validation passed');
        return this.config;
    }

    validateEnvVar(key, schema) {
        const value = process.env[key];
        const { required, type, default: defaultValue, enum: enumValues, sensitive, minLength } = schema;

        // Check if required variable is missing
        if (required && (value === undefined || value === '')) {
            this.errors.push(`Missing required environment variable: ${key}`);
            return;
        }

        // Use default if not provided
        let finalValue = value !== undefined ? value : defaultValue;

        // Type conversion and validation
        if (finalValue !== undefined) {
            try {
                finalValue = this.convertType(finalValue, type, key);
            } catch (error) {
                this.errors.push(`Invalid type for ${key}: ${error.message}`);
                return;
            }

            // Enum validation
            if (enumValues && !enumValues.includes(finalValue)) {
                this.errors.push(`Invalid value for ${key}. Must be one of: ${enumValues.join(', ')}`);
                return;
            }

            // String length validation
            if (minLength && type === 'string' && finalValue.length < minLength) {
                this.errors.push(`${key} must be at least ${minLength} characters long`);
                return;
            }

            // Store in config
            this.config[key] = finalValue;

            // Log configuration (mask sensitive values)
            const displayValue = sensitive ? '***' : finalValue;
            logger.debug(`${key}: ${displayValue} (${type})`);
        }
    }

    convertType(value, type, key) {
        switch (type) {
            case 'string':
                return String(value);
            
            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    throw new Error(`Expected number for ${key}, got: ${value}`);
                }
                return num;
            
            case 'boolean':
                if (typeof value === 'boolean') return value;
                const lowerValue = String(value).toLowerCase();
                if (['true', '1', 'yes', 'on'].includes(lowerValue)) return true;
                if (['false', '0', 'no', 'off'].includes(lowerValue)) return false;
                throw new Error(`Expected boolean for ${key}, got: ${value}`);
            
            case 'array':
                if (Array.isArray(value)) return value;
                return String(value).split(',').map(item => item.trim());
            
            default:
                return value;
        }
    }

    checkUnknownVars() {
        const knownVars = new Set([
            ...Object.keys(requiredEnvVars),
            'npm_package_version',
            'npm_package_name',
            'npm_config_cache',
            'PATH',
            'HOME',
            'USER',
            'SHELL',
            'TERM',
            'PWD'
        ]);

        const unknownVars = Object.keys(process.env).filter(key => 
            key.startsWith('DB_') || 
            key.startsWith('REDIS_') || 
            key.startsWith('LOG_') ||
            key.startsWith('CACHE_') ||
            key.startsWith('JWT_') ||
            key === 'PORT' ||
            key === 'NODE_ENV'
        ).filter(key => !knownVars.has(key));

        if (unknownVars.length > 0) {
            this.warnings.push(`Unknown environment variables detected: ${unknownVars.join(', ')}`);
        }
    }

    reportResults() {
        // Report warnings
        if (this.warnings.length > 0) {
            logger.warn('⚠️ Environment warnings:');
            this.warnings.forEach(warning => logger.warn(`  - ${warning}`));
        }

        // Report errors
        if (this.errors.length > 0) {
            logger.error('❌ Environment errors:');
            this.errors.forEach(error => logger.error(`  - ${error}`));
        }

        // Report configuration summary
        logger.info('📋 Environment configuration summary:');
        logger.info(`  - Environment: ${this.config.NODE_ENV}`);
        logger.info(`  - Database: ${this.config.DB_HOST}:${this.config.DB_PORT}/${this.config.DB_NAME}`);
        logger.info(`  - Server port: ${this.config.PORT}`);
        logger.info(`  - Redis enabled: ${this.config.REDIS_ENABLED}`);
        logger.info(`  - Log level: ${this.config.LOG_LEVEL}`);
        logger.info(`  - Max DB connections: ${this.config.DB_MAX_CONNECTIONS}`);
        logger.info(`  - JWT authentication: enabled`);
    }

    // Generate environment file template
    static generateTemplate() {
        logger.info('📝 Generating .env template...');
        
        let template = '# Solmail GraphQL API Environment Configuration\n';
        template += '# Copy this file to .env and fill in the values\n\n';

        for (const [key, schema] of Object.entries(requiredEnvVars)) {
            const { required, description, default: defaultValue, type, enum: enumValues, minLength } = schema;
            
            template += `# ${description}\n`;
            if (enumValues) {
                template += `# Options: ${enumValues.join(', ')}\n`;
            }
            if (minLength) {
                template += `# Minimum length: ${minLength} characters\n`;
            }
            template += `# Type: ${type}${required ? ' (required)' : ' (optional)'}\n`;
            
            if (defaultValue !== undefined) {
                template += `${key}=${defaultValue}\n`;
            } else {
                template += `${key}=\n`;
            }
            template += '\n';
        }

        return template;
    }

    // Validate specific environment for deployment
    static validateForProduction() {
        const productionChecks = [
            {
                name: 'NODE_ENV is production',
                check: () => process.env.NODE_ENV === 'production',
                severity: 'error'
            },
            {
                name: 'JWT_SECRET_KEY is set and strong',
                check: () => process.env.JWT_SECRET_KEY && process.env.JWT_SECRET_KEY.length >= 32,
                severity: 'error'
            },
            {
                name: 'Database is not localhost',
                check: () => process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1',
                severity: 'warning'
            },
            {
                name: 'CORS origins are configured',
                check: () => process.env.ALLOWED_ORIGINS && !process.env.ALLOWED_ORIGINS.includes('localhost'),
                severity: 'warning'
            },
            {
                name: 'Redis is enabled for production',
                check: () => process.env.REDIS_ENABLED === 'true',
                severity: 'warning'
            },
            {
                name: 'JWT secret is production-grade',
                check: () => process.env.JWT_SECRET_KEY && process.env.JWT_SECRET_KEY.length >= 64,
                severity: 'warning'
            }
        ];

        const issues = [];

        productionChecks.forEach(({ name, check, severity }) => {
            if (!check()) {
                issues.push({ name, severity });
            }
        });

        if (issues.length > 0) {
            logger.warn('🚨 Production readiness checks:');
            issues.forEach(({ name, severity }) => {
                const emoji = severity === 'error' ? '❌' : '⚠️';
                logger[severity](`  ${emoji} ${name}`);
            });

            const errors = issues.filter(issue => issue.severity === 'error');
            if (errors.length > 0) {
                throw new Error(`Production validation failed with ${errors.length} critical issues`);
            }
        } else {
            logger.info('✅ Production readiness checks passed');
        }
    }
}

// Export validation functions
export function validateEnvironment() {
    const validator = new EnvValidator();
    return validator.validate();
}

export function generateEnvTemplate() {
    return EnvValidator.generateTemplate();
}

export function validateForProduction() {
    return EnvValidator.validateForProduction();
}

// Auto-validate on import in non-test environments
if (process.env.NODE_ENV !== 'test') {
    try {
        validateEnvironment();
        
        // Additional production checks if in production
        if (process.env.NODE_ENV === 'production') {
            validateForProduction();
        }
    } catch (error) {
        logger.error('Environment validation failed on startup:', error.message);
        process.exit(1);
    }
}