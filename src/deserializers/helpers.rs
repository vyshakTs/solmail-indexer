use anchor_lang::prelude::Pubkey;

/// Custom error type for deserialization
#[derive(Debug)]
pub struct DeserializationError {
    pub message: String,
}

impl std::fmt::Display for DeserializationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Deserialization error: {}", self.message)
    }
}

impl std::error::Error for DeserializationError {}

impl From<&str> for DeserializationError {
    fn from(message: &str) -> Self {
        DeserializationError {
            message: message.to_string(),
        }
    }
}

impl From<String> for DeserializationError {
    fn from(message: String) -> Self {
        DeserializationError { message }
    }
}

impl From<std::string::FromUtf8Error> for DeserializationError {
    fn from(err: std::string::FromUtf8Error) -> Self {
        DeserializationError {
            message: format!("UTF-8 conversion error: {}", err),
        }
    }
}

impl From<std::array::TryFromSliceError> for DeserializationError {
    fn from(err: std::array::TryFromSliceError) -> Self {
        DeserializationError {
            message: format!("Array conversion error: {}", err),
        }
    }
}

/// Parse a length-prefixed string from binary data
/// 
/// Format: 4-byte little-endian length + string bytes
pub fn parse_string(data: &[u8], offset: &mut usize) -> Result<String, DeserializationError> {
    if data.len() < *offset + 4 {
        return Err("Data too short for string length".into());
    }
    
    let str_len = u32::from_le_bytes([
        data[*offset], 
        data[*offset + 1], 
        data[*offset + 2], 
        data[*offset + 3]
    ]) as usize;
    *offset += 4;
    
    if data.len() < *offset + str_len {
        return Err(format!(
            "Data too short for string content: need {} bytes, have {}", 
            str_len, 
            data.len() - *offset
        ).into());
    }
    
    let string_value = String::from_utf8(data[*offset..*offset + str_len].to_vec())?;
    *offset += str_len;
    
    Ok(string_value)
}

/// Parse a 32-byte Pubkey from binary data
pub fn parse_pubkey(data: &[u8], offset: &mut usize) -> Result<Pubkey, DeserializationError> {
    if data.len() < *offset + 32 {
        return Err(format!(
            "Data too short for pubkey: need 32 bytes, have {}", 
            data.len() - *offset
        ).into());
    }
    
    let pubkey_bytes: [u8; 32] = data[*offset..*offset + 32].try_into()?;
    let pubkey = Pubkey::new_from_array(pubkey_bytes);
    *offset += 32;
    
    Ok(pubkey)
}

/// Parse a u32 from binary data (little-endian)
pub fn parse_u32(data: &[u8], offset: &mut usize) -> Result<u32, DeserializationError> {
    if data.len() < *offset + 4 {
        return Err("Data too short for u32".into());
    }
    
    let value = u32::from_le_bytes([
        data[*offset], 
        data[*offset + 1], 
        data[*offset + 2], 
        data[*offset + 3]
    ]);
    *offset += 4;
    
    Ok(value)
}

/// Parse a boolean from binary data (1 byte)
pub fn parse_bool(data: &[u8], offset: &mut usize) -> Result<bool, DeserializationError> {
    if data.len() < *offset + 1 {
        return Err("Data too short for boolean".into());
    }
    
    let value = data[*offset] != 0;
    *offset += 1;
    
    Ok(value)
}

/// Validate that we have enough data remaining
pub fn validate_remaining_bytes(data: &[u8], offset: usize, needed: usize, context: &str) -> Result<(), DeserializationError> {
    if data.len() < offset + needed {
        return Err(format!(
            "Data too short for {}: need {} bytes, have {}", 
            context, 
            needed, 
            data.len() - offset
        ).into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_string() {
        let data = vec![
            0x05, 0x00, 0x00, 0x00, // length = 5
            0x48, 0x65, 0x6c, 0x6c, 0x6f // "Hello"
        ];
        let mut offset = 0;
        let result = parse_string(&data, &mut offset).unwrap();
        assert_eq!(result, "Hello");
        assert_eq!(offset, 9);
    }

    #[test]
    fn test_parse_u32() {
        let data = vec![0x2A, 0x00, 0x00, 0x00]; // 42 in little-endian
        let mut offset = 0;
        let result = parse_u32(&data, &mut offset).unwrap();
        assert_eq!(result, 42);
        assert_eq!(offset, 4);
    }

    #[test]
    fn test_parse_bool() {
        let data = vec![0x01, 0x00];
        let mut offset = 0;
        
        let result1 = parse_bool(&data, &mut offset).unwrap();
        assert_eq!(result1, true);
        assert_eq!(offset, 1);
        
        let result2 = parse_bool(&data, &mut offset).unwrap();
        assert_eq!(result2, false);
        assert_eq!(offset, 2);
    }
}
