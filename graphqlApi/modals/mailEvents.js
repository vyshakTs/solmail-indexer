import { query, transaction, logger, logQuery, handleDatabaseError, ValidationError, NotFoundError } from '../core/index.js';


// Base class for mail event modals
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

            // Build dynamic WHERE clause
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    queryText += ` AND ${key} = $${paramIndex++}`;
                    params.push(value);
                }
            }

            // Add ordering and pagination
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

    static async findById(tableName, id) {
        const start = Date.now();
        
        try {
            const queryText = `
                SELECT *, 
                       EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                FROM ${tableName} 
                WHERE id = $1
            `;
            
            const result = await query(queryText, [id]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [id], duration);
            
            if (result.rows.length === 0) {
                throw new NotFoundError(`Record with id ${id} not found`);
            }
            
            return this.mapRowToObject(result.rows[0]);
        } catch (error) {
            const duration = Date.now() - start;
            logQuery(queryText, [id], duration, error);
            
            if (error instanceof NotFoundError) {
                throw error;
            }
            handleDatabaseError(error, `findById ${tableName}`);
        }
    }

    static async count(tableName, filters = {}) {
        const start = Date.now();
        
        try {
            let queryText = `SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1`;
            const params = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    queryText += ` AND ${key} = $${paramIndex++}`;
                    params.push(value);
                }
            }

            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return parseInt(result.rows[0].total);
        } catch (error) {
            const duration = Date.now() - start;
            logQuery(queryText, params, duration, error);
            handleDatabaseError(error, `count ${tableName}`);
        }
    }

    static mapRowToObject(row) {
        // Override in subclasses
        return row;
    }
}

// Mail Send Event Model
export class MailSendEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_send_event', filters, options);
    }

    static async findById(id) {
        return super.findById('mail_send_event', id);
    }

    static async count(filters = {}) {
        return super.count('mail_send_event', filters);
    }

    static async create(data) {
        const start = Date.now();
        
        try {
            if (!data.trxHash || !data.fromAddress || !data.toAddress || !data.mailId) {
                throw new ValidationError('Missing required fields: trxHash, fromAddress, toAddress, mailId');
            }

            const queryText = `
                INSERT INTO mail_send_event (id, trx_hash, from_address, to_address, mail_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *, EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
            `;
            
            const id = data.id || crypto.randomUUID();
            const params = [id, data.trxHash, data.fromAddress, data.toAddress, data.mailId];
            
            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return this.mapRowToObject(result.rows[0]);
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('INSERT mail_send_event', [], duration, error);
            handleDatabaseError(error, 'create MailSendEvent');
        }
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            fromAddress: row.from_address,
            toAddress: row.to_address,
            mailId: row.mail_id,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Mail V2 Send Event Model
export class MailV2SendEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_v2_send_event', filters, options);
    }

    static async findById(id) {
        return super.findById('mail_v2_send_event', id);
    }

    static async count(filters = {}) {
        return super.count('mail_v2_send_event', filters);
    }

    static async create(data) {
        const start = Date.now();
        
        try {
            if (!data.trxHash || !data.fromAddress || !data.toAddress || !data.mailId || !data.mailbox) {
                throw new ValidationError('Missing required fields: trxHash, fromAddress, toAddress, mailId, mailbox');
            }

            const queryText = `
                INSERT INTO mail_v2_send_event (id, trx_hash, from_address, to_address, mail_id, mailbox)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *, EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
            `;
            
            const id = data.id || crypto.randomUUID();
            const params = [id, data.trxHash, data.fromAddress, data.toAddress, data.mailId, data.mailbox];
            
            const result = await query(queryText, params);
            const duration = Date.now() - start;
            
            logQuery(queryText, params, duration);
            
            return this.mapRowToObject(result.rows[0]);
        } catch (error) {
            const duration = Date.now() - start;
            logQuery('INSERT mail_v2_send_event', [], duration, error);
            handleDatabaseError(error, 'create MailV2SendEvent');
        }
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            fromAddress: row.from_address,
            toAddress: row.to_address,
            mailId: row.mail_id,
            mailbox: row.mailbox,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Mail V2 Update Event Model
export class MailV2UpdateEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_v2_update_event', filters, options);
    }

    static async findById(id) {
        return super.findById('mail_v2_update_event', id);
    }

    static async count(filters = {}) {
        return super.count('mail_v2_update_event', filters);
    }

    static async findByMailId(mailId) {
        const start = Date.now();
        
        try {
            const queryText = `
                SELECT *, 
                       EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                FROM mail_v2_update_event 
                WHERE mail_id = $1
                ORDER BY created_at DESC
            `;
            
            const result = await query(queryText, [mailId]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [mailId], duration);
            
            return result.rows.map(row => this.mapRowToObject(row));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery(queryText, [mailId], duration, error);
            handleDatabaseError(error, 'findByMailId MailV2UpdateEvent');
        }
    }

    static async findByThread(parentId) {
        const start = Date.now();
        
        try {
            const queryText = `
                WITH RECURSIVE mail_thread AS (
                    -- Base case: find the root message
                    SELECT *, 1 as level
                    FROM mail_v2_update_event 
                    WHERE mail_id = $1
                    
                    UNION ALL
                    
                    -- Recursive case: find replies
                    SELECT m.*, mt.level + 1
                    FROM mail_v2_update_event m
                    INNER JOIN mail_thread mt ON m.parent_id = mt.mail_id
                    WHERE mt.level < 10 -- Prevent infinite recursion
                )
                SELECT *, 
                       EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                FROM mail_thread 
                ORDER BY created_at ASC
            `;
            
            const result = await query(queryText, [parentId]);
            const duration = Date.now() - start;
            
            logQuery(queryText, [parentId], duration);
            
            return result.rows.map(row => this.mapRowToObject(row));
        } catch (error) {
            const duration = Date.now() - start;
            logQuery(queryText, [parentId], duration, error);
            handleDatabaseError(error, 'findByThread MailV2UpdateEvent');
        }
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            fromAddress: row.from_address,
            toAddress: row.to_address,
            mailId: row.mail_id,
            mailbox: row.mailbox,
            parentId: row.parent_id,
            markAsRead: row.mark_as_read,
            createdAtTimestamp: row.created_at_timestamp ? BigInt(row.created_at_timestamp) : null,
            subject: row.subject,
            body: row.body,
            authority: row.authority,
            iv: row.iv,
            salt: row.salt,
            version: row.version,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at,
            level: row.level || 1
        };
    }
}

// Mail V2 Read Event Model
export class MailV2ReadEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_v2_read_event', filters, options);
    }

    static async findById(id) {
        return super.findById('mail_v2_read_event', id);
    }

    static async count(filters = {}) {
        return super.count('mail_v2_read_event', filters);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            mailId: row.mail_id,
            owner: row.owner,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Mail V2 Update Label Event Model
export class MailV2UpdateLabelEventModel extends BaseMailEventModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('mail_v2_update_label_event', filters, options);
    }

    static async findById(id) {
        return super.findById('mail_v2_update_label_event', id);
    }

    static async count(filters = {}) {
        return super.count('mail_v2_update_label_event', filters);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            mailId: row.mail_id,
            owner: row.owner,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}