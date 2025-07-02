import Redis from 'ioredis';
import { logger } from './logger.js';

// In-memory cache as fallback
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
    }

    async get(key) {
        const now = Date.now();
        const expiry = this.ttl.get(key);
        
        if (expiry && now > expiry) {
            this.cache.delete(key);
            this.ttl.delete(key);
            return null;
        }
        
        return this.cache.get(key) || null;
    }

    async set(key, value, ttlMs = 300000) { // 5 minutes default
        const expiry = Date.now() + ttlMs;
        this.cache.set(key, value);
        this.ttl.set(key, expiry);
        
        // Clean up expired entries periodically
        if (this.cache.size % 100 === 0) {
            this.cleanup();
        }
        
        return 'OK';
    }

    async del(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
        return 1;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, expiry] of this.ttl.entries()) {
            if (now > expiry) {
                this.cache.delete(key);
                this.ttl.delete(key);
            }
        }
    }

    async clear() {
        this.cache.clear();
        this.ttl.clear();
        return 'OK';
    }
}

// Redis cache implementation
class RedisCache {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });

        this.redis.on('connect', () => {
            logger.info('Redis connected');
        });

        this.redis.on('error', (err) => {
            logger.error('Redis error:', err);
        });

        this.redis.on('close', () => {
            logger.warn('Redis connection closed');
        });
    }

    async get(key) {
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis get error:', error);
            return null;
        }
    }

    async set(key, value, ttlMs = 300000) {
        try {
            const serialized = JSON.stringify(value);
            return await this.redis.setex(key, Math.floor(ttlMs / 1000), serialized);
        } catch (error) {
            logger.error('Redis set error:', error);
            return null;
        }
    }

    async del(key) {
        try {
            return await this.redis.del(key);
        } catch (error) {
            logger.error('Redis del error:', error);
            return 0;
        }
    }

    async clear() {
        try {
            return await this.redis.flushdb();
        } catch (error) {
            logger.error('Redis clear error:', error);
            return null;
        }
    }
}

// Cache factory
let cacheInstance;

export const getCache = () => {
    if (!cacheInstance) {
        if (process.env.REDIS_ENABLED === 'true') {
            cacheInstance = new RedisCache();
            logger.info('Cache initialized: Redis');
        } else {
            cacheInstance = new MemoryCache();
            logger.info('Cache initialized: Memory');
        }
    }
    return cacheInstance;
};

// Cache wrapper with automatic key generation
export class CacheManager {
    constructor() {
        this.cache = getCache();
        this.keyPrefix = process.env.CACHE_KEY_PREFIX || 'solmail:';
    }

    generateKey(type, ...identifiers) {
        return `${this.keyPrefix}${type}:${identifiers.join(':')}`;
    }

    async get(key) {
        const fullKey = key.includes(':') ? key : this.generateKey('default', key);
        return await this.cache.get(fullKey);
    }

    async set(key, value, ttlMs = 300000) {
        const fullKey = key.includes(':') ? key : this.generateKey('default', key);
        return await this.cache.set(fullKey, value, ttlMs);
    }

    async del(key) {
        const fullKey = key.includes(':') ? key : this.generateKey('default', key);
        return await this.cache.del(fullKey);
    }

    // Specialized cache methods for common patterns
    async getMailEvents(address, type, offset, limit) {
        const key = this.generateKey('mail_events', address, type, offset, limit);
        return await this.cache.get(key);
    }

    async setMailEvents(address, type, offset, limit, data, ttlMs = 60000) { // 1 minute for live data
        const key = this.generateKey('mail_events', address, type, offset, limit);
        return await this.cache.set(key, data, ttlMs);
    }

    async getUserStats(address) {
        const key = this.generateKey('user_stats', address);
        return await this.cache.get(key);
    }

    async setUserStats(address, stats, ttlMs = 300000) { // 5 minutes
        const key = this.generateKey('user_stats', address);
        return await this.cache.set(key, stats, ttlMs);
    }

    async getAnalytics(startDate, endDate) {
        const key = this.generateKey('analytics', startDate || 'all', endDate || 'all');
        return await this.cache.get(key);
    }

    async setAnalytics(startDate, endDate, data, ttlMs = 180000) { // 3 minutes
        const key = this.generateKey('analytics', startDate || 'all', endDate || 'all');
        return await this.cache.set(key, data, ttlMs);
    }

    // Cache invalidation patterns
    async invalidateUserCache(address) {
        // In a real implementation, you'd use Redis SCAN to find all keys
        // For now, we'll just delete known patterns
        const patterns = [
            this.generateKey('mail_events', address, '*'),
            this.generateKey('user_stats', address),
            this.generateKey('mailbox', address)
        ];
        
        for (const pattern of patterns) {
            await this.cache.del(pattern);
        }
    }

    async invalidateAnalyticsCache() {
        await this.cache.del(this.generateKey('analytics', '*'));
    }
}

export const cacheManager = new CacheManager();