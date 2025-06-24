-- Mail Send Event Table
CREATE TABLE IF NOT EXISTS mail_send_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    mail_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mail V2 Send Event Table
CREATE TABLE IF NOT EXISTS mail_v2_send_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    mail_id TEXT NOT NULL,
    mailbox TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mail V2 Update Event Table
CREATE TABLE IF NOT EXISTS mail_v2_update_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    mail_id TEXT NOT NULL,
    mailbox TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    mark_as_read BOOLEAN NOT NULL,
    created_at_timestamp BIGINT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    authority TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL,
    version TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mail V2 Read Event Table
CREATE TABLE IF NOT EXISTS mail_v2_read_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    mail_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mail V2 Update Label Event Table
CREATE TABLE IF NOT EXISTS mail_v2_update_label_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    mail_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mail Account V2 Register Event Table
CREATE TABLE IF NOT EXISTS mail_account_v2_register_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    owner TEXT NOT NULL,
    account TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mail Account V2 Update Event Table
CREATE TABLE IF NOT EXISTS mail_account_v2_update_event (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    owner TEXT NOT NULL,
    account TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Mail Instruction Table
CREATE TABLE IF NOT EXISTS createmail_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    subject TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    version TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    acct_mail TEXT NOT NULL,
    acct_mail_account_v2 TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Mail Instruction Table
CREATE TABLE IF NOT EXISTS updatemail_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    body TEXT NOT NULL,
    acct_mail TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Mail Read Status Instruction Table
CREATE TABLE IF NOT EXISTS updatemailreadstatus_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    acct_mail TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Mail Label Instruction Table
CREATE TABLE IF NOT EXISTS updatemaillabel_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    label BIGINT NOT NULL,
    acct_mail TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Register V2 Instruction Table
CREATE TABLE IF NOT EXISTS register_v2_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    nostr_key TEXT NOT NULL,
    acct_mail_account_v2 TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Account V2 Instruction Table
CREATE TABLE IF NOT EXISTS update_account_v2_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    nostr_key TEXT NOT NULL,
    mailbox TEXT NOT NULL,
    acct_mail_account_v2 TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Send Mail Instruction Table
CREATE TABLE IF NOT EXISTS sendmail_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    version TEXT NOT NULL,
    acct_mail TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Register Instruction Table
CREATE TABLE IF NOT EXISTS register_instruction (
    id VARCHAR(64) PRIMARY KEY,
    trx_hash VARCHAR(88) NOT NULL,
    nostr_key TEXT NOT NULL,
    acct_mail_account TEXT NOT NULL,
    acct_authority TEXT NOT NULL,
    acct_system_program TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
-- Transaction hash indexes
CREATE INDEX IF NOT EXISTS idx_mail_send_event_trx_hash ON mail_send_event(trx_hash);
CREATE INDEX IF NOT EXISTS idx_mail_v2_send_event_trx_hash ON mail_v2_send_event(trx_hash);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_trx_hash ON mail_v2_update_event(trx_hash);
CREATE INDEX IF NOT EXISTS idx_mail_v2_read_event_trx_hash ON mail_v2_read_event(trx_hash);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_label_event_trx_hash ON mail_v2_update_label_event(trx_hash);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_register_event_trx_hash ON mail_account_v2_register_event(trx_hash);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_update_event_trx_hash ON mail_account_v2_update_event(trx_hash);

-- Address indexes for events
CREATE INDEX IF NOT EXISTS idx_mail_send_event_from ON mail_send_event(from_address);
CREATE INDEX IF NOT EXISTS idx_mail_send_event_to ON mail_send_event(to_address);
CREATE INDEX IF NOT EXISTS idx_mail_v2_send_event_from ON mail_v2_send_event(from_address);
CREATE INDEX IF NOT EXISTS idx_mail_v2_send_event_to ON mail_v2_send_event(to_address);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_from ON mail_v2_update_event(from_address);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_to ON mail_v2_update_event(to_address);

-- Mail ID indexes
CREATE INDEX IF NOT EXISTS idx_mail_send_event_mail_id ON mail_send_event(mail_id);
CREATE INDEX IF NOT EXISTS idx_mail_v2_send_event_mail_id ON mail_v2_send_event(mail_id);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_mail_id ON mail_v2_update_event(mail_id);
CREATE INDEX IF NOT EXISTS idx_mail_v2_read_event_mail_id ON mail_v2_read_event(mail_id);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_label_event_mail_id ON mail_v2_update_label_event(mail_id);

-- Owner/Account indexes
CREATE INDEX IF NOT EXISTS idx_mail_v2_read_event_owner ON mail_v2_read_event(owner);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_label_event_owner ON mail_v2_update_label_event(owner);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_register_event_owner ON mail_account_v2_register_event(owner);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_update_event_owner ON mail_account_v2_update_event(owner);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_register_event_account ON mail_account_v2_register_event(account);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_update_event_account ON mail_account_v2_update_event(account);

-- Instruction transaction hash indexes
CREATE INDEX IF NOT EXISTS idx_createmail_instruction_trx_hash ON createmail_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_updatemail_instruction_trx_hash ON updatemail_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_updatemailreadstatus_instruction_trx_hash ON updatemailreadstatus_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_updatemaillabel_instruction_trx_hash ON updatemaillabel_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_register_v2_instruction_trx_hash ON register_v2_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_update_account_v2_instruction_trx_hash ON update_account_v2_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_sendmail_instruction_trx_hash ON sendmail_instruction(trx_hash);
CREATE INDEX IF NOT EXISTS idx_register_instruction_trx_hash ON register_instruction(trx_hash);

-- Address indexes for instructions
CREATE INDEX IF NOT EXISTS idx_createmail_instruction_from ON createmail_instruction(from_address);
CREATE INDEX IF NOT EXISTS idx_createmail_instruction_to ON createmail_instruction(to_address);
CREATE INDEX IF NOT EXISTS idx_sendmail_instruction_from ON sendmail_instruction(from_address);
CREATE INDEX IF NOT EXISTS idx_sendmail_instruction_to ON sendmail_instruction(to_address);

-- Timestamp indexes for all tables
CREATE INDEX IF NOT EXISTS idx_mail_send_event_created_at ON mail_send_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_v2_send_event_created_at ON mail_v2_send_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_created_at ON mail_v2_update_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_v2_read_event_created_at ON mail_v2_read_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_label_event_created_at ON mail_v2_update_label_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_register_event_created_at ON mail_account_v2_register_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_account_v2_update_event_created_at ON mail_account_v2_update_event(created_at DESC);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_from_to_time ON mail_v2_update_event(from_address, to_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_v2_send_event_mailbox_time ON mail_v2_send_event(mailbox, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_v2_update_event_read_status ON mail_v2_update_event(mark_as_read, created_at DESC);

-- Add table comments for documentation
COMMENT ON TABLE mail_send_event IS 'Mail send events from the Solana mail protocol';
COMMENT ON TABLE mail_v2_send_event IS 'Mail V2 send events with mailbox support';
COMMENT ON TABLE mail_v2_update_event IS 'Mail V2 update events with full message data';
COMMENT ON TABLE mail_v2_read_event IS 'Mail V2 read status events';
COMMENT ON TABLE mail_v2_update_label_event IS 'Mail V2 label update events';
COMMENT ON TABLE mail_account_v2_register_event IS 'Mail account V2 registration events';
COMMENT ON TABLE mail_account_v2_update_event IS 'Mail account V2 update events';
COMMENT ON TABLE createmail_instruction IS 'Create mail instruction data';
COMMENT ON TABLE updatemail_instruction IS 'Update mail instruction data';
COMMENT ON TABLE updatemailreadstatus_instruction IS 'Update mail read status instruction data';
COMMENT ON TABLE updatemaillabel_instruction IS 'Update mail label instruction data';
COMMENT ON TABLE register_v2_instruction IS 'Register V2 instruction data';
COMMENT ON TABLE update_account_v2_instruction IS 'Update account V2 instruction data';
COMMENT ON TABLE sendmail_instruction IS 'Send mail instruction data';
COMMENT ON TABLE register_instruction IS 'Register instruction data';