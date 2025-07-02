use crate::types::*;
use crate::deserializers::helpers::*;

/// Deserialize MailSendEvent from binary data
pub fn deserialize_mail_send_event(data: &[u8]) -> Result<MailSendEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let from = parse_pubkey(data, &mut offset)?;
    let to = parse_pubkey(data, &mut offset)?;
    let id = parse_string(data, &mut offset)?;
    
    Ok(MailSendEventCustom { from, to, id })
}

/// Deserialize MailV2SendEvent from binary data
pub fn deserialize_mail_v2_send_event(data: &[u8]) -> Result<MailV2SendEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let from = parse_pubkey(data, &mut offset)?;
    let to = parse_pubkey(data, &mut offset)?;
    let id = parse_string(data, &mut offset)?;
    let mailbox = parse_pubkey(data, &mut offset)?;
    
    Ok(MailV2SendEventCustom { from, to, id, mailbox })
}

/// Deserialize MailV2UpdateEvent from binary data
pub fn deserialize_mail_v2_update_event(data: &[u8]) -> Result<MailV2UpdateEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let from = parse_pubkey(data, &mut offset)?;
    let to = parse_pubkey(data, &mut offset)?;
    let id = parse_string(data, &mut offset)?;
    let mailbox = parse_pubkey(data, &mut offset)?;
    let parent_id = parse_string(data, &mut offset)?;
    let mark_as_read = parse_bool(data, &mut offset)?;
    let created_at = parse_u32(data, &mut offset)?;
    let subject = parse_string(data, &mut offset)?;
    let body = parse_string(data, &mut offset)?;
    let authority = parse_pubkey(data, &mut offset)?;
    let iv = parse_string(data, &mut offset)?;
    let salt = parse_string(data, &mut offset)?;
    let version = parse_string(data, &mut offset)?;
    
    Ok(MailV2UpdateEventCustom {
        from, 
        to, 
        id, 
        mailbox, 
        parent_id, 
        mark_as_read, 
        created_at,
        subject, 
        body, 
        authority, 
        iv, 
        salt, 
        version
    })
}

/// Deserialize MailV2ReadEvent from binary data
pub fn deserialize_mail_v2_read_event(data: &[u8]) -> Result<MailV2ReadEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let id = parse_string(data, &mut offset)?;
    let owner = parse_pubkey(data, &mut offset)?;
    
    Ok(MailV2ReadEventCustom { id, owner })
}

/// Deserialize MailV2UpdateLabelEvent from binary data
pub fn deserialize_mail_v2_update_label_event(data: &[u8]) -> Result<MailV2UpdateLabelEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let id = parse_string(data, &mut offset)?;
    let owner = parse_pubkey(data, &mut offset)?;
    
    Ok(MailV2UpdateLabelEventCustom { id, owner })
}

/// Deserialize MailAccountV2RegisterEvent from binary data
pub fn deserialize_mail_account_v2_register_event(data: &[u8]) -> Result<MailAccountV2RegisterEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let owner = parse_pubkey(data, &mut offset)?;
    let account = parse_pubkey(data, &mut offset)?;
    
    Ok(MailAccountV2RegisterEventCustom { owner, account })
}

/// Deserialize MailAccountV2UpdateEvent from binary data
pub fn deserialize_mail_account_v2_update_event(data: &[u8]) -> Result<MailAccountV2UpdateEventCustom, DeserializationError> {
    let mut offset = 0;
    
    let owner = parse_pubkey(data, &mut offset)?;
    let account = parse_pubkey(data, &mut offset)?;
    
    Ok(MailAccountV2UpdateEventCustom { owner, account })
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    #[test]
    fn test_deserialize_mail_send_event() {
        // Create test data: 32 bytes (from) + 32 bytes (to) + 4 bytes (len) + string
        let mut data = vec![0u8; 64]; // 64 zero bytes for pubkeys
        data.extend_from_slice(&[5u8, 0, 0, 0]); // length = 5
        data.extend_from_slice(b"test1"); // id string
        
        let result = deserialize_mail_send_event(&data).unwrap();
        assert_eq!(result.id, "test1");
    }

    #[test]
    fn test_deserialize_mail_v2_send_event() {
        // Create test data: 32 bytes (from) + 32 bytes (to) + 4 bytes (len) + string + 32 bytes (mailbox)
        let mut data = vec![0u8; 64]; // 64 zero bytes for from/to pubkeys
        data.extend_from_slice(&[5u8, 0, 0, 0]); // length = 5
        data.extend_from_slice(b"test2"); // id string
        data.extend_from_slice(&[0u8; 32]); // 32 zero bytes for mailbox pubkey
        
        let result = deserialize_mail_v2_send_event(&data).unwrap();
        assert_eq!(result.id, "test2");
    }
}
