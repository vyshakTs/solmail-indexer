use anchor_lang::Discriminator;
use base64::prelude::*;
use sologger_log_context::programs_selector::ProgramsSelector;
use sologger_log_context::sologger_log_context::LogContext;
use substreams_solana::pb::sf::solana::r#type::v1::Block;

use crate::idl;
use crate::pb::substreams::v1::program::*;
use crate::deserializers::*;
use crate::PROGRAM_ID;

/// Main substreams handler for processing mail program data
#[substreams::handlers::map]
pub fn map_program_data(blk: Block) -> Data {
    substreams::log::info!("=== PROCESSING BLOCK {} ===", blk.slot);
    substreams::log::info!("Block has {} transactions", blk.transactions.len());

    // Initialize result vectors
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

    // Process each transaction
    blk.transactions().for_each(|transaction| {
        let tx_id = transaction.id();
        substreams::log::debug!("Processing transaction: {}", tx_id);

        // Process events from transaction logs
        process_transaction_events(
            &transaction,
            &mut mail_send_event_event_list,
            &mut mail_v2_send_event_event_list,
            &mut mail_v2_update_event_event_list,
            &mut mail_v2_read_event_event_list,
            &mut mail_v2_update_label_event_event_list,
            &mut mail_account_v2_register_event_event_list,
            &mut mail_account_v2_update_event_event_list,
        );

        // Process instructions
        process_transaction_instructions(
            &transaction,
            &mut createmail_instruction_list,
            &mut updatemail_instruction_list,
            &mut updatemailreadstatus_instruction_list,
            &mut updatemaillabel_instruction_list,
            &mut register_v2_instruction_list,
            &mut update_account_v2_instruction_list,
            &mut sendmail_instruction_list,
            &mut register_instruction_list,
        );
    });

    // Log summary
    let total_events = mail_send_event_event_list.len() + 
                      mail_v2_send_event_event_list.len() + 
                      mail_v2_update_event_event_list.len() + 
                      mail_v2_read_event_event_list.len() + 
                      mail_v2_update_label_event_event_list.len() + 
                      mail_account_v2_register_event_event_list.len() + 
                      mail_account_v2_update_event_event_list.len();

    let total_instructions = createmail_instruction_list.len() + 
                           updatemail_instruction_list.len() + 
                           updatemailreadstatus_instruction_list.len() + 
                           updatemaillabel_instruction_list.len() + 
                           register_v2_instruction_list.len() + 
                           update_account_v2_instruction_list.len() + 
                           sendmail_instruction_list.len() + 
                           register_instruction_list.len();

    substreams::log::info!("=== BLOCK {} SUMMARY ===", blk.slot);
    substreams::log::info!("Total events found: {}", total_events);
    substreams::log::info!("- MailSendEvent: {}", mail_send_event_event_list.len());
    substreams::log::info!("- MailV2SendEvent: {}", mail_v2_send_event_event_list.len());
    substreams::log::info!("- MailV2UpdateEvent: {}", mail_v2_update_event_event_list.len());
    substreams::log::info!("- MailV2ReadEvent: {}", mail_v2_read_event_event_list.len());
    substreams::log::info!("- MailV2UpdateLabelEvent: {}", mail_v2_update_label_event_event_list.len());
    substreams::log::info!("- MailAccountV2RegisterEvent: {}", mail_account_v2_register_event_event_list.len());
    substreams::log::info!("- MailAccountV2UpdateEvent: {}", mail_account_v2_update_event_event_list.len());
    substreams::log::info!("Total instructions found: {}", total_instructions);

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

/// Process events from transaction logs
#[allow(clippy::too_many_arguments)]
fn process_transaction_events(
    transaction: &substreams_solana::pb::sf::solana::r#type::v1::ConfirmedTransaction,
    mail_send_event_event_list: &mut Vec<MailSendEventEvent>,
    mail_v2_send_event_event_list: &mut Vec<MailV2SendEventEvent>,
    mail_v2_update_event_event_list: &mut Vec<MailV2UpdateEventEvent>,
    mail_v2_read_event_event_list: &mut Vec<MailV2ReadEventEvent>,
    mail_v2_update_label_event_event_list: &mut Vec<MailV2UpdateLabelEventEvent>,
    mail_account_v2_register_event_event_list: &mut Vec<MailAccountV2RegisterEventEvent>,
    mail_account_v2_update_event_event_list: &mut Vec<MailAccountV2UpdateEventEvent>,
) {
    let meta_wrapped = &transaction.meta;
    if meta_wrapped.is_none() {
        return;
    }
    let meta = meta_wrapped.as_ref().unwrap();

    if meta.err.is_some() {
        return;
    }

    let programs_selector: ProgramsSelector = ProgramsSelector::new(&["*".to_string()]);
    let log_contexts = LogContext::parse_logs_basic(&meta.log_messages, &programs_selector);

    log_contexts
        .iter()
        .filter(|context| context.program_id == PROGRAM_ID)
        .for_each(|context| {
            context.data_logs.iter().for_each(|data| {
                if let Ok(decoded) = BASE64_STANDARD.decode(data) {
                    if decoded.len() < 8 {
                        return;
                    }

                    let slice_discriminator: [u8; 8] = decoded[0..8].try_into().expect("error");
                    let static_discriminator_slice: &'static [u8] = Box::leak(Box::new(slice_discriminator));

                    match static_discriminator_slice {
                        idl::idl::program::events::MailSendEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_send_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailSendEvent: from={}, to={}, id={}", 
                                    event.from, event.to, event.id);
                                
                                mail_send_event_event_list.push(MailSendEventEvent {
                                    trx_hash: transaction.id(),
                                    from: event.from.to_string(),
                                    to: event.to.to_string(),
                                    id: event.id,
                                });
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailSendEvent");
                            }
                        }
                        idl::idl::program::events::MailV2SendEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_v2_send_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailV2SendEvent: from={}, to={}, id={}, mailbox={}", 
                                    event.from, event.to, event.id, event.mailbox);
                                
                                mail_v2_send_event_event_list.push(MailV2SendEventEvent {
                                    trx_hash: transaction.id(),
                                    from: event.from.to_string(),
                                    to: event.to.to_string(),
                                    id: event.id,
                                    mailbox: event.mailbox.to_string(),
                                });
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailV2SendEvent");
                            }
                        }
                        idl::idl::program::events::MailV2UpdateEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_v2_update_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailV2UpdateEvent: from={}, to={}, id={}, subject={}", 
                                    event.from, event.to, event.id, event.subject);
                                
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
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailV2UpdateEvent");
                            }
                        }
                        idl::idl::program::events::MailV2ReadEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_v2_read_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailV2ReadEvent: id={}, owner={}", 
                                    event.id, event.owner);
                                
                                mail_v2_read_event_event_list.push(MailV2ReadEventEvent {
                                    trx_hash: transaction.id(),
                                    id: event.id,
                                    owner: event.owner.to_string(),
                                });
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailV2ReadEvent");
                            }
                        }
                        idl::idl::program::events::MailV2UpdateLabelEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_v2_update_label_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailV2UpdateLabelEvent: id={}, owner={}", 
                                    event.id, event.owner);
                                
                                mail_v2_update_label_event_event_list.push(MailV2UpdateLabelEventEvent {
                                    trx_hash: transaction.id(),
                                    id: event.id,
                                    owner: event.owner.to_string(),
                                });
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailV2UpdateLabelEvent");
                            }
                        }
                        idl::idl::program::events::MailAccountV2RegisterEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_account_v2_register_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailAccountV2RegisterEvent: owner={}, account={}", 
                                    event.owner, event.account);
                                
                                mail_account_v2_register_event_event_list.push(MailAccountV2RegisterEventEvent {
                                    trx_hash: transaction.id(),
                                    owner: event.owner.to_string(),
                                    account: event.account.to_string(),
                                });
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailAccountV2RegisterEvent");
                            }
                        }
                        idl::idl::program::events::MailAccountV2UpdateEvent::DISCRIMINATOR => {
                            if let Ok(event) = deserialize_mail_account_v2_update_event(&decoded[8..]) {
                                substreams::log::info!("✅ Successfully processed MailAccountV2UpdateEvent: owner={}, account={}", 
                                    event.owner, event.account);
                                
                                mail_account_v2_update_event_event_list.push(MailAccountV2UpdateEventEvent {
                                    trx_hash: transaction.id(),
                                    owner: event.owner.to_string(),
                                    account: event.account.to_string(),
                                });
                            } else {
                                substreams::log::debug!("❌ Failed to deserialize MailAccountV2UpdateEvent");
                            }
                        }
                        _ => {
                            substreams::log::debug!("Unknown event discriminator: {:?}", slice_discriminator);
                        }
                    }
                }
            });
        });
}

/// Process instructions from transaction
#[allow(clippy::too_many_arguments)]
fn process_transaction_instructions(
    transaction: &substreams_solana::pb::sf::solana::r#type::v1::ConfirmedTransaction,
    createmail_instruction_list: &mut Vec<CreatemailInstruction>,
    updatemail_instruction_list: &mut Vec<UpdatemailInstruction>,
    updatemailreadstatus_instruction_list: &mut Vec<UpdatemailreadstatusInstruction>,
    updatemaillabel_instruction_list: &mut Vec<UpdatemaillabelInstruction>,
    register_v2_instruction_list: &mut Vec<RegisterV2Instruction>,
    update_account_v2_instruction_list: &mut Vec<UpdateAccountV2Instruction>,
    sendmail_instruction_list: &mut Vec<SendmailInstruction>,
    register_instruction_list: &mut Vec<RegisterInstruction>,
) {
    let instructions: Vec<_> = transaction
        .walk_instructions()
        .into_iter()
        .filter(|inst| inst.program_id().to_string() == PROGRAM_ID)
        .collect();

    instructions.iter().for_each(|inst| {
        let slice_u8: &[u8] = &inst.data()[..];

        if slice_u8.len() >= 8 {
            if &slice_u8[0..8] == idl::idl::program::client::args::Createmail::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_createmail_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed Createmail instruction: subject={}", instruction.subject);
                    
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
                        acct_mail: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_mail_account_v2: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(3).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize Createmail instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::Updatemail::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_updatemail_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed Updatemail instruction");
                    
                    let accts = inst.accounts();
                    updatemail_instruction_list.push(UpdatemailInstruction {
                        trx_hash: transaction.id(),
                        body: instruction.body,
                        acct_mail: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize Updatemail instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::Updatemailreadstatus::DISCRIMINATOR {
                if let Ok(_instruction) = deserialize_updatemailreadstatus_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed Updatemailreadstatus instruction");
                    
                    let accts = inst.accounts();
                    updatemailreadstatus_instruction_list.push(UpdatemailreadstatusInstruction {
                        trx_hash: transaction.id(),
                        acct_mail: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize Updatemailreadstatus instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::Updatemaillabel::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_updatemaillabel_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed Updatemaillabel instruction");
                    
                    let accts = inst.accounts();
                    updatemaillabel_instruction_list.push(UpdatemaillabelInstruction {
                        trx_hash: transaction.id(),
                        label: instruction.label as u64,
                        acct_mail: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize Updatemaillabel instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::RegisterV2::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_register_v2_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed RegisterV2 instruction");
                    
                    let accts = inst.accounts();
                    register_v2_instruction_list.push(RegisterV2Instruction {
                        trx_hash: transaction.id(),
                        nostr_key: instruction.nostr_key,
                        acct_mail_account_v2: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize RegisterV2 instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::UpdateAccountV2::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_update_account_v2_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed UpdateAccountV2 instruction");
                    
                    let accts = inst.accounts();
                    update_account_v2_instruction_list.push(UpdateAccountV2Instruction {
                        trx_hash: transaction.id(),
                        nostr_key: instruction.nostr_key,
                        mailbox: instruction.mailbox.to_string(),
                        acct_mail_account_v2: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize UpdateAccountV2 instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::Sendmail::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_sendmail_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed Sendmail instruction: subject={}", instruction.subject);
                    
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
                        acct_mail: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize Sendmail instruction");
                }
            }
            else if &slice_u8[0..8] == idl::idl::program::client::args::Register::DISCRIMINATOR {
                if let Ok(instruction) = deserialize_register_instruction(&slice_u8[8..]) {
                    substreams::log::info!("✅ Successfully processed Register instruction");
                    
                    let accts = inst.accounts();
                    register_instruction_list.push(RegisterInstruction {
                        trx_hash: transaction.id(),
                        nostr_key: instruction.nostr_key,
                        acct_mail_account: accts.get(0).map(|a| a.to_string()).unwrap_or_default(),
                        acct_authority: accts.get(1).map(|a| a.to_string()).unwrap_or_default(),
                        acct_system_program: accts.get(2).map(|a| a.to_string()).unwrap_or_default(),
                    });
                } else {
                    substreams::log::debug!("❌ Failed to deserialize Register instruction");
                }
            }
        }
    });
}
