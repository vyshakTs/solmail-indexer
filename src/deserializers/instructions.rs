use crate::types::*;
use crate::deserializers::helpers::*;

/// Deserialize Createmail instruction from binary data
pub fn deserialize_createmail_instruction(data: &[u8]) -> Result<CreatemailCustom, DeserializationError> {
    let mut offset = 0;
    
    let subject = parse_string(data, &mut offset)?;
    let from = parse_pubkey(data, &mut offset)?;
    let to = parse_pubkey(data, &mut offset)?;
    let salt = parse_string(data, &mut offset)?;
    let iv = parse_string(data, &mut offset)?;
    let version = parse_string(data, &mut offset)?;
    let parent_id = parse_string(data, &mut offset)?;
    
    Ok(CreatemailCustom { 
        subject, 
        from, 
        to, 
        salt, 
        iv, 
        version, 
        parent_id 
    })
}

/// Deserialize Updatemail instruction from binary data
pub fn deserialize_updatemail_instruction(data: &[u8]) -> Result<UpdatemailCustom, DeserializationError> {
    let mut offset = 0;
    let body = parse_string(data, &mut offset)?;
    
    Ok(UpdatemailCustom { body })
}

/// Deserialize Updatemailreadstatus instruction from binary data
/// This instruction has no additional data beyond the discriminator
pub fn deserialize_updatemailreadstatus_instruction(_data: &[u8]) -> Result<UpdatemailreadstatusCustom, DeserializationError> {
    Ok(UpdatemailreadstatusCustom {})
}

/// Deserialize Updatemaillabel instruction from binary data
pub fn deserialize_updatemaillabel_instruction(data: &[u8]) -> Result<UpdatemaillabelCustom, DeserializationError> {
    let mut offset = 0;
    let label = parse_u32(data, &mut offset)?;
    
    Ok(UpdatemaillabelCustom { label })
}

/// Deserialize RegisterV2 instruction from binary data
pub fn deserialize_register_v2_instruction(data: &[u8]) -> Result<RegisterV2Custom, DeserializationError> {
    let mut offset = 0;
    let nostr_key = parse_string(data, &mut offset)?;
    
    Ok(RegisterV2Custom { nostr_key })
}

/// Deserialize UpdateAccountV2 instruction from binary data
pub fn deserialize_update_account_v2_instruction(data: &[u8]) -> Result<UpdateAccountV2Custom, DeserializationError> {
    let mut offset = 0;
    
    let nostr_key = parse_string(data, &mut offset)?;
    let mailbox = parse_pubkey(data, &mut offset)?;
    
    Ok(UpdateAccountV2Custom { nostr_key, mailbox })
}

/// Deserialize Sendmail instruction from binary data
pub fn deserialize_sendmail_instruction(data: &[u8]) -> Result<SendmailCustom, DeserializationError> {
    let mut offset = 0;
    
    let subject = parse_string(data, &mut offset)?;
    let body = parse_string(data, &mut offset)?;
    let from = parse_pubkey(data, &mut offset)?;
    let to = parse_pubkey(data, &mut offset)?;
    let salt = parse_string(data, &mut offset)?;
    let iv = parse_string(data, &mut offset)?;
    let version = parse_string(data, &mut offset)?;
    
    Ok(SendmailCustom { 
        subject, 
        body, 
        from, 
        to, 
        salt, 
        iv, 
        version 
    })
}

/// Deserialize Register instruction from binary data
pub fn deserialize_register_instruction(data: &[u8]) -> Result<RegisterCustom, DeserializationError> {
    let mut offset = 0;
    let nostr_key = parse_string(data, &mut offset)?;
    
    Ok(RegisterCustom { nostr_key })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_createmail_instruction() {
        // Create minimal test data for createmail instruction
        let mut data = Vec::new();
        
        // Subject: "Test" (4 bytes length + 4 bytes string)
        data.extend_from_slice(&[4u8, 0, 0, 0]);
        data.extend_from_slice(b"Test");
        
        // From pubkey (32 bytes)
        data.extend_from_slice(&[0u8; 32]);
        
        // To pubkey (32 bytes)
        data.extend_from_slice(&[0u8; 32]);
        
        // Salt: "salt" (4 bytes length + 4 bytes string)
        data.extend_from_slice(&[4u8, 0, 0, 0]);
        data.extend_from_slice(b"salt");
        
        // IV: "iv" (4 bytes length + 2 bytes string)
        data.extend_from_slice(&[2u8, 0, 0, 0]);
        data.extend_from_slice(b"iv");
        
        // Version: "1.0" (4 bytes length + 3 bytes string)
        data.extend_from_slice(&[3u8, 0, 0, 0]);
        data.extend_from_slice(b"1.0");
        
        // Parent ID: "0" (4 bytes length + 1 byte string)
        data.extend_from_slice(&[1u8, 0, 0, 0]);
        data.extend_from_slice(b"0");
        
        let result = deserialize_createmail_instruction(&data).unwrap();
        assert_eq!(result.subject, "Test");
        assert_eq!(result.salt, "salt");
        assert_eq!(result.iv, "iv");
        assert_eq!(result.version, "1.0");
        assert_eq!(result.parent_id, "0");
    }

    #[test]
    fn test_deserialize_updatemail_instruction() {
        let mut data = Vec::new();
        
        // Body: "Updated content" (4 bytes length + 15 bytes string)
        data.extend_from_slice(&[15u8, 0, 0, 0]);
        data.extend_from_slice(b"Updated content");
        
        let result = deserialize_updatemail_instruction(&data).unwrap();
        assert_eq!(result.body, "Updated content");
    }

    #[test]
    fn test_deserialize_updatemailreadstatus_instruction() {
        let data = Vec::new(); // Empty data since this instruction has no fields
        let result = deserialize_updatemailreadstatus_instruction(&data).unwrap();
        // Just ensure it doesn't panic
    }

    #[test]
    fn test_deserialize_updatemaillabel_instruction() {
        let data = vec![2u8, 0, 0, 0]; // label = 2
        let result = deserialize_updatemaillabel_instruction(&data).unwrap();
        assert_eq!(result.label, 2);
    }
}
