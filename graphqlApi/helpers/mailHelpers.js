import { 
    MailV2UpdateEventModel,
    MailV2SendEventModel,
    MailV2ReadEventModel,
    MailAccountV2RegisterEventModel,
    UserStatsModel
} from '../modals/index.js';
import { cacheManager, logger, ValidationError } from '../core/index.js';


// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
    MAIL_EVENTS: 60000,     // 1 minute for real-time data
    USER_MAILBOX: 180000,   // 3 minutes for mailbox
    USER_STATS: 300000,     // 5 minutes for user stats
    MAIL_THREAD: 600000     // 10 minutes for threads (less likely to change)
};

export class MailDataHelper {
    // Get paginated mail events with caching
    static async getMailEvents(filters = {}, options = {}) {
        const { limit = 20, offset = 0, useCache = true } = options;
        const cacheKey = cacheManager.generateKey('mail_events', 
            JSON.stringify(filters), limit, offset);
        
        try {
            // Try cache first
            if (useCache) {
                const cachedData = await cacheManager.get(cacheKey);
                if (cachedData) {
                    logger.debug('Mail events served from cache', { filters, limit, offset });
                    return cachedData;
                }
            }

            // Fetch from database
            const events = await MailV2UpdateEventModel.findAll(filters, options);
            const total = await MailV2UpdateEventModel.count(filters);
            
            const result = {
                events,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };

            // Cache the result
            if (useCache) {
                await cacheManager.set(cacheKey, result, CACHE_TTL.MAIL_EVENTS);
            }

            logger.info('Mail events fetched from database', { 
                count: events.length, 
                total, 
                filters: Object.keys(filters) 
            });

            return result;
        } catch (error) {
            logger.error('Error fetching mail events:', error);
            throw error;
        }
    }

    // Get user mailbox with optimized caching
    static async getUserMailbox(address, mailType = 'ALL', options = {}) {
        const { limit = 20, offset = 0, useCache = true } = options;
        const cacheKey = cacheManager.generateKey('user_mailbox', address, mailType, limit, offset);

        try {
            if (!address) {
                throw new ValidationError('Address is required');
            }

            // Try cache first
            if (useCache) {
                const cachedData = await cacheManager.get(cacheKey);
                if (cachedData) {
                    logger.debug('User mailbox served from cache', { address, mailType });
                    return cachedData;
                }
            }

            // Get mailbox data
            const mails = await UserStatsModel.getUserMailbox(address, mailType, limit, offset);
            
            // Get user stats for additional context
            const userStats = await this.getUserStats(address, { useCache });

            const result = {
                address,
                mails,
                stats: userStats,
                pagination: {
                    limit,
                    offset,
                    hasNext: mails.length === limit, // Simple check
                    hasPrev: offset > 0
                }
            };

            // Cache the result
            if (useCache) {
                await cacheManager.set(cacheKey, result, CACHE_TTL.USER_MAILBOX);
            }

            logger.info('User mailbox fetched', { 
                address: address.substring(0, 8) + '...', 
                mailType, 
                count: mails.length 
            });

            return result;
        } catch (error) {
            logger.error('Error fetching user mailbox:', error);
            throw error;
        }
    }

    // Get user statistics with caching
    static async getUserStats(address, options = {}) {
        const { useCache = true } = options;
        const cacheKey = cacheManager.generateKey('user_stats', address);

        try {
            if (!address) {
                throw new ValidationError('Address is required');
            }

            // Try cache first
            if (useCache) {
                const cachedStats = await cacheManager.get(cacheKey);
                if (cachedStats) {
                    logger.debug('User stats served from cache', { address });
                    return cachedStats;
                }
            }

            // Fetch from database
            const stats = await UserStatsModel.getUserStats(address);

            // Cache the result
            if (useCache) {
                await cacheManager.set(cacheKey, stats, CACHE_TTL.USER_STATS);
            }

            logger.info('User stats fetched', { 
                address: address.substring(0, 8) + '...', 
                totalSent: stats.totalSent,
                totalReceived: stats.totalReceived 
            });

            return stats;
        } catch (error) {
            logger.error('Error fetching user stats:', error);
            throw error;
        }
    }

    // Get mail thread with intelligent caching
    static async getMailThread(mailId, options = {}) {
        const { useCache = true } = options;
        const cacheKey = cacheManager.generateKey('mail_thread', mailId);

        try {
            if (!mailId) {
                throw new ValidationError('Mail ID is required');
            }

            // Try cache first
            if (useCache) {
                const cachedThread = await cacheManager.get(cacheKey);
                if (cachedThread) {
                    logger.debug('Mail thread served from cache', { mailId });
                    return cachedThread;
                }
            }

            // Fetch from database
            const thread = await UserStatsModel.getMailThread(mailId);

            if (!thread || thread.messages.length === 0) {
                throw new ValidationError('Mail thread not found');
            }

            // Cache the result (threads change less frequently)
            if (useCache) {
                await cacheManager.set(cacheKey, thread, CACHE_TTL.MAIL_THREAD);
            }

            logger.info('Mail thread fetched', { 
                mailId, 
                messageCount: thread.messageCount,
                participantCount: thread.participantCount 
            });

            return thread;
        } catch (error) {
            logger.error('Error fetching mail thread:', error);
            throw error;
        }
    }

    // Advanced search with filters
    static async searchMails(searchParams, options = {}) {
        const { 
            query: searchQuery, 
            fromAddress, 
            toAddress, 
            startDate, 
            endDate,
            isRead,
            hasAttachment 
        } = searchParams;
        
        const { limit = 20, offset = 0, useCache = false } = options; // Don't cache searches by default

        try {
            const filters = {};
            
            if (fromAddress) filters.from_address = fromAddress;
            if (toAddress) filters.to_address = toAddress;
            if (isRead !== undefined) filters.mark_as_read = isRead;

            // For text search, we'd need to extend the model to support full-text search
            // This is a simplified version
            const events = await MailV2UpdateEventModel.findAll(filters, { 
                limit, 
                offset,
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });

            // Filter by date range if provided
            let filteredEvents = events;
            if (startDate || endDate) {
                filteredEvents = events.filter(event => {
                    const eventDate = new Date(event.timestamp);
                    if (startDate && eventDate < new Date(startDate)) return false;
                    if (endDate && eventDate > new Date(endDate)) return false;
                    return true;
                });
            }

            // Simple text search in subject and body
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                filteredEvents = filteredEvents.filter(event => 
                    event.subject?.toLowerCase().includes(searchLower) ||
                    event.body?.toLowerCase().includes(searchLower)
                );
            }

            logger.info('Mail search completed', { 
                searchQuery, 
                filters: Object.keys(filters), 
                resultCount: filteredEvents.length 
            });

            return {
                mails: filteredEvents,
                searchParams,
                pagination: {
                    limit,
                    offset,
                    total: filteredEvents.length,
                    hasNext: filteredEvents.length === limit,
                    hasPrev: offset > 0
                }
            };
        } catch (error) {
            logger.error('Error searching mails:', error);
            throw error;
        }
    }

    // Bulk operations helper
    static async bulkUpdateReadStatus(mailIds, isRead, userAddress) {
        try {
            if (!Array.isArray(mailIds) || mailIds.length === 0) {
                throw new ValidationError('Mail IDs array is required');
            }

            if (!userAddress) {
                throw new ValidationError('User address is required');
            }

            // In a real implementation, you'd update a separate read status table
            // or trigger blockchain transactions. For now, we'll just return success.
            
            logger.info('Bulk read status update', { 
                mailCount: mailIds.length, 
                isRead, 
                user: userAddress.substring(0, 8) + '...' 
            });

            // Invalidate related caches
            await cacheManager.invalidateUserCache(userAddress);

            return {
                success: true,
                updatedCount: mailIds.length,
                mailIds
            };
        } catch (error) {
            logger.error('Error in bulk update read status:', error);
            throw error;
        }
    }

    // Get conversation participants
    static async getConversationParticipants(address, limit = 20) {
        const cacheKey = cacheManager.generateKey('conversation_participants', address);

        try {
            // Try cache first
            const cachedData = await cacheManager.get(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            // This would require a more complex query to find frequent conversation partners
            // For now, return a simple structure
            const participants = [];

            const result = {
                address,
                participants,
                totalConversations: participants.length
            };

            // Cache for 10 minutes
            await cacheManager.set(cacheKey, result, 600000);

            return result;
        } catch (error) {
            logger.error('Error fetching conversation participants:', error);
            throw error;
        }
    }

    // Cache invalidation helpers
    static async invalidateUserCache(address) {
        try {
            await cacheManager.invalidateUserCache(address);
            logger.info('User cache invalidated', { address: address.substring(0, 8) + '...' });
        } catch (error) {
            logger.error('Error invalidating user cache:', error);
        }
    }

    static async invalidateMailCache(mailId) {
        try {
            const threadCacheKey = cacheManager.generateKey('mail_thread', mailId);
            await cacheManager.del(threadCacheKey);
            logger.info('Mail thread cache invalidated', { mailId });
        } catch (error) {
            logger.error('Error invalidating mail cache:', error);
        }
    }
}

// Data transformation utilities
export class MailTransformHelper {
    // Transform database row to GraphQL Mail object
    static transformMailEvent(dbRow) {
        // Safe timestamp handling
        const getValidTimestamp = (dateValue) => {
            if (!dateValue) return new Date();
            
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                logger.warn('Invalid timestamp in database row', { dateValue });
                return new Date(); // Return current date as fallback
            }
            return date;
        };

        return {
            id: dbRow.mailId || dbRow.mail_id,
            subject: dbRow.subject,
            body: dbRow.body,
            fromAddress: dbRow.fromAddress || dbRow.from_address,
            toAddress: dbRow.toAddress || dbRow.to_address,
            timestamp: getValidTimestamp(dbRow.timestamp || dbRow.created_at),
            isRead: dbRow.markAsRead || dbRow.mark_as_read || false,
            parentId: dbRow.parentId || dbRow.parent_id,
            isEncrypted: !!(dbRow.iv && dbRow.salt),
            version: dbRow.version,
            mailbox: dbRow.mailbox,
            direction: null,
            labels: [],
            attachments: []
        };
    }

    // Transform user stats for GraphQL response
    static transformUserStats(dbStats) {
        return {
            address: dbStats.address,
            totalMailsSent: dbStats.totalSent || 0,
            totalMailsReceived: dbStats.totalReceived || 0,
            totalMailsRead: dbStats.totalRead || 0,
            unreadCount: dbStats.unreadCount || 0,
            lastActivity: dbStats.lastActivity,
            registrationDate: dbStats.registrationDate,
            // Computed fields
            readPercentage: dbStats.totalReceived > 0 
                ? ((dbStats.totalRead / dbStats.totalReceived) * 100).toFixed(2)
                : 0,
            totalActivity: (dbStats.totalSent || 0) + (dbStats.totalReceived || 0)
        };
    }

    // Sanitize and validate input data
    static sanitizeMailInput(input) {
        return {
            subject: this.sanitizeText(input.subject),
            body: this.sanitizeText(input.body),
            fromAddress: this.sanitizeAddress(input.fromAddress),
            toAddress: this.sanitizeAddress(input.toAddress),
            parentId: input.parentId ? this.sanitizeText(input.parentId) : null
        };
    }

    static sanitizeText(text) {
        if (typeof text !== 'string') return text;
        
        // Basic XSS protection
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    static sanitizeAddress(address) {
        if (typeof address !== 'string') return address;
        
        // Basic Solana address validation
        if (address.length !== 44) {
            throw new ValidationError('Invalid Solana address format');
        }
        
        return address.trim();
    }
}