//! Notion Tools MCP Server
//!
//! Exposes Notion data processing tools via the Model Context Protocol.
//! Run as a stdio-based JSON-RPC server.

fn main() {
    notion_tools::mcp::run_server();
}
