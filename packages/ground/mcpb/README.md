# Ground MCP - Claude Desktop Extension

This directory contains the files needed to build a `.mcpb` Desktop Extension for Claude Desktop.

## Building the Extension

### Prerequisites

1. Install the MCPB CLI:
   ```bash
   npm install -g @anthropic-ai/mcpb
   ```

2. Download the platform-specific binaries from the [releases page](https://github.com/createsomethingtoday/create-something-monorepo/releases)

### Build Steps

1. Create the `bin/` directory:
   ```bash
   mkdir -p bin
   ```

2. Copy the binary for your target platform:
   ```bash
   # macOS (arm64)
   cp ../target/release/ground-mcp bin/ground-mcp
   
   # Or from release artifacts
   tar -xzf ground-darwin-arm64.tar.gz -C bin/
   ```

3. Make the binary executable:
   ```bash
   chmod +x bin/ground-mcp
   ```

4. Pack the extension:
   ```bash
   mcpb pack
   ```

This creates `ground-0.2.0.mcpb`.

### Multi-Platform Builds

For distribution, build separate `.mcpb` files for each platform:

```bash
# macOS arm64
mkdir -p bin && cp ground-darwin-arm64/ground-mcp bin/
mcpb pack -o ground-0.2.0-darwin-arm64.mcpb

# macOS x64 (via Rosetta)
# Same binary works on Intel Macs via Rosetta

# Linux x64
mkdir -p bin && cp ground-linux-x64/ground-mcp bin/
mcpb pack -o ground-0.2.0-linux-x64.mcpb

# Windows x64
mkdir -p bin && cp ground-win32-x64/ground-mcp.exe bin/
mcpb pack -o ground-0.2.0-win32-x64.mcpb
```

## Installation

### Manual Installation

1. Download the `.mcpb` file for your platform
2. Double-click to open in Claude Desktop
3. Review permissions and click Install

### From Source

Users can also install via npm:
```bash
npm install -g @createsomething/ground-mcp
```

Then add to Claude Desktop config manually.

## Files

- `manifest.json` - Extension metadata and tool declarations
- `index.js` - Node.js wrapper that spawns the native binary
- `bin/` - Native binary (not committed, added during build)

## Testing

After packing, test the extension:

1. Install in Claude Desktop
2. Open a conversation
3. Ask Claude to "find duplicate functions in this directory"
4. Verify Ground tools are available and working

## Submitting to Anthropic Directory

See [Local MCP Server Submission Guide](https://support.claude.com/en/articles/12922832-local-mcp-server-submission-guide) for requirements:

- Mandatory tool annotations
- Privacy policy
- At least 3 working examples
- Testing credentials (if applicable)
