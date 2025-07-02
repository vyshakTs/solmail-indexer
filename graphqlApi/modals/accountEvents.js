import { query } from '../core/index.js';
import { logger, logQuery, handleDatabaseError } from '../core/index.js';


// ================== ACCOUNT EVENT modals ==================

// Base class already defined in mailEvents.js, importing it here
class BaseMailEventModel {
    static async findAll(tableName, filters = {}, options = {}) {
        const { limit = 20, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
        const start = Date.now();
        
        try {
            let queryText = `
                SELECT *, 
                       EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                FROM ${tableName} 
                WHERE 1=1
            `;
            
            const params = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    queryText += ` AND ${key} = $${paramIndex++}`;
                    params.push(value);
                }
            }

            queryText += ` ORDER BY ${orderBy} ${orderDirection} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, offset);

            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return result.rows.map(row => this.mapRowToObject(row));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery(queryText, params, duration, error);
            handleDatabaseError(error, `findAll ${tableName}`);
        }
    }

    static mapRowToObject(row) {
        return row;
    }
}

// Mail Account V2 Register Event Model
export class MailAccountV2RegisterEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_account_v2_register_event', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            owner: row.owner,
            account: row.account,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Mail Account V2 Update Event Model
export class MailAccountV2UpdateEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_account_v2_update_event', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            owner: row.owner,
            account: row.account,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// ================== ANALYTICS MODEL ==================

export class AnalyticsModel {
    // Get comprehensive mail analytics
    static async getMailAnalytics(startDate, endDate) {
        const start = Date.now();
        
        try {
            const dateFilter = startDate && endDate 
                ? 'WHERE created_at BETWEEN $1 AND $2' 
                : '';
            const params = startDate && endDate ? [startDate, endDate] : [];

            // Run multiple analytics queries in parallel
            const [
                totalMailsResult,
                totalUsersResult,
                mailsTodayResult,
                mailsThisWeekResult,
                mailsThisMonthResult,
                dailyStatsResult
            ] = await Promise.all([
                // Total mails
                query(`
                    SELECT COUNT(*) as total
                    FROM mail_v2_update_event
                    ${dateFilter}
                `, params),

                // Total unique users (senders + receivers)
                query(`
                    SELECT COUNT(DISTINCT combined_address) as total
                    FROM (
                        SELECT from_address as combined_address FROM mail_v2_update_event ${dateFilter}
                        UNION
                        SELECT to_address as combined_address FROM mail_v2_update_event ${dateFilter}
                    ) AS unique_addresses
                `, params),

                // Mails today
                query(`
                    SELECT COUNT(*) as total
                    FROM mail_v2_update_event
                    WHERE DATE(created_at) = CURRENT_DATE
                `),

                // Mails this week
                query(`
                    SELECT COUNT(*) as total
                    FROM mail_v2_update_event
                    WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
                `),

                // Mails this month
                query(`
                    SELECT COUNT(*) as total
                    FROM mail_v2_update_event
                    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
                `),

                // Daily stats for average calculation
                query(`
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as daily_count
                    FROM mail_v2_update_event
                    ${dateFilter}
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                    LIMIT 30
                `, params)
            ]);

            const duration = Date.now() - start;
            logQuery('Analytics queries (parallel)', params, duration);

            const totalMails = parseInt(totalMailsResult.rows[0].total);
            const totalUsers = parseInt(totalUsersResult.rows[0].total);
            const mailsToday = parseInt(mailsTodayResult.rows[0].total);
            const mailsThisWeek = parseInt(mailsThisWeekResult.rows[0].total);
            const mailsThisMonth = parseInt(mailsThisMonthResult.rows[0].total);
            
            // Calculate average mails per day
            const dailyStats = dailyStatsResult.rows;
            const avgMailsPerDay = dailyStats.length > 0 
                ? dailyStats.reduce((sum, day) => sum + parseInt(day.daily_count), 0) / dailyStats.length
                : 0;

            return {
                totalMails,
                totalUsers,
                mailsToday,
                mailsThisWeek,
                mailsThisMonth,
                avgMailsPerDay: parseFloat(avgMailsPerDay.toFixed(2)),
                dailyBreakdown: dailyStats.map(day => ({
                    date: day.date,
                    count: parseInt(day.daily_count)
                }))
            };
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('Analytics queries', params, duration, error);
            handleDatabaseError(error, 'getMailAnalytics');
        }
    }

    // Get top senders
    static async getTopSenders(limit = 10, startDate = null, endDate = null) {
        const start = Date.now();
        
        try {
            const dateFilter = startDate && endDate 
                ? 'WHERE created_at BETWEEN $2 AND $3' 
                : '';
            const params = [limit];
            if (startDate && endDate) {
                params.push(startDate, endDate);
            }

            const queryText = `
                SELECT 
                    from_address as address, 
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
                    MIN(created_at) as first_mail,
                    MAX(created_at) as last_mail
                FROM mail_v2_update_event
                ${dateFilter}
                GROUP BY from_address
                HAVING COUNT(*) > 0
                ORDER BY count DESC
                LIMIT $1
            `;
            
            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return result.rows.map(row => ({
                address: row.address,
                count: parseInt(row.count),
                percentage: parseFloat(row.percentage),
                firstMail: row.first_mail,
                lastMail: row.last_mail
            }));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getTopSenders', params, duration, error);
            handleDatabaseError(error, 'getTopSenders');
        }
    }

    // Get top receivers
    static async getTopReceivers(limit = 10, startDate = null, endDate = null) {
        const start = Date.now();
        
        try {
            const dateFilter = startDate && endDate 
                ? 'WHERE created_at BETWEEN $2 AND $3' 
                : '';
            const params = [limit];
            if (startDate && endDate) {
                params.push(startDate, endDate);
            }

            const queryText = `
                SELECT 
                    to_address as address, 
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
                    MIN(created_at) as first_mail,
                    MAX(created_at) as last_mail
                FROM mail_v2_update_event
                ${dateFilter}
                GROUP BY to_address
                HAVING COUNT(*) > 0
                ORDER BY count DESC
                LIMIT $1
            `;
            
            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return result.rows.map(row => ({
                address: row.address,
                count: parseInt(row.count),
                percentage: parseFloat(row.percentage),
                firstMail: row.first_mail,
                lastMail: row.last_mail
            }));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getTopReceivers', params, duration, error);
            handleDatabaseError(error, 'getTopReceivers');
        }
    }

    // Get mail activity over time (hourly/daily breakdown)
    static async getMailActivity(timeframe = 'day', limit = 30) {
        const start = Date.now();
        
        try {
            let dateFormat, interval;
            
            switch (timeframe) {
                case 'hour':
                    dateFormat = "DATE_TRUNC('hour', created_at)";
                    interval = '24 hours';
                    break;
                case 'day':
                    dateFormat = "DATE_TRUNC('day', created_at)";
                    interval = '30 days';
                    break;
                case 'week':
                    dateFormat = "DATE_TRUNC('week', created_at)";
                    interval = '12 weeks';
                    break;
                case 'month':
                    dateFormat = "DATE_TRUNC('month', created_at)";
                    interval = '12 months';
                    break;
                default:
                    dateFormat = "DATE_TRUNC('day', created_at)";
                    interval = '30 days';
            }

            const queryText = `
                SELECT 
                    ${dateFormat} as period,
                    COUNT(*) as mail_count,
                    COUNT(DISTINCT from_address) as unique_senders,
                    COUNT(DISTINCT to_address) as unique_receivers
                FROM mail_v2_update_event
                WHERE created_at >= NOW() - INTERVAL '${interval}'
                GROUP BY ${dateFormat}
                ORDER BY period DESC
                LIMIT $1
            `;
            
            const result = await query(queryText, [limit]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [limit], duration);
            
            return result.rows.map(row => ({
                period: row.period,
                mailCount: parseInt(row.mail_count),
                uniqueSenders: parseInt(row.unique_senders),
                uniqueReceivers: parseInt(row.unique_receivers)
            }));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getMailActivity', [timeframe, limit], duration, error);
            handleDatabaseError(error, 'getMailActivity');
        }
    }

    // Get user engagement metrics
    static async getUserEngagementMetrics() {
        const start = Date.now();
        
        try {
            const queryText = `
                WITH user_stats AS (
                    SELECT 
                        from_address as address,
                        COUNT(*) as sent_count,
                        0 as received_count
                    FROM mail_v2_update_event
                    GROUP BY from_address
                    
                    UNION ALL
                    
                    SELECT 
                        to_address as address,
                        0 as sent_count,
                        COUNT(*) as received_count
                    FROM mail_v2_update_event
                    GROUP BY to_address
                ),
                aggregated_stats AS (
                    SELECT 
                        address,
                        SUM(sent_count) as total_sent,
                        SUM(received_count) as total_received,
                        SUM(sent_count) + SUM(received_count) as total_activity
                    FROM user_stats
                    GROUP BY address
                )
                SELECT 
                    COUNT(*) as total_users,
                    AVG(total_activity) as avg_activity_per_user,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_activity) as median_activity,
                    COUNT(CASE WHEN total_activity >= 10 THEN 1 END) as active_users,
                    COUNT(CASE WHEN total_activity >= 50 THEN 1 END) as power_users
                FROM aggregated_stats
            `;
            
            const result = await query(queryText);
            const duration = Date.now() - start;
            
            logQuery(queryText, [], duration);
            
            const row = result.rows[0];
            return {
                totalUsers: parseInt(row.total_users),
                avgActivityPerUser: parseFloat(row.avg_activity_per_user || 0).toFixed(2),
                medianActivity: parseFloat(row.median_activity || 0),
                activeUsers: parseInt(row.active_users || 0), // 10+ activities
                powerUsers: parseInt(row.power_users || 0)    // 50+ activities
            };
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getUserEngagementMetrics', [], duration, error);
            handleDatabaseError(error, 'getUserEngagementMetrics');
        }
    }

    // Get network analysis (who talks to whom)
    static async getNetworkAnalysis(limit = 20) {
        const start = Date.now();
        
        try {
            const queryText = `
                SELECT 
                    from_address,
                    to_address,
                    COUNT(*) as message_count,
                    MIN(created_at) as first_interaction,
                    MAX(created_at) as last_interaction
                FROM mail_v2_update_event
                WHERE from_address != to_address -- Exclude self-messages
                GROUP BY from_address, to_address
                HAVING COUNT(*) >= 2 -- Only show relationships with 2+ messages
                ORDER BY message_count DESC
                LIMIT $1
            `;
            
            const result = await query(queryText, [limit]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [limit], duration);
            
            return result.rows.map(row => ({
                fromAddress: row.from_address,
                toAddress: row.to_address,
                messageCount: parseInt(row.message_count),
                firstInteraction: row.first_interaction,
                lastInteraction: row.last_interaction
            }));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getNetworkAnalysis', [limit], duration, error);
            handleDatabaseError(error, 'getNetworkAnalysis');
        }
    }
}