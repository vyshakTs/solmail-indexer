use anchor_lang::prelude::Pubkey;

// ============================================================================
// Event Types
// ============================================================================

#[derive(Debug, Clone)]
pub struct MailSendEventCustom {
    pub from: Pubkey,
    pub to: Pubkey,
    pub id: String,
}

#[derive(Debug, Clone)]
pub struct MailV2SendEventCustom {
    pub from: Pubkey,
    pub to: Pubkey,
    pub id: String,
    pub mailbox: Pubkey,
}

#[derive(Debug, Clone)]
pub struct MailV2UpdateEventCustom {
    pub from: Pubkey,
    pub to: Pubkey,
    pub id: String,
    pub mailbox: Pubkey,
    pub parent_id: String,
    pub mark_as_read: bool,
    pub created_at: u32,
    pub subject: String,
    pub body: String,
    pub authority: Pubkey,
    pub iv: String,
    pub salt: String,
    pub version: String,
}

#[derive(Debug, Clone)]
pub struct MailV2ReadEventCustom {
    pub id: String,
    pub owner: Pubkey,
}

#[derive(Debug, Clone)]
pub struct MailV2UpdateLabelEventCustom {
    pub id: String,
    pub owner: Pubkey,
}

#[derive(Debug, Clone)]
pub struct MailAccountV2RegisterEventCustom {
    pub owner: Pubkey,
    pub account: Pubkey,
}

#[derive(Debug, Clone)]
pub struct MailAccountV2UpdateEventCustom {
    pub owner: Pubkey,
    pub account: Pubkey,
}

// ============================================================================
// Instruction Types
// ============================================================================

#[derive(Debug, Clone)]
pub struct CreatemailCustom {
    pub subject: String,
    pub from: Pubkey,
    pub to: Pubkey,
    pub salt: String,
    pub iv: String,
    pub version: String,
    pub parent_id: String,
}

#[derive(Debug, Clone)]
pub struct UpdatemailCustom {
    pub body: String,
}

#[derive(Debug, Clone)]
pub struct UpdatemailreadstatusCustom {
    // No additional fields beyond accounts
}

#[derive(Debug, Clone)]
pub struct UpdatemaillabelCustom {
    pub label: u32,
}

#[derive(Debug, Clone)]
pub struct RegisterV2Custom {
    pub nostr_key: String,
}

#[derive(Debug, Clone)]
pub struct UpdateAccountV2Custom {
    pub nostr_key: String,
    pub mailbox: Pubkey,
}

#[derive(Debug, Clone)]
pub struct SendmailCustom {
    pub subject: String,
    pub body: String,
    pub from: Pubkey,
    pub to: Pubkey,
    pub salt: String,
    pub iv: String,
    pub version: String,
}

#[derive(Debug, Clone)]
pub struct RegisterCustom {
    pub nostr_key: String,
}