# Deployment Checklist

## Before Publishing to npm

### 1. Update package details

Edit `package.json`:
- [ ] Set correct version number
- [ ] Update author/email
- [ ] Verify license (currently UNLICENSED)
- [ ] Check repository URL if adding

### 2. Test locally

```bash
# Build
pnpm build

# Test the binary works
node dist/index.js
```

You should see: `OUTERFIELDS PCN MCP server running on stdio`

Press Ctrl+C to exit.

### 3. Test in Claude Desktop locally

**Option A: Use local build directly**

Edit Claude Desktop config:
```json
{
  "mcpServers": {
    "outerfields-pcn": {
      "command": "node",
      "args": [
        "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/agency/clients/outerfields/mcp-server/dist/index.js"
      ]
    }
  }
}
```

Restart Claude Desktop and test a few questions.

**Option B: Use npm link**

```bash
cd packages/agency/clients/outerfields/mcp-server
npm link

# Then in Claude Desktop config:
{
  "mcpServers": {
    "outerfields-pcn": {
      "command": "outerfields-pcn"
    }
  }
}
```

### 4. Publish to npm

**First time setup**:
```bash
npm login
# Enter your npm credentials
```

**Publish**:
```bash
# From the mcp-server directory
cd packages/agency/clients/outerfields/mcp-server

# Dry run first (see what would be published)
npm publish --dry-run

# Actually publish
npm publish --access public
```

**Note**: If using a scoped package like `@outerfields/pcn-tools`, you need `--access public` for the first publish.

### 5. Verify published package

```bash
# Install globally from npm
npm install -g @outerfields/pcn-tools

# Test it works
outerfields-pcn
# Should show: OUTERFIELDS PCN MCP server running on stdio
```

### 6. Share with client

Send them `CLIENT_SETUP.md` and the install command:

```
npm install -g @outerfields/pcn-tools
```

## Updating After Changes

### Version bump

```bash
# Patch (1.0.0 → 1.0.1) - bug fixes
npm version patch

# Minor (1.0.0 → 1.1.0) - new features
npm version minor

# Major (1.0.0 → 2.0.0) - breaking changes
npm version major
```

### Rebuild and republish

```bash
pnpm build
npm publish
```

## Alternative: Private Distribution

If you don't want to publish to public npm:

### Option 1: Git URL

Client installs directly from Git:
```bash
npm install -g git+https://github.com/createsomething/outerfields-pcn.git#main
```

### Option 2: Tarball

Create a distributable package:
```bash
npm pack
# Creates @outerfields-pcn-tools-1.0.0.tgz

# Share this file with client
# They install with:
npm install -g /path/to/@outerfields-pcn-tools-1.0.0.tgz
```

### Option 3: Private npm registry

Set up a private npm registry (GitHub Packages, Verdaccio, etc.)

## Testing Changes

Before republishing, always:

1. **Build**: `pnpm build`
2. **Test binary**: `node dist/index.js`
3. **Test in Claude Desktop**: Restart app, ask test questions
4. **Bump version**: `npm version patch`
5. **Publish**: `npm publish`

## Rollback

If you publish a broken version:

```bash
# Deprecate the bad version
npm deprecate @outerfields/pcn-tools@1.0.1 "Broken, use 1.0.0"

# Publish a fix as 1.0.2
npm version patch
pnpm build
npm publish
```

## Documentation Updates

When adding new tools or changing behavior:

1. Update `README.md` with new examples
2. Update `CLIENT_SETUP.md` if setup changes
3. Update version in `package.json`
4. Add changelog entry if maintaining one

## Support Plan

Make sure you're ready to support clients:

- [ ] Email set up for questions
- [ ] Debugging strategy (logs, common issues)
- [ ] Update plan (how often to release updates)
- [ ] Monitoring (are clients actually using it?)

## License Considerations

Current license: `UNLICENSED` (proprietary)

If making this a product feature:
- Consider MIT or similar permissive license
- Or keep proprietary and license per client
- Update `package.json` license field accordingly

---

**Pro tip**: Keep the MCP server in sync with the actual platform code. When you update components or patterns, update the MCP server's documentation content to match.
