# LSP Quick Reference

One-page cheat sheet for TypeScript code navigation.

## When to Use What

| Task | Tool | Why |
|------|------|-----|
| **"Where is this function used?"** | LSP `find_references` | Actual usages only (no imports/comments) |
| **"What type is this?"** | LSP `hover` | TypeScript type info |
| **"Rename across packages"** | LSP `rename_symbol` | Safe refactoring |
| **"Show all errors"** | LSP `diagnostics` | Compiler diagnostics |
| **Search CSS tokens** | Grep | Not TypeScript |
| **Search markdown** | Grep | Not code |
| **Find filenames** | Glob | Faster for simple patterns |

## Most Common LSP Tools

```
mcp__lsmcp__lsp_find_references    → Find all usages
mcp__lsmcp__lsp_get_definitions    → Go to definition
mcp__lsmcp__lsp_hover              → Get type info
mcp__lsmcp__lsp_diagnostics        → Show TS errors
mcp__lsmcp__lsp_rename_symbol      → Rename safely
mcp__lsmcp__get_workspace_symbols  → Search all symbols
```

## Real Example

**Query**: "Where is `generateCorrelationId` used?"

**Before (Grep)**:
- 35 results (imports, comments, mocks, actual usage)
- Read 10+ files to filter noise
- ~5 min

**After (LSP)**:
- 8 actual call sites
- Read 3 relevant files
- ~1 min

**Savings**: 77% noise reduction, 80% time savings

## Configuration

Already set up:
- ✅ Package installed: `@mizchi/lsmcp`
- ✅ Config: `.lsmcp/config.json`
- ✅ MCP registered: `.mcp.json`

## Troubleshooting

**LSP not responding?**
```bash
# Check Node version (needs 22+)
node --version

# Test manually
npx @mizchi/lsmcp mcp

# Check TS errors
pnpm exec tsc --noEmit
```

**Slow indexing?**
- Edit `.lsmcp/config.json` → increase `indexConcurrency`
- Exclude test files if not needed

## Full Docs

See `.claude/rules/lsp-mcp-patterns.md` for complete guide.
