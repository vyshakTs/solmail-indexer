import { AnalyticsModel } from '../modals/index.js';
import { cacheManager, logger, ValidationError } from '../core/index.js';


// Cache TTL for analytics (longer since they're less real-time)
const ANALYTICS_CACHE_TTL = {
    OVERVIEW: 300000,      // 5 minutes for overview stats
    TOP_USERS: 600000,     // 10 minutes for top users
    TIME_SERIES: 900000,   // 15 minutes for time series data
    NETWORK: 1200000       // 20 minutes for network analysis
};

export class AnalyticsHelper {
    // Get comprehensive mail analytics with intelligent caching
    static async getMailAnalytics(startDate = null, endDate = null, options = {}) {
        const { useCache = true, includeBreakdown = true } = options;
        const cacheKey = cacheManager.generateKey('analytics_overview', 
            startDate || 'all', endDate || 'all', includeBreakdown);

        try {
            // Validate date range
            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                throw new ValidationError('Start date must be before end date');
            }

            // Try cache first
            if (useCache) {
                const cachedData = await cacheManager.get(cacheKey);
                if (cachedData) {
                    logger.debug('Analytics served from cache', { startDate, endDate });
                    return cachedData;
                }
            }

            // Fetch base analytics
            const [
                baseAnalytics,
                topSenders,
                topReceivers,
                mailActivity,
                engagementMetrics
            ] = await Promise.all([
                AnalyticsModel.getMailAnalytics(startDate, endDate),
                AnalyticsModel.getTopSenders(10, startDate, endDate),
                AnalyticsModel.getTopReceivers(10, startDate, endDate),
                includeBreakdown ? AnalyticsModel.getMailActivity('day', 30) : Promise.resolve([]),
                AnalyticsModel.getUserEngagementMetrics()
            ]);

            // Enhanced analytics with computed metrics
            const result = {
                ...baseAnalytics,
                topSenders,
                topReceivers,
                engagementMetrics,
                ...(includeBreakdown && { 
                    dailyActivity: mailActivity,
                    trends: this.calculateTrends(mailActivity)
                }),
                // Computed fields
                growthRate: this.calculateGrowthRate(mailActivity),
                activeUserPercentage: engagementMetrics.totalUsers > 0 
                    ? ((engagementMetrics.activeUsers / engagementMetrics.totalUsers) * 100).toFixed(2)
                    : 0,
                // Meta information
                generatedAt: new Date().toISOString(),
                dateRange: {
                    startDate,
                    endDate,
                    isCustomRange: !!(startDate && endDate)
                }
            };

            // Cache the result
            if (useCache) {
                await cacheManager.set(cacheKey, result, ANALYTICS_CACHE_TTL.OVERVIEW);
            }

            logger.info('Analytics computed', { 
                totalMails: result.totalMails,
                totalUsers: result.totalUsers,
                dateRange: !!startDate 
            });

            return result;
        } catch (error) {
            logger.error('Error computing analytics:', error);
            throw error;
        }
    }

    // Get time-series data for charts
    static async getTimeSeriesData(timeframe = 'day', limit = 30, options = {}) {
        const { useCache = true } = options;
        const cacheKey = cacheManager.generateKey('time_series', timeframe, limit);

        try {
            // Validate timeframe
            if (!['hour', 'day', 'week', 'month'].includes(timeframe)) {
                throw new ValidationError('Invalid timeframe. Must be one of: hour, day, week, month');
            }

            // Try cache first
            if (useCache) {
                const cachedData = await cacheManager.get(cacheKey);
                if (cachedData) {
                    logger.debug('Time series data served from cache', { timeframe, limit });
                    return cachedData;
                }
            }

            // Fetch time series data
            const rawData = await AnalyticsModel.getMailActivity(timeframe, limit);

            // Process and enhance the data
            const processedData = rawData.map((item, index) => ({
                ...item,
                // Add moving averages for trend analysis
                movingAverage: this.calculateMovingAverage(rawData, index, 7), // 7-period MA
                growthRate: index > 0 ? this.calculatePeriodGrowthRate(rawData[index - 1], item) : 0,
                // Format period for different timeframes
                formattedPeriod: this.formatPeriod(item.period, timeframe)
            }));

            const result = {
                timeframe,
                data: processedData.reverse(), // Most recent first
                summary: {
                    totalPeriods: processedData.length,
                    totalMails: processedData.reduce((sum, item) => sum + item.mailCount, 0),
                    averagePerPeriod: processedData.length > 0 
                        ? (processedData.reduce((sum, item) => sum + item.mailCount, 0) / processedData.length).toFixed(2)
                        : 0,
                    peakPeriod: processedData.reduce((max, item) => 
                        item.mailCount > max.mailCount ? item : max, 
                        { mailCount: 0, period: null }
                    )
                },
                generatedAt: new Date().toISOString()
            };

            // Cache the result
            if (useCache) {
                await cacheManager.set(cacheKey, result, ANALYTICS_CACHE_TTL.TIME_SERIES);
            }

            logger.info('Time series data computed', { 
                timeframe, 
                periods: result.data.length,
                totalMails: result.summary.totalMails 
            });

            return result;
        } catch (error) {
            logger.error('Error computing time series data:', error);
            throw error;
        }
    }

    // Get network analysis data
    static async getNetworkAnalysis(options = {}) {
        const { limit = 50, useCache = true, minInteractions = 2 } = options;
        const cacheKey = cacheManager.generateKey('network_analysis', limit, minInteractions);

        try {
            // Try cache first
            if (useCache) {
                const cachedData = await cacheManager.get(cacheKey);
                if (cachedData) {
                    logger.debug('Network analysis served from cache');
                    return cachedData;
                }
            }

            // Fetch network data
            const connections = await AnalyticsModel.getNetworkAnalysis(limit);

            // Process network data
            const nodes = new Map();
            const edges = [];

            connections.forEach(conn => {
                // Add nodes
                if (!nodes.has(conn.fromAddress)) {
                    nodes.set(conn.fromAddress, {
                        id: conn.fromAddress,
                        label: this.truncateAddress(conn.fromAddress),
                        type: 'user',
                        outgoingConnections: 0,
                        incomingConnections: 0,
                        totalMessages: 0
                    });
                }
                
                if (!nodes.has(conn.toAddress)) {
                    nodes.set(conn.toAddress, {
                        id: conn.toAddress,
                        label: this.truncateAddress(conn.toAddress),
                        type: 'user',
                        outgoingConnections: 0,
                        incomingConnections: 0,
                        totalMessages: 0
                    });
                }

                // Update node stats
                const fromNode = nodes.get(conn.fromAddress);
                const toNode = nodes.get(conn.toAddress);
                
                fromNode.outgoingConnections++;
                fromNode.totalMessages += conn.messageCount;
                toNode.incomingConnections++;
                toNode.totalMessages += conn.messageCount;

                // Add edge
                edges.push({
                    from: conn.fromAddress,
                    to: conn.toAddress,
                    weight: conn.messageCount,
                    label: `${conn.messageCount} messages`,
                    firstInteraction: conn.firstInteraction,
                    lastInteraction: conn.lastInteraction
                });
            });

            // Convert nodes map to array and add centrality metrics
            const nodeArray = Array.from(nodes.values()).map(node => ({
                ...node,
                degree: node.incomingConnections + node.outgoingConnections,
                // Simple centrality measure (could be enhanced with PageRank, etc.)
                centrality: (node.totalMessages / Math.max(1, node.degree)).toFixed(2)
            }));

            const result = {
                nodes: nodeArray,
                edges,
                stats: {
                    totalNodes: nodeArray.length,
                    totalEdges: edges.length,
                    averageDegree: nodeArray.length > 0 
                        ? (nodeArray.reduce((sum, node) => sum + node.degree, 0) / nodeArray.length).toFixed(2)
                        : 0,
                    mostConnectedUser: nodeArray.reduce((max, node) => 
                        node.degree > max.degree ? node : max, 
                        { degree: 0 }
                    ),
                    mostActiveUser: nodeArray.reduce((max, node) => 
                        node.totalMessages > max.totalMessages ? node : max, 
                        { totalMessages: 0 }
                    )
                },
                generatedAt: new Date().toISOString()
            };

            // Cache the result
            if (useCache) {
                await cacheManager.set(cacheKey, result, ANALYTICS_CACHE_TTL.NETWORK);
            }

            logger.info('Network analysis computed', { 
                nodes: result.stats.totalNodes,
                edges: result.stats.totalEdges 
            });

            return result;
        } catch (error) {
            logger.error('Error computing network analysis:', error);
            throw error;
        }
    }

    // Get leaderboard data
    static async getLeaderboards(category = 'all', limit = 20, timeframe = null) {
        const cacheKey = cacheManager.generateKey('leaderboards', category, limit, timeframe || 'all');

        try {
            // Try cache first
            const cachedData = await cacheManager.get(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            let startDate = null;
            let endDate = null;

            // Calculate date range based on timeframe
            if (timeframe) {
                endDate = new Date();
                switch (timeframe) {
                    case 'today':
                        startDate = new Date();
                        startDate.setHours(0, 0, 0, 0);
                        break;
                    case 'week':
                        startDate = new Date();
                        startDate.setDate(startDate.getDate() - 7);
                        break;
                    case 'month':
                        startDate = new Date();
                        startDate.setMonth(startDate.getMonth() - 1);
                        break;
                }
            }

            const [topSenders, topReceivers] = await Promise.all([
                AnalyticsModel.getTopSenders(limit, startDate, endDate),
                AnalyticsModel.getTopReceivers(limit, startDate, endDate)
            ]);

            const result = {
                topSenders: topSenders.map((user, index) => ({
                    ...user,
                    rank: index + 1,
                    displayAddress: this.truncateAddress(user.address)
                })),
                topReceivers: topReceivers.map((user, index) => ({
                    ...user,
                    rank: index + 1,
                    displayAddress: this.truncateAddress(user.address)
                })),
                timeframe: timeframe || 'all-time',
                generatedAt: new Date().toISOString()
            };

            // Cache for 10 minutes
            await cacheManager.set(cacheKey, result, ANALYTICS_CACHE_TTL.TOP_USERS);

            return result;
        } catch (error) {
            logger.error('Error computing leaderboards:', error);
            throw error;
        }
    }

    // Utility methods
    static calculateTrends(timeSeriesData) {
        if (!timeSeriesData || timeSeriesData.length < 2) {
            return { direction: 'stable', percentage: 0 };
        }

        const recent = timeSeriesData.slice(-7); // Last 7 periods
        const previous = timeSeriesData.slice(-14, -7); // Previous 7 periods

        if (previous.length === 0) {
            return { direction: 'stable', percentage: 0 };
        }

        const recentAvg = recent.reduce((sum, item) => sum + item.mailCount, 0) / recent.length;
        const previousAvg = previous.reduce((sum, item) => sum + item.mailCount, 0) / previous.length;

        const changePercentage = previousAvg > 0 
            ? ((recentAvg - previousAvg) / previousAvg * 100).toFixed(2)
            : 0;

        return {
            direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
            percentage: Math.abs(changePercentage),
            recentAverage: recentAvg.toFixed(2),
            previousAverage: previousAvg.toFixed(2)
        };
    }

    static calculateGrowthRate(timeSeriesData) {
        if (!timeSeriesData || timeSeriesData.length < 2) return 0;

        const firstPeriod = timeSeriesData[timeSeriesData.length - 1];
        const lastPeriod = timeSeriesData[0];

        if (firstPeriod.mailCount === 0) return 0;

        return (((lastPeriod.mailCount - firstPeriod.mailCount) / firstPeriod.mailCount) * 100).toFixed(2);
    }

    static calculateMovingAverage(data, currentIndex, periods) {
        const start = Math.max(0, currentIndex - periods + 1);
        const subset = data.slice(start, currentIndex + 1);
        const sum = subset.reduce((acc, item) => acc + item.mailCount, 0);
        return (sum / subset.length).toFixed(2);
    }

    static calculatePeriodGrowthRate(previousPeriod, currentPeriod) {
        if (!previousPeriod || previousPeriod.mailCount === 0) return 0;
        return (((currentPeriod.mailCount - previousPeriod.mailCount) / previousPeriod.mailCount) * 100).toFixed(2);
    }

    static formatPeriod(period, timeframe) {
        const date = new Date(period);
        
        switch (timeframe) {
            case 'hour':
                return date.toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit',
                    hour12: false 
                });
            case 'day':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'week':
                return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            case 'month':
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            default:
                return date.toLocaleDateString();
        }
    }

    static truncateAddress(address) {
        if (!address || address.length <= 12) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Cache invalidation
    static async invalidateAnalyticsCache() {
        try {
            await cacheManager.invalidateAnalyticsCache();
            logger.info('Analytics cache invalidated');
        } catch (error) {
            logger.error('Error invalidating analytics cache:', error);
        }
    }
}