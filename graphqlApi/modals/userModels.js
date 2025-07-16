import { query, logger, logQuery, handleDatabaseError, ValidationError } from '../core/index.js';


export class UserPreferencesModel {
    static async findByAddress(address) {
        const start = Date.now();
        
        try {
            const queryText = `
                SELECT * FROM user_preferences 
                WHERE address = $1
            `;
            
            const result = await query(queryText, [address]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [address], duration);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const row = result.rows[0];
            return {
                address: row.address,
                emailNotifications: row.email_notifications,
                theme: row.theme,
                language: row.language,
                timezone: row.timezone,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('findByAddress user_preferences', [address], duration, error);
            handleDatabaseError(error, 'findByAddress UserPreferences');
        }
    }

    static async upsert(address, preferences) {
        const start = Date.now();
        
        try {
            if (!address) {
                throw new ValidationError('Address is required');
            }

            const queryText = `
                INSERT INTO user_preferences (address, email_notifications, theme, language, timezone)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (address) 
                DO UPDATE SET 
                    email_notifications = COALESCE(EXCLUDED.email_notifications, user_preferences.email_notifications),
                    theme = COALESCE(EXCLUDED.theme, user_preferences.theme),
                    language = COALESCE(EXCLUDED.language, user_preferences.language),
                    timezone = COALESCE(EXCLUDED.timezone, user_preferences.timezone),
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const params = [
                address,
                preferences.emailNotifications,
                preferences.theme,
                preferences.language,
                preferences.timezone
            ];
            
            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            const row = result.rows[0];
            return {
                address: row.address,
                emailNotifications: row.email_notifications,
                theme: row.theme,
                language: row.language,
                timezone: row.timezone,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('upsert user_preferences', [], duration, error);
            handleDatabaseError(error, 'upsert UserPreferences');
        }
    }
}

// User Statistics Model (aggregated from mail events)
export class UserStatsModel {
    static async getUserStats(address) {
        const start = Date.now();
        
        try {
            const queryText = `
                WITH sent_stats AS (
                    SELECT 
                        COUNT(*) as sent_count,
                        MIN(created_at) as first_sent,
                        MAX(created_at) as last_sent
                    FROM mail_v2_update_event
                    WHERE from_address = $1
                ),
                received_stats AS (
                    SELECT 
                        COUNT(*) as received_count,
                        COUNT(CASE WHEN mark_as_read = true THEN 1 END) as read_count,
                        MIN(created_at) as first_received,
                        MAX(created_at) as last_received
                    FROM mail_v2_update_event
                    WHERE to_address = $1
                ),
                registration_info AS (
                    SELECT MIN(created_at) as registration_date
                    FROM mail_account_v2_register_event
                    WHERE owner = $1
                )
                SELECT 
                    COALESCE(s.sent_count, 0) as total_sent,
                    COALESCE(r.received_count, 0) as total_received,
                    COALESCE(r.read_count, 0) as total_read,
                    COALESCE(r.received_count, 0) - COALESCE(r.read_count, 0) as unread_count,
                    LEAST(s.first_sent, r.first_received) as first_activity,
                    GREATEST(s.last_sent, r.last_received) as last_activity,
                    reg.registration_date
                FROM sent_stats s
                FULL OUTER JOIN received_stats r ON true
                FULL OUTER JOIN registration_info reg ON true
            `;
            
            const result = await query(queryText, [address]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [address], duration);
            
            const row = result.rows[0];
            return {
                address,
                totalSent: parseInt(row.total_sent || 0),
                totalReceived: parseInt(row.total_received || 0),
                totalRead: parseInt(row.total_read || 0),
                unreadCount: parseInt(row.unread_count || 0),
                firstActivity: row.first_activity,
                lastActivity: row.last_activity,
                registrationDate: row.registration_date
            };
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getUserStats', [address], duration, error);
            handleDatabaseError(error, 'getUserStats');
        }
    }

    static async getUserMailbox(address, mailType = 'ALL', limit = 20, offset = 0) {
        const start = Date.now();
        
        try {
            let whereClause = '';
            const params = [limit, offset];
            let paramIndex = 3;

            switch (mailType) {
                case 'SENT':
                    whereClause = `WHERE from_address = $${paramIndex++}`;
                    params.push(address);
                    break;
                case 'RECEIVED':
                    whereClause = `WHERE to_address = $${paramIndex++}`;
                    params.push(address);
                    break;
                case 'UNREAD':
                    whereClause = `WHERE to_address = $${paramIndex++} AND mark_as_read = false`;
                    params.push(address);
                    break;
                default: // ALL
                    whereClause = `WHERE (from_address = $${paramIndex++} OR to_address = $${paramIndex++})`;
                    params.push(address, address);
            }

            const queryText = `
                SELECT 
                    mail_id as id,
                    subject,
                    body,
                    from_address,
                    to_address,
                    mark_as_read,
                    parent_id,
                    iv,
                    salt,
                    version,
                    mailbox,
                    created_at,
                    EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                FROM mail_v2_update_event
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            `;
            
            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return result.rows.map(row => ({
                id: row.id,
                subject: row.subject,
                body: row.body,
                fromAddress: row.from_address,
                toAddress: row.to_address,
                isRead: row.mark_as_read,
                parentId: row.parent_id,
                isEncrypted: !!(row.iv && row.salt),
                version: row.version,
                mailbox: row.mailbox,
                timestamp: new Date(row.timestamp),
                createdAt: row.created_at
            }));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getUserMailbox', [address, mailType], duration, error);
            handleDatabaseError(error, 'getUserMailbox');
        }
    }

    static async getMailThread(mailId) {
        const start = Date.now();
        
        try {
            // OPTIMIZED: Non-recursive approach with better performance
            const queryText = `
                WITH thread_mails AS (
                    -- First, find the root mail
                    SELECT 
                        mail_id, subject, body, from_address, to_address,
                        mark_as_read, parent_id, iv, salt, version, mailbox,
                        created_at, 1 as level
                    FROM mail_v2_update_event 
                    WHERE mail_id = $1
                    
                    UNION ALL
                    
                    -- Then find direct replies (limit depth to 3 levels)
                    SELECT 
                        child.mail_id, child.subject, child.body, child.from_address, child.to_address,
                        child.mark_as_read, child.parent_id, child.iv, child.salt, child.version, child.mailbox,
                        child.created_at, 2 as level
                    FROM mail_v2_update_event child
                    WHERE child.parent_id = $1
                    
                    UNION ALL
                    
                    -- Level 3 replies
                    SELECT 
                        grandchild.mail_id, grandchild.subject, grandchild.body, grandchild.from_address, grandchild.to_address,
                        grandchild.mark_as_read, grandchild.parent_id, grandchild.iv, grandchild.salt, grandchild.version, grandchild.mailbox,
                        grandchild.created_at, 3 as level
                    FROM mail_v2_update_event grandchild
                    INNER JOIN mail_v2_update_event parent ON parent.mail_id = grandchild.parent_id
                    WHERE parent.parent_id = $1
                )
                SELECT 
                    mail_id as id,
                    subject,
                    body,
                    from_address,
                    to_address,
                    mark_as_read,
                    parent_id,
                    iv,
                    salt,
                    version,
                    mailbox,
                    created_at,
                    level,
                    CASE 
                        WHEN created_at IS NOT NULL THEN created_at
                        ELSE NOW()
                    END as safe_timestamp
                FROM thread_mails 
                ORDER BY created_at ASC
                LIMIT 100  -- Prevent excessive results
            `;
            
            const result = await query(queryText, [mailId]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [mailId], duration);
            
            if (result.rows.length === 0) {
                return {
                    mailId,
                    messages: [],
                    participantCount: 0,
                    messageCount: 0,
                    lastActivity: null
                };
            }

            const messages = result.rows.map(row => ({
                id: row.id,
                subject: row.subject || '',
                body: row.body || '',
                fromAddress: row.from_address,
                toAddress: row.to_address,
                isRead: row.mark_as_read || false,
                parentId: row.parent_id,
                isEncrypted: !!(row.iv && row.salt),
                version: row.version || '1.0',
                mailbox: row.mailbox || 'inbox',
                level: row.level,
                timestamp: new Date(row.safe_timestamp),
                createdAt: row.created_at
            }));

            // Get unique participants
            const participants = new Set();
            messages.forEach(mail => {
                participants.add(mail.fromAddress);
                participants.add(mail.toAddress);
            });

            const lastActivity = messages.length > 0 
                ? new Date(Math.max(...messages.map(m => new Date(m.timestamp))))
                : null;

            return {
                mailId,
                messages,
                participantCount: participants.size,
                messageCount: messages.length,
                lastActivity
            };
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('getMailThread', [mailId], duration, error);
            handleDatabaseError(error, 'getMailThread');
        }
    }
}