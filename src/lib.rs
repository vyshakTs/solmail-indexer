mod idl;
mod pb;

use sha2::{Digest, Sha256};
use substreams::Hex;
use anchor_lang::AnchorDeserialize;
use anchor_lang::Discriminator;
use base64::prelude::*;
use pb::substreams::v1::program::Data;
use pb::substreams::v1::program::MailSendEventEvent;
use pb::substreams::v1::program::MailV2SendEventEvent;
use pb::substreams::v1::program::MailV2UpdateEventEvent;
use pb::substreams::v1::program::MailV2ReadEventEvent;
use pb::substreams::v1::program::MailV2UpdateLabelEventEvent;
use pb::substreams::v1::program::MailAccountV2RegisterEventEvent;
use pb::substreams::v1::program::MailAccountV2UpdateEventEvent;
use pb::substreams::v1::program::CreatemailInstruction;
use pb::substreams::v1::program::UpdatemailInstruction;
use pb::substreams::v1::program::UpdatemailreadstatusInstruction;
use pb::substreams::v1::program::UpdatemaillabelInstruction;
use pb::substreams::v1::program::RegisterV2Instruction;
use pb::substreams::v1::program::UpdateAccountV2Instruction;
use pb::substreams::v1::program::SendmailInstruction;
use pb::substreams::v1::program::RegisterInstruction;






use sologger_log_context::programs_selector::ProgramsSelector;
use sologger_log_context::sologger_log_context::LogContext;
use substreams_solana::pb::sf::solana::r#type::v1::Block;

use substreams_database_change::pb::database::DatabaseChanges;
use substreams_database_change::tables::Tables as DatabaseChangeTables;

const PROGRAM_ID: &str = "AWzFXDVYFkiFH5SqmHQ7BBYn4L94CxZwni68vsPmXcVe";

#[substreams::handlers::map]
fn map_program_data(blk: Block) -> Data {
    let mut mail_send_event_event_list: Vec<MailSendEventEvent> = Vec::new();
    let mut mail_v2_send_event_event_list: Vec<MailV2SendEventEvent> = Vec::new();
    let mut mail_v2_update_event_event_list: Vec<MailV2UpdateEventEvent> = Vec::new();
    let mut mail_v2_read_event_event_list: Vec<MailV2ReadEventEvent> = Vec::new();
    let mut mail_v2_update_label_event_event_list: Vec<MailV2UpdateLabelEventEvent> = Vec::new();
    let mut mail_account_v2_register_event_event_list: Vec<MailAccountV2RegisterEventEvent> = Vec::new();
    let mut mail_account_v2_update_event_event_list: Vec<MailAccountV2UpdateEventEvent> = Vec::new();
    let mut createmail_instruction_list: Vec<CreatemailInstruction> = Vec::new();
    let mut updatemail_instruction_list: Vec<UpdatemailInstruction> = Vec::new();
    let mut updatemailreadstatus_instruction_list: Vec<UpdatemailreadstatusInstruction> = Vec::new();
    let mut updatemaillabel_instruction_list: Vec<UpdatemaillabelInstruction> = Vec::new();
    let mut register_v2_instruction_list: Vec<RegisterV2Instruction> = Vec::new();
    let mut update_account_v2_instruction_list: Vec<UpdateAccountV2Instruction> = Vec::new();
    let mut sendmail_instruction_list: Vec<SendmailInstruction> = Vec::new();
    let mut register_instruction_list: Vec<RegisterInstruction> = Vec::new();

    blk.transactions().for_each(|transaction| {

        // ------------- EVENTS -------------
        let meta_wrapped = &transaction.meta;
        let meta = meta_wrapped.as_ref().unwrap();
        let programs_selector: ProgramsSelector = ProgramsSelector::new(&["*".to_string()]);
        let log_contexts = LogContext::parse_logs_basic(&meta.log_messages, &programs_selector);

        log_contexts
            .iter()
            .filter(|context| context.program_id == PROGRAM_ID)
            .for_each(|context| {
                context.data_logs.iter().for_each(|data| {
                    if let Ok(decoded) = BASE64_STANDARD.decode(data) {
                        let slice_u8: &mut &[u8] = &mut &decoded[..];
                        let slice_discriminator: [u8; 8] =
                            slice_u8[0..8].try_into().expect("error");
                        let static_discriminator_slice: &'static [u8] = Box::leak(Box::new(slice_discriminator));

                        match static_discriminator_slice {
                            idl::idl::program::events::MailSendEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailSendEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_send_event_event_list.push(MailSendEventEvent {
                                        trx_hash: transaction.id(),
                                        from: event.from.to_string(),
                                        to: event.to.to_string(),
                                        id: event.id,
                                    });
                                }
                            }
                            idl::idl::program::events::MailV2SendEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailV2SendEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_v2_send_event_event_list.push(MailV2SendEventEvent {
                                        trx_hash: transaction.id(),
                                        from: event.from.to_string(),
                                        to: event.to.to_string(),
                                        id: event.id,
                                        mailbox: event.mailbox.to_string(),
                                    });
                                }
                            }
                            idl::idl::program::events::MailV2UpdateEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailV2UpdateEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_v2_update_event_event_list.push(MailV2UpdateEventEvent {
                                        trx_hash: transaction.id(),
                                        from: event.from.to_string(),
                                        to: event.to.to_string(),
                                        id: event.id,
                                        mailbox: event.mailbox.to_string(),
                                        parent_id: event.parent_id,
                                        mark_as_read: event.mark_as_read,
                                        created_at: event.created_at,
                                        subject: event.subject,
                                        body: event.body,
                                        authority: event.authority.to_string(),
                                        iv: event.iv,
                                        salt: event.salt,
                                        version: event.version,
                                    });
                                }
                            }
                            idl::idl::program::events::MailV2ReadEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailV2ReadEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_v2_read_event_event_list.push(MailV2ReadEventEvent {
                                        trx_hash: transaction.id(),
                                        id: event.id,
                                        owner: event.owner.to_string(),
                                    });
                                }
                            }
                            idl::idl::program::events::MailV2UpdateLabelEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailV2UpdateLabelEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_v2_update_label_event_event_list.push(MailV2UpdateLabelEventEvent {
                                        trx_hash: transaction.id(),
                                        id: event.id,
                                        owner: event.owner.to_string(),
                                    });
                                }
                            }
                            idl::idl::program::events::MailAccountV2RegisterEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailAccountV2RegisterEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_account_v2_register_event_event_list.push(MailAccountV2RegisterEventEvent {
                                        trx_hash: transaction.id(),
                                        owner: event.owner.to_string(),
                                        account: event.account.to_string(),
                                    });
                                }
                            }
                            idl::idl::program::events::MailAccountV2UpdateEvent::DISCRIMINATOR => {
                                if let Ok(event) =
                                    idl::idl::program::events::MailAccountV2UpdateEvent::deserialize(
                                        &mut &slice_u8[8..],
                                    )
                                {
                                    mail_account_v2_update_event_event_list.push(MailAccountV2UpdateEventEvent {
                                        trx_hash: transaction.id(),
                                        owner: event.owner.to_string(),
                                        account: event.account.to_string(),
                                    });
                                }
                            }
                            _ => {}
                        }
                    }
                });
            });// ------------- INSTRUCTIONS -------------
        transaction
        .walk_instructions()
        .into_iter()
        .filter(|inst| inst.program_id().to_string() == PROGRAM_ID)
        .for_each(|inst| {
            let slice_u8: &[u8] = &inst.data()[..];

            /*
                CPI events are contained inside the instruction data
            */
            if slice_u8.len() >= 16 {
                if &slice_u8[8..16] == idl::idl::program::events::MailSendEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailSendEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_send_event_event_list.push(MailSendEventEvent {
                            trx_hash: transaction.id(),
                            from: event.from.to_string(),
                            to: event.to.to_string(),
                            id: event.id,
                        });
                    }
                }
                if &slice_u8[8..16] == idl::idl::program::events::MailV2SendEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailV2SendEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_v2_send_event_event_list.push(MailV2SendEventEvent {
                            trx_hash: transaction.id(),
                            from: event.from.to_string(),
                            to: event.to.to_string(),
                            id: event.id,
                            mailbox: event.mailbox.to_string(),
                        });
                    }
                }
                if &slice_u8[8..16] == idl::idl::program::events::MailV2UpdateEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailV2UpdateEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_v2_update_event_event_list.push(MailV2UpdateEventEvent {
                            trx_hash: transaction.id(),
                            from: event.from.to_string(),
                            to: event.to.to_string(),
                            id: event.id,
                            mailbox: event.mailbox.to_string(),
                            parent_id: event.parent_id,
                            mark_as_read: event.mark_as_read,
                            created_at: event.created_at,
                            subject: event.subject,
                            body: event.body,
                            authority: event.authority.to_string(),
                            iv: event.iv,
                            salt: event.salt,
                            version: event.version,
                        });
                    }
                }
                if &slice_u8[8..16] == idl::idl::program::events::MailV2ReadEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailV2ReadEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_v2_read_event_event_list.push(MailV2ReadEventEvent {
                            trx_hash: transaction.id(),
                            id: event.id,
                            owner: event.owner.to_string(),
                        });
                    }
                }
                if &slice_u8[8..16] == idl::idl::program::events::MailV2UpdateLabelEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailV2UpdateLabelEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_v2_update_label_event_event_list.push(MailV2UpdateLabelEventEvent {
                            trx_hash: transaction.id(),
                            id: event.id,
                            owner: event.owner.to_string(),
                        });
                    }
                }
                if &slice_u8[8..16] == idl::idl::program::events::MailAccountV2RegisterEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailAccountV2RegisterEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_account_v2_register_event_event_list.push(MailAccountV2RegisterEventEvent {
                            trx_hash: transaction.id(),
                            owner: event.owner.to_string(),
                            account: event.account.to_string(),
                        });
                    }
                }
                if &slice_u8[8..16] == idl::idl::program::events::MailAccountV2UpdateEvent::DISCRIMINATOR {
                    if let Ok(event) =
                        idl::idl::program::events::MailAccountV2UpdateEvent::deserialize(
                            &mut &slice_u8[16..],
                        )
                    {
                        mail_account_v2_update_event_event_list.push(MailAccountV2UpdateEventEvent {
                            trx_hash: transaction.id(),
                            owner: event.owner.to_string(),
                            account: event.account.to_string(),
                        });
                    }
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Createmail::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Createmail::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    createmail_instruction_list.push(CreatemailInstruction {
                        trx_hash: transaction.id(),
                        subject: instruction.subject,
                        from: instruction.from.to_string(),
                        to: instruction.to.to_string(),
                        salt: instruction.salt,
                        iv: instruction.iv,
                        version: instruction.version,
                        parent_id: instruction.parent_id,
                        acct_mail: accts[0].to_string(),
                        acct_mail_account_v2: accts[1].to_string(),
                        acct_authority: accts[2].to_string(),
                        acct_system_program: accts[3].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Updatemail::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Updatemail::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    updatemail_instruction_list.push(UpdatemailInstruction {
                        trx_hash: transaction.id(),
                        body: instruction.body,
                        acct_mail: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                        acct_system_program: accts[2].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Updatemailreadstatus::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Updatemailreadstatus::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    updatemailreadstatus_instruction_list.push(UpdatemailreadstatusInstruction {
                        trx_hash: transaction.id(),
                        acct_mail: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                        acct_system_program: accts[2].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Updatemaillabel::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Updatemaillabel::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    updatemaillabel_instruction_list.push(UpdatemaillabelInstruction {
                        trx_hash: transaction.id(),
                        label: instruction.label as u64,
                        acct_mail: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                        acct_system_program: accts[2].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::RegisterV2::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::RegisterV2::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    register_v2_instruction_list.push(RegisterV2Instruction {
                        trx_hash: transaction.id(),
                        nostr_key: instruction.nostr_key,
                        acct_mail_account_v2: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                        acct_system_program: accts[2].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::UpdateAccountV2::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::UpdateAccountV2::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    update_account_v2_instruction_list.push(UpdateAccountV2Instruction {
                        trx_hash: transaction.id(),
                        nostr_key: instruction.nostr_key,
                        mailbox: instruction.mailbox.to_string(),
                        acct_mail_account_v2: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Sendmail::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Sendmail::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    sendmail_instruction_list.push(SendmailInstruction {
                        trx_hash: transaction.id(),
                        subject: instruction.subject,
                        body: instruction.body,
                        from: instruction.from.to_string(),
                        to: instruction.to.to_string(),
                        salt: instruction.salt,
                        iv: instruction.iv,
                        version: instruction.version,
                        acct_mail: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                        acct_system_program: accts[2].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Register::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Register::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    register_instruction_list.push(RegisterInstruction {
                        trx_hash: transaction.id(),
                        nostr_key: instruction.nostr_key,
                        acct_mail_account: accts[0].to_string(),
                        acct_authority: accts[1].to_string(),
                        acct_system_program: accts[2].to_string(),
                    });
                }
            }
        });
    });


    Data {
        mail_send_event_event_list,
        mail_v2_send_event_event_list,
        mail_v2_update_event_event_list,
        mail_v2_read_event_event_list,
        mail_v2_update_label_event_event_list,
        mail_account_v2_register_event_event_list,
        mail_account_v2_update_event_event_list,
        createmail_instruction_list,
        updatemail_instruction_list,
        updatemailreadstatus_instruction_list,
        updatemaillabel_instruction_list,
        register_v2_instruction_list,
        update_account_v2_instruction_list,
        sendmail_instruction_list,
        register_instruction_list,
    }
}

fn map_enum_mail_label(value: idl::idl::program::types::MailLabel) -> i32 {
    match value {
        idl::idl::program::types::MailLabel::Outbox => return 0,
        idl::idl::program::types::MailLabel::Inbox => return 1,
        idl::idl::program::types::MailLabel::Read => return 2,
        idl::idl::program::types::MailLabel::Trash => return 3,
        idl::idl::program::types::MailLabel::Spam => return 4,
        _ => 0,
    }
}


#[substreams::handlers::map]
fn db_out(data: Data) -> DatabaseChanges {
    let mut tables: DatabaseChangeTables = DatabaseChangeTables::new();

    // Process MailSendEvent events
    for event in data.mail_send_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.from);
        hasher.update(&event.to);
        hasher.update(&event.id);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_send_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("from_address", event.from)
            .set("to_address", event.to)
            .set("mail_id", event.id);
    }

    // Process MailV2SendEvent events
    for event in data.mail_v2_send_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.from);
        hasher.update(&event.to);
        hasher.update(&event.id);
        hasher.update(&event.mailbox);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_v2_send_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("from_address", event.from)
            .set("to_address", event.to)
            .set("mail_id", event.id)
            .set("mailbox", event.mailbox);
    }

    // Process MailV2UpdateEvent events
    for event in data.mail_v2_update_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.from);
        hasher.update(&event.to);
        hasher.update(&event.id);
        hasher.update(&event.mailbox);
        hasher.update(&event.parent_id);
        hasher.update(&[event.mark_as_read as u8]);
        hasher.update(event.created_at.to_le_bytes());
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_v2_update_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("from_address", event.from)
            .set("to_address", event.to)
            .set("mail_id", event.id)
            .set("mailbox", event.mailbox)
            .set("parent_id", event.parent_id)
            .set("mark_as_read", event.mark_as_read.to_string())
            .set("created_at_timestamp", event.created_at.to_string())
            .set("subject", event.subject)
            .set("body", event.body)
            .set("authority", event.authority)
            .set("iv", event.iv)
            .set("salt", event.salt)
            .set("version", event.version);
    }

    // Process MailV2ReadEvent events
    for event in data.mail_v2_read_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.id);
        hasher.update(&event.owner);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_v2_read_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("mail_id", event.id)
            .set("owner", event.owner);
    }

    // Process MailV2UpdateLabelEvent events
    for event in data.mail_v2_update_label_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.id);
        hasher.update(&event.owner);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_v2_update_label_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("mail_id", event.id)
            .set("owner", event.owner);
    }

    // Process MailAccountV2RegisterEvent events
    for event in data.mail_account_v2_register_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.owner);
        hasher.update(&event.account);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_account_v2_register_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("owner", event.owner)
            .set("account", event.account);
    }

    // Process MailAccountV2UpdateEvent events
    for event in data.mail_account_v2_update_event_event_list {
        let mut hasher = Sha256::new();
        hasher.update(&event.trx_hash);
        hasher.update(&event.owner);
        hasher.update(&event.account);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("mail_account_v2_update_event", pk)
            .set("trx_hash", event.trx_hash)
            .set("owner", event.owner)
            .set("account", event.account);
    }

    // Process Createmail instructions
    for instruction in data.createmail_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.subject);
        hasher.update(&instruction.from);
        hasher.update(&instruction.to);
        hasher.update(&instruction.salt);
        hasher.update(&instruction.iv);
        hasher.update(&instruction.version);
        hasher.update(&instruction.parent_id);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("createmail_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("subject", instruction.subject)
            .set("from_address", instruction.from)
            .set("to_address", instruction.to)
            .set("salt", instruction.salt)
            .set("iv", instruction.iv)
            .set("version", instruction.version)
            .set("parent_id", instruction.parent_id)
            .set("acct_mail", instruction.acct_mail)
            .set("acct_mail_account_v2", instruction.acct_mail_account_v2)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    // Process Updatemail instructions
    for instruction in data.updatemail_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.body);
        hasher.update(&instruction.acct_mail);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("updatemail_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("body", instruction.body)
            .set("acct_mail", instruction.acct_mail)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    // Process Updatemailreadstatus instructions
    for instruction in data.updatemailreadstatus_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.acct_mail);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("updatemailreadstatus_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("acct_mail", instruction.acct_mail)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    // Process Updatemaillabel instructions
    for instruction in data.updatemaillabel_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(instruction.label.to_le_bytes());
        hasher.update(&instruction.acct_mail);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("updatemaillabel_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("label", instruction.label.to_string())
            .set("acct_mail", instruction.acct_mail)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    // Process RegisterV2 instructions
    for instruction in data.register_v2_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.nostr_key);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("register_v2_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("nostr_key", instruction.nostr_key)
            .set("acct_mail_account_v2", instruction.acct_mail_account_v2)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    // Process UpdateAccountV2 instructions
    for instruction in data.update_account_v2_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.nostr_key);
        hasher.update(&instruction.mailbox);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("update_account_v2_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("nostr_key", instruction.nostr_key)
            .set("mailbox", instruction.mailbox)
            .set("acct_mail_account_v2", instruction.acct_mail_account_v2)
            .set("acct_authority", instruction.acct_authority);
    }

    // Process Sendmail instructions
    for instruction in data.sendmail_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.subject);
        hasher.update(&instruction.body);
        hasher.update(&instruction.from);
        hasher.update(&instruction.to);
        hasher.update(&instruction.salt);
        hasher.update(&instruction.iv);
        hasher.update(&instruction.version);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("sendmail_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("subject", instruction.subject)
            .set("body", instruction.body)
            .set("from_address", instruction.from)
            .set("to_address", instruction.to)
            .set("salt", instruction.salt)
            .set("iv", instruction.iv)
            .set("version", instruction.version)
            .set("acct_mail", instruction.acct_mail)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    // Process Register instructions
    for instruction in data.register_instruction_list {
        let mut hasher = Sha256::new();
        hasher.update(&instruction.trx_hash);
        hasher.update(&instruction.nostr_key);
        let pk = Hex::encode(hasher.finalize());

        tables
            .create_row("register_instruction", pk)
            .set("trx_hash", instruction.trx_hash)
            .set("nostr_key", instruction.nostr_key)
            .set("acct_mail_account", instruction.acct_mail_account)
            .set("acct_authority", instruction.acct_authority)
            .set("acct_system_program", instruction.acct_system_program);
    }

    return tables.to_database_changes();
}





