import { PubSub } from 'graphql-subscriptions';
import { AnalyticsModel } from '../modals/index.js';
import { AnalyticsHelper } from '../helpers/index.js';
import { logger, resolverErrorHandler } from '../core/index.js';

const pubsub = new PubSub();

export const analyticsResolvers = {
    Query: {
        getMailAnalytics: resolverErrorHandler(async (_, args) => {
            logger.info('getMailAnalytics called', args);
            
            const { startDate, endDate, includeBreakdown } = args;
            
            return await AnalyticsHelper.getMailAnalytics(startDate, endDate, { includeBreakdown });
        }),

        getTimeSeriesData: resolverErrorHandler(async (_, args) => {
            logger.info('getTimeSeriesData called', args);
            
            const { timeframe, limit } = args;
            
            return await AnalyticsHelper.getTimeSeriesData(timeframe.toLowerCase(), limit);
        }),

        getNetworkAnalysis: resolverErrorHandler(async (_, args) => {
            logger.info('getNetworkAnalysis called', args);
            
            const { limit, minInteractions } = args;
            
            return await AnalyticsHelper.getNetworkAnalysis({ limit, minInteractions });
        }),

        getLeaderboards: resolverErrorHandler(async (_, args) => {
            logger.info('getLeaderboards called', args);
            
            const { category, limit, timeframe } = args;
            
            return await AnalyticsHelper.getLeaderboards(
                category?.toLowerCase() || 'all', 
                limit, 
                timeframe?.toLowerCase()
            );
        }),

        getTopSenders: resolverErrorHandler(async (_, args) => {
            logger.info('getTopSenders called', args);
            
            const { limit, startDate, endDate } = args;
            
            return await AnalyticsModel.getTopSenders(limit, startDate, endDate);
        }),

        getTopReceivers: resolverErrorHandler(async (_, args) => {
            logger.info('getTopReceivers called', args);
            
            const { limit, startDate, endDate } = args;
            
            return await AnalyticsModel.getTopReceivers(limit, startDate, endDate);
        })
    },

    Subscription: {
        analyticsUpdated: {
            subscribe: () => {
                logger.info('analyticsUpdated subscription started');
                return pubsub.asyncIterator(['ANALYTICS_UPDATED']);
            }
        }
    }
};