import "dotenv/config";
import { query, logger } from '../core/database.js';


// Database indexes for optimal performance
const indexes = [
    // ================== MAIL EVENTS INDEXES ==================
    
    // Mail send events
    {
        name: 'idx_mail_send_event_from_address',
        table: 'mail_send_event',
        columns: ['from_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_send_event_to_address',
        table: 'mail_send_event',
        columns: ['to_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_send_event_mail_id',
        table: 'mail_send_event',
        columns: ['mail_id'],
        type: 'btree'
    },
    {
        name: 'idx_mail_send_event_created_at',
        table: 'mail_send_event',
        columns: ['created_at DESC'],
        type: 'btree'
    },
    {
        name: 'idx_mail_send_event_trx_hash',
        table: 'mail_send_event',
        columns: ['trx_hash'],
        type: 'btree',
        unique: true
    },

    // Mail V2 send events
    {
        name: 'idx_mail_v2_send_event_from_address',
        table: 'mail_v2_send_event',
        columns: ['from_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_send_event_to_address',
        table: 'mail_v2_send_event',
        columns: ['to_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_send_event_mailbox',
        table: 'mail_v2_send_event',
        columns: ['mailbox'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_send_event_created_at',
        table: 'mail_v2_send_event',
        columns: ['created_at DESC'],
        type: 'btree'
    },

    // Mail V2 update events (most important for queries)
    {
        name: 'idx_mail_v2_update_event_from_address',
        table: 'mail_v2_update_event',
        columns: ['from_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_to_address',
        table: 'mail_v2_update_event',
        columns: ['to_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_mail_id',
        table: 'mail_v2_update_event',
        columns: ['mail_id'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_parent_id',
        table: 'mail_v2_update_event',
        columns: ['parent_id'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_created_at',
        table: 'mail_v2_update_event',
        columns: ['created_at DESC'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_mailbox',
        table: 'mail_v2_update_event',
        columns: ['mailbox'],
        type: 'btree'
    },
    
    // Composite indexes for common query patterns
    {
        name: 'idx_mail_v2_update_event_from_to_date',
        table: 'mail_v2_update_event',
        columns: ['from_address', 'to_address', 'created_at DESC'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_to_read_date',
        table: 'mail_v2_update_event',
        columns: ['to_address', 'mark_as_read', 'created_at DESC'],
        type: 'btree'
    },

    // Mail V2 read events
    {
        name: 'idx_mail_v2_read_event_mail_id',
        table: 'mail_v2_read_event',
        columns: ['mail_id'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_read_event_owner',
        table: 'mail_v2_read_event',
        columns: ['owner'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_read_event_created_at',
        table: 'mail_v2_read_event',
        columns: ['created_at DESC'],
        type: 'btree'
    },

    // Mail V2 update label events
    {
        name: 'idx_mail_v2_update_label_event_mail_id',
        table: 'mail_v2_update_label_event',
        columns: ['mail_id'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_label_event_owner',
        table: 'mail_v2_update_label_event',
        columns: ['owner'],
        type: 'btree'
    },

    // ================== ACCOUNT EVENTS INDEXES ==================
    
    // Mail account V2 register events
    {
        name: 'idx_mail_account_v2_register_event_owner',
        table: 'mail_account_v2_register_event',
        columns: ['owner'],
        type: 'btree'
    },
    {
        name: 'idx_mail_account_v2_register_event_account',
        table: 'mail_account_v2_register_event',
        columns: ['account'],
        type: 'btree'
    },
    {
        name: 'idx_mail_account_v2_register_event_created_at',
        table: 'mail_account_v2_register_event',
        columns: ['created_at DESC'],
        type: 'btree'
    },

    // Mail account V2 update events
    {
        name: 'idx_mail_account_v2_update_event_owner',
        table: 'mail_account_v2_update_event',
        columns: ['owner'],
        type: 'btree'
    },
    {
        name: 'idx_mail_account_v2_update_event_account',
        table: 'mail_account_v2_update_event',
        columns: ['account'],
        type: 'btree'
    },

    // ================== INSTRUCTION INDEXES ==================
    
    // Createmail instructions
    {
        name: 'idx_createmail_instruction_from_address',
        table: 'createmail_instruction',
        columns: ['from_address'],
        type: 'btree'
    },
    {
        name: 'idx_createmail_instruction_to_address',
        table: 'createmail_instruction',
        columns: ['to_address'],
        type: 'btree'
    },
    {
        name: 'idx_createmail_instruction_created_at',
        table: 'createmail_instruction',
        columns: ['created_at DESC'],
        type: 'btree'
    },

    // Sendmail instructions
    {
        name: 'idx_sendmail_instruction_from_address',
        table: 'sendmail_instruction',
        columns: ['from_address'],
        type: 'btree'
    },
    {
        name: 'idx_sendmail_instruction_to_address',
        table: 'sendmail_instruction',
        columns: ['to_address'],
        type: 'btree'
    },
    {
        name: 'idx_sendmail_instruction_created_at',
        table: 'sendmail_instruction',
        columns: ['created_at DESC'],
        type: 'btree'
    },

    // Register V2 instructions
    {
        name: 'idx_register_v2_instruction_nostr_key',
        table: 'register_v2_instruction',
        columns: ['nostr_key'],
        type: 'btree'
    },
    {
        name: 'idx_register_v2_instruction_created_at',
        table: 'register_v2_instruction',
        columns: ['created_at DESC'],
        type: 'btree'
    },

    // Update account V2 instructions
    {
        name: 'idx_update_account_v2_instruction_nostr_key',
        table: 'update_account_v2_instruction',
        columns: ['nostr_key'],
        type: 'btree'
    },
    {
        name: 'idx_update_account_v2_instruction_mailbox',
        table: 'update_account_v2_instruction',
        columns: ['mailbox'],
        type: 'btree'
    },

    // All instruction tables - transaction hash index
    {
        name: 'idx_updatemail_instruction_trx_hash',
        table: 'updatemail_instruction',
        columns: ['trx_hash'],
        type: 'btree'
    },
    {
        name: 'idx_updatemailreadstatus_instruction_trx_hash',
        table: 'updatemailreadstatus_instruction',
        columns: ['trx_hash'],
        type: 'btree'
    },
    {
        name: 'idx_updatemaillabel_instruction_trx_hash',
        table: 'updatemaillabel_instruction',
        columns: ['trx_hash'],
        type: 'btree'
    },
    {
        name: 'idx_register_instruction_trx_hash',
        table: 'register_instruction',
        columns: ['trx_hash'],
        type: 'btree'
    },

    // ================== FULL TEXT SEARCH INDEXES ==================
    // PostgreSQL full-text search indexes for mail content
    
    {
        name: 'idx_mail_v2_update_event_subject_gin',
        table: 'mail_v2_update_event',
        columns: ['to_tsvector(\'english\', subject)'],
        type: 'gin'
    },
    {
        name: 'idx_mail_v2_update_event_body_gin',
        table: 'mail_v2_update_event',
        columns: ['to_tsvector(\'english\', body)'],
        type: 'gin'
    },
    {
        name: 'idx_sendmail_instruction_subject_gin',
        table: 'sendmail_instruction',
        columns: ['to_tsvector(\'english\', subject)'],
        type: 'gin'
    },

    // ================== ANALYTICS OPTIMIZED INDEXES ==================
    // Specialized indexes for analytics queries
    
    {
        name: 'idx_mail_v2_update_event_analytics_daily',
        table: 'mail_v2_update_event',
        columns: ['DATE(created_at)', 'from_address', 'to_address'],
        type: 'btree'
    },
    {
        name: 'idx_mail_v2_update_event_analytics_hourly',
        table: 'mail_v2_update_event',
        columns: ['DATE_TRUNC(\'hour\', created_at)', 'from_address'],
        type: 'btree'
    }
];

// Additional constraints and optimization queries
const optimizations = [
    // Analyze tables for better query planning
    'ANALYZE mail_v2_update_event;',
    'ANALYZE mail_v2_send_event;',
    'ANALYZE mail_send_event;',
    'ANALYZE mail_v2_read_event;',
    'ANALYZE mail_account_v2_register_event;',
    
    // Update table statistics
    'UPDATE pg_class SET reltuples = (SELECT COUNT(*) FROM mail_v2_update_event) WHERE relname = \'mail_v2_update_event\';',
    
    // Set optimal work_mem for index creation (if we have permissions)
    // 'SET work_mem = \'256MB\';'
];

async function createIndex(indexConfig) {
    const { name, table, columns, type = 'btree', unique = false } = indexConfig;
    
    try {
        // Check if index already exists
        const existsQuery = `
            SELECT 1 FROM pg_indexes 
            WHERE indexname = $1 AND tablename = $2
        `;
        const existsResult = await query(existsQuery, [name, table]);
        
        if (existsResult.rows.length > 0) {
            logger.info(`Index ${name} already exists, skipping...`);
            return;
        }

        // Create the index
        const uniqueClause = unique ? 'UNIQUE' : '';
        const columnsStr = columns.join(', ');
        const createQuery = `
            CREATE ${uniqueClause} INDEX CONCURRENTLY ${name} 
            ON ${table} USING ${type} (${columnsStr})
        `;
        
        logger.info(`Creating index: ${name} on ${table}(${columnsStr})`);
        await query(createQuery);
        logger.info(`✅ Index ${name} created successfully`);
        
    } catch (error) {
        logger.error(`❌ Failed to create index ${name}:`, error.message);
        
        // If concurrent creation fails, try without CONCURRENTLY
        if (error.message.includes('CONCURRENTLY')) {
            try {
                const uniqueClause = unique ? 'UNIQUE' : '';
                const columnsStr = columns.join(', ');
                const fallbackQuery = `
                    CREATE ${uniqueClause} INDEX ${name} 
                    ON ${table} USING ${type} (${columnsStr})
                `;
                
                logger.info(`Retrying index creation without CONCURRENTLY: ${name}`);
                await query(fallbackQuery);
                logger.info(`✅ Index ${name} created successfully (fallback)`);
                
            } catch (fallbackError) {
                logger.error(`❌ Fallback index creation failed for ${name}:`, fallbackError.message);
            }
        }
    }
}

async function runOptimizations() {
    logger.info('Running database optimizations...');
    
    for (const optimization of optimizations) {
        try {
            await query(optimization);
            logger.info(`✅ Optimization executed: ${optimization.substring(0, 50)}...`);
        } catch (error) {
            logger.warn(`⚠️ Optimization failed (non-critical): ${optimization.substring(0, 50)}...`, error.message);
        }
    }
}

async function createAllIndexes() {
    logger.info('🚀 Starting database index creation...');
    logger.info(`Total indexes to create: ${indexes.length}`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Create indexes in batches to avoid overwhelming the database
    const batchSize = 5;
    for (let i = 0; i < indexes.length; i += batchSize) {
        const batch = indexes.slice(i, i + batchSize);
        
        logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} indexes)...`);
        
        // Process batch in parallel
        const promises = batch.map(async (indexConfig) => {
            try {
                await createIndex(indexConfig);
                successCount++;
            } catch (error) {
                failureCount++;
                logger.error(`Batch processing error for ${indexConfig.name}:`, error);
            }
        });
        
        await Promise.all(promises);
        
        // Small delay between batches
        if (i + batchSize < indexes.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    logger.info('📊 Index creation summary:');
    logger.info(`✅ Successfully created: ${successCount} indexes`);
    logger.info(`❌ Failed to create: ${failureCount} indexes`);
    
    // Run optimizations
    await runOptimizations();
    
    logger.info('🎉 Database optimization completed!');
}

// Additional utility functions
export async function dropAllIndexes() {
    logger.warn('🔥 Dropping all custom indexes...');
    
    for (const indexConfig of indexes) {
        try {
            await query(`DROP INDEX IF EXISTS ${indexConfig.name}`);
            logger.info(`Dropped index: ${indexConfig.name}`);
        } catch (error) {
            logger.error(`Failed to drop index ${indexConfig.name}:`, error.message);
        }
    }
    
    logger.info('All custom indexes dropped');
}

export async function getIndexStats() {
    try {
        const statsQuery = `
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_tup_read,
                idx_tup_fetch,
                idx_scan
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC
        `;
        
        const result = await query(statsQuery);
        
        logger.info('📈 Index usage statistics:');
        result.rows.forEach(row => {
            logger.info(`${row.tablename}.${row.indexname}: ${row.idx_scan} scans, ${row.idx_tup_read} tuples read`);
        });
        
        return result.rows;
    } catch (error) {
        logger.error('Failed to get index stats:', error);
        return [];
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            await createAllIndexes();
            break;
        case 'drop':
            await dropAllIndexes();
            break;
        case 'stats':
            await getIndexStats();
            break;
        default:
            logger.info('Usage: node createIndexes.js [create|drop|stats]');
    }
    
    process.exit(0);
}

export { createAllIndexes, indexes };