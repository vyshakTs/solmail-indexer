use sha2::{Digest, Sha256};
use substreams::Hex;
use substreams_database_change::pb::database::DatabaseChanges;
use substreams_database_change::tables::Tables as DatabaseChangeTables;

use crate::pb::substreams::v1::program::Data;
use crate::idl;

/// Database output handler for converting parsed data to database changes
#[substreams::handlers::map]
pub fn db_out(data: Data) -> DatabaseChanges {
    substreams::log::info!("=== DATABASE OUTPUT PROCESSING ===");
    
    let total_events = data.mail_send_event_event_list.len() + 
                      data.mail_v2_send_event_event_list.len() + 
                      data.mail_v2_update_event_event_list.len() + 
                      data.mail_v2_read_event_event_list.len() + 
                      data.mail_v2_update_label_event_event_list.len() + 
                      data.mail_account_v2_register_event_event_list.len() + 
                      data.mail_account_v2_update_event_event_list.len();
    
    let total_instructions = data.createmail_instruction_list.len() + 
                           data.updatemail_instruction_list.len() + 
                           data.updatemailreadstatus_instruction_list.len() + 
                           data.updatemaillabel_instruction_list.len() + 
                           data.register_v2_instruction_list.len() + 
                           data.update_account_v2_instruction_list.len() + 
                           data.sendmail_instruction_list.len() + 
                           data.register_instruction_list.len();
    
    substreams::log::info!("Processing {} events and {} instructions for database", 
        total_events, total_instructions);

    let mut tables: DatabaseChangeTables = DatabaseChangeTables::new();

    // Process events
    process_events(&data, &mut tables);
    
    // Process instructions
    process_instructions(&data, &mut tables);

    substreams::log::info!("=== DATABASE OUTPUT COMPLETE ===");
    tables.to_database_changes()
}

/// Process all event types and add them to database tables
fn process_events(data: &Data, tables: &mut DatabaseChangeTables) {
    // Process MailSendEvent events
    for event in &data.mail_send_event_event_list {
        substreams::log::debug!("Creating DB row for MailSendEvent: {}", event.id);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.from,
            &event.to,
            &event.id,
        ]);

        tables
            .create_row("mail_send_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("from_address", &event.from)
            .set("to_address", &event.to)
            .set("mail_id", &event.id);
    }

    // Process MailV2SendEvent events
    for event in &data.mail_v2_send_event_event_list {
        substreams::log::debug!("Creating DB row for MailV2SendEvent: {}", event.id);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.from,
            &event.to,
            &event.id,
            &event.mailbox,
        ]);

        tables
            .create_row("mail_v2_send_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("from_address", &event.from)
            .set("to_address", &event.to)
            .set("mail_id", &event.id)
            .set("mailbox", &event.mailbox);
    }

    // Process MailV2UpdateEvent events
    for event in &data.mail_v2_update_event_event_list {
        substreams::log::debug!("Creating DB row for MailV2UpdateEvent: {}", event.id);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.from,
            &event.to,
            &event.id,
            &event.mailbox,
            &event.parent_id,
            &event.mark_as_read.to_string(),
            &event.created_at.to_string(),
        ]);

        tables
            .create_row("mail_v2_update_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("from_address", &event.from)
            .set("to_address", &event.to)
            .set("mail_id", &event.id)
            .set("mailbox", &event.mailbox)
            .set("parent_id", &event.parent_id)
            .set("mark_as_read", &event.mark_as_read.to_string())
            .set("created_at_timestamp", &event.created_at.to_string())
            .set("subject", &event.subject)
            .set("body", &event.body)
            .set("authority", &event.authority)
            .set("iv", &event.iv)
            .set("salt", &event.salt)
            .set("version", &event.version);
    }

    // Process MailV2ReadEvent events
    for event in &data.mail_v2_read_event_event_list {
        substreams::log::debug!("Creating DB row for MailV2ReadEvent: {}", event.id);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.id,
            &event.owner,
        ]);

        tables
            .create_row("mail_v2_read_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("mail_id", &event.id)
            .set("owner", &event.owner);
    }

    // Process MailV2UpdateLabelEvent events
    for event in &data.mail_v2_update_label_event_event_list {
        substreams::log::debug!("Creating DB row for MailV2UpdateLabelEvent: {}", event.id);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.id,
            &event.owner,
        ]);

        tables
            .create_row("mail_v2_update_label_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("mail_id", &event.id)
            .set("owner", &event.owner);
    }

    // Process MailAccountV2RegisterEvent events
    for event in &data.mail_account_v2_register_event_event_list {
        substreams::log::debug!("Creating DB row for MailAccountV2RegisterEvent: owner={}", event.owner);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.owner,
            &event.account,
        ]);

        tables
            .create_row("mail_account_v2_register_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("owner", &event.owner)
            .set("account", &event.account);
    }

    // Process MailAccountV2UpdateEvent events
    for event in &data.mail_account_v2_update_event_event_list {
        substreams::log::debug!("Creating DB row for MailAccountV2UpdateEvent: owner={}", event.owner);
        
        let pk = generate_event_pk(&[
            &event.trx_hash,
            &event.owner,
            &event.account,
        ]);

        tables
            .create_row("mail_account_v2_update_event", pk)
            .set("trx_hash", &event.trx_hash)
            .set("owner", &event.owner)
            .set("account", &event.account);
    }
}

/// Process all instruction types and add them to database tables
fn process_instructions(data: &Data, tables: &mut DatabaseChangeTables) {
    // Process Createmail instructions
    for instruction in &data.createmail_instruction_list {
        substreams::log::debug!("Creating DB row for Createmail instruction: subject={}", instruction.subject);
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.subject,
            &instruction.from,
            &instruction.to,
            &instruction.salt,
            &instruction.iv,
            &instruction.version,
            &instruction.parent_id,
        ]);

        tables
            .create_row("createmail_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("subject", &instruction.subject)
            .set("from_address", &instruction.from)
            .set("to_address", &instruction.to)
            .set("salt", &instruction.salt)
            .set("iv", &instruction.iv)
            .set("version", &instruction.version)
            .set("parent_id", &instruction.parent_id)
            .set("acct_mail", &instruction.acct_mail)
            .set("acct_mail_account_v2", &instruction.acct_mail_account_v2)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }

    // Process Updatemail instructions
    for instruction in &data.updatemail_instruction_list {
        substreams::log::debug!("Creating DB row for Updatemail instruction");
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.body,
            &instruction.acct_mail,
        ]);

        tables
            .create_row("updatemail_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("body", &instruction.body)
            .set("acct_mail", &instruction.acct_mail)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }

    // Process Updatemailreadstatus instructions
    for instruction in &data.updatemailreadstatus_instruction_list {
        substreams::log::debug!("Creating DB row for Updatemailreadstatus instruction");
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.acct_mail,
        ]);

        tables
            .create_row("updatemailreadstatus_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("acct_mail", &instruction.acct_mail)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }

    // Process Updatemaillabel instructions
    for instruction in &data.updatemaillabel_instruction_list {
        substreams::log::debug!("Creating DB row for Updatemaillabel instruction");
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.label.to_string(),
            &instruction.acct_mail,
        ]);

        tables
            .create_row("updatemaillabel_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("label", &instruction.label.to_string())
            .set("acct_mail", &instruction.acct_mail)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }

    // Process RegisterV2 instructions
    for instruction in &data.register_v2_instruction_list {
        substreams::log::debug!("Creating DB row for RegisterV2 instruction");
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.nostr_key,
        ]);

        tables
            .create_row("register_v2_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("nostr_key", &instruction.nostr_key)
            .set("acct_mail_account_v2", &instruction.acct_mail_account_v2)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }

    // Process UpdateAccountV2 instructions
    for instruction in &data.update_account_v2_instruction_list {
        substreams::log::debug!("Creating DB row for UpdateAccountV2 instruction");
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.nostr_key,
            &instruction.mailbox,
        ]);

        tables
            .create_row("update_account_v2_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("nostr_key", &instruction.nostr_key)
            .set("mailbox", &instruction.mailbox)
            .set("acct_mail_account_v2", &instruction.acct_mail_account_v2)
            .set("acct_authority", &instruction.acct_authority);
    }

    // Process Sendmail instructions
    for instruction in &data.sendmail_instruction_list {
        substreams::log::debug!("Creating DB row for Sendmail instruction: subject={}", instruction.subject);
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.subject,
            &instruction.body,
            &instruction.from,
            &instruction.to,
            &instruction.salt,
            &instruction.iv,
            &instruction.version,
        ]);

        tables
            .create_row("sendmail_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("subject", &instruction.subject)
            .set("body", &instruction.body)
            .set("from_address", &instruction.from)
            .set("to_address", &instruction.to)
            .set("salt", &instruction.salt)
            .set("iv", &instruction.iv)
            .set("version", &instruction.version)
            .set("acct_mail", &instruction.acct_mail)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }

    // Process Register instructions
    for instruction in &data.register_instruction_list {
        substreams::log::debug!("Creating DB row for Register instruction");
        
        let pk = generate_instruction_pk(&[
            &instruction.trx_hash,
            &instruction.nostr_key,
        ]);

        tables
            .create_row("register_instruction", pk)
            .set("trx_hash", &instruction.trx_hash)
            .set("nostr_key", &instruction.nostr_key)
            .set("acct_mail_account", &instruction.acct_mail_account)
            .set("acct_authority", &instruction.acct_authority)
            .set("acct_system_program", &instruction.acct_system_program);
    }
}

/// Generate a primary key for events by hashing the provided fields
fn generate_event_pk(fields: &[&str]) -> String {
    let mut hasher = Sha256::new();
    for field in fields {
        hasher.update(field.as_bytes());
    }
    Hex::encode(hasher.finalize())
}

/// Generate a primary key for instructions by hashing the provided fields
fn generate_instruction_pk(fields: &[&str]) -> String {
    let mut hasher = Sha256::new();
    for field in fields {
        hasher.update(field.as_bytes());
    }
    Hex::encode(hasher.finalize())
}

/// Map mail label enum to integer for database storage
pub fn map_enum_mail_label(value: idl::idl::program::types::MailLabel) -> i32 {
    match value {
        idl::idl::program::types::MailLabel::Outbox => 0,
        idl::idl::program::types::MailLabel::Inbox => 1,
        idl::idl::program::types::MailLabel::Read => 2,
        idl::idl::program::types::MailLabel::Trash => 3,
        idl::idl::program::types::MailLabel::Spam => 4,
        _ => 0,
    }
}
