fn main() {
    // Compile protocol buffers
    prost_build::Config::new()
        .out_dir("src/pb")
        .compile_protos(&["proto/program.proto"], &["proto/"])
        .expect("Failed to compile protobufs");
}