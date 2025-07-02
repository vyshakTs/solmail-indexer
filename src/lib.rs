mod idl;
mod pb;
mod types;
mod deserializers;
mod handlers;

// Re-export main handlers for substreams
pub use handlers::{map_program_data, db_out};

// Constants
pub const PROGRAM_ID: &str = "Mai1UbiFBUvDnE2DDRxp765sRtX792zw24cgSpcgrz1";
