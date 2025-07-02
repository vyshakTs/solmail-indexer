import { query } from '../core/index.js';
import { logger, logQuery, handleDatabaseError, ValidationError } from '../core/index.js';


// ================== INSTRUCTION modals ==================

// Base class for instruction modals
class BaseInstructionModel {
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

// Createmail Instruction Model
export class CreatemailInstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('createmail_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            subject: row.subject,
            fromAddress: row.from_address,
            toAddress: row.to_address,
            salt: row.salt,
            iv: row.iv,
            version: row.version,
            parentId: row.parent_id,
            acctMail: row.acct_mail,
            acctMailAccountV2: row.acct_mail_account_v2,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Sendmail Instruction Model
export class SendmailInstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('sendmail_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            subject: row.subject,
            body: row.body,
            fromAddress: row.from_address,
            toAddress: row.to_address,
            salt: row.salt,
            iv: row.iv,
            version: row.version,
            acctMail: row.acct_mail,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Register V2 Instruction Model
export class RegisterV2InstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('register_v2_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            nostrKey: row.nostr_key,
            acctMailAccountV2: row.acct_mail_account_v2,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Update Account V2 Instruction Model
export class UpdateAccountV2InstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('update_account_v2_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            nostrKey: row.nostr_key,
            mailbox: row.mailbox,
            acctMailAccountV2: row.acct_mail_account_v2,
            acctAuthority: row.acct_authority,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Updatemail Instruction Model
export class UpdatemailInstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('updatemail_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            body: row.body,
            acctMail: row.acct_mail,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Updatemailreadstatus Instruction Model
export class UpdatemailreadstatusInstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('updatemailreadstatus_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            acctMail: row.acct_mail,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Updatemaillabel Instruction Model
export class UpdatemaillabelInstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('updatemaillabel_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            label: row.label,
            acctMail: row.acct_mail,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}

// Register Instruction Model
export class RegisterInstructionModel extends BaseInstructionModel {
    static async findAll(filters = {}, options = {}) {
        return super.findAll('register_instruction', filters, options);
    }

    static mapRowToObject(row) {
        return {
            id: row.id,
            trxHash: row.trx_hash,
            nostrKey: row.nostr_key,
            acctMailAccount: row.acct_mail_account,
            acctAuthority: row.acct_authority,
            acctSystemProgram: row.acct_system_program,
            timestamp: new Date(row.timestamp),
            createdAt: row.created_at
        };
    }
}
