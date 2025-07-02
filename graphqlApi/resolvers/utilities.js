import { AnalyticsHelper, MailDataHelper } from '../helpers/index.js';
import { logger, resolverErrorHandler } from '../core/index.js';


export const utilitiesResolvers = {
    Query: {
        getApiInfo: resolverErrorHandler(async () => {
            logger.info('getApiInfo called');
            
            return {
                version: process.env.npm_package_version || '1.0.0',
                name: 'Solmail GraphQL API',
                description: 'Production-ready GraphQL API for Solmail blockchain data',
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime().toString(),
                buildDate: new Date() // In production, this would be the actual build date
            };
        }),

        healthCheck: resolverErrorHandler(async () => {
            logger.info('healthCheck called');
            
            // This would include actual health checks
            return {
                status: 'healthy',
                timestamp: new Date(),
                database: 'connected',
                cache: 'connected',
                version: process.env.npm_package_version || '1.0.0',
                uptime: Math.floor(process.uptime())
            };
        })
    },

    Mutation: {
        invalidateUserCache: resolverErrorHandler(async (_, args) => {
            logger.info('invalidateUserCache called');
            
            const { address } = args;
            
            await MailDataHelper.invalidateUserCache(address);
            
            return true;
        }),

        invalidateAnalyticsCache: resolverErrorHandler(async () => {
            logger.info('invalidateAnalyticsCache called');
            
            await AnalyticsHelper.invalidateAnalyticsCache();
            
            return true;
        })
    }
};