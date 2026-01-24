# /setup — Installation and Configuration

Help users get Gemini CLI and the Seeing extension installed.

## Prompt Template

### When a user needs setup help

```
# Setting Up Seeing

Let me help you get started with the Seeing curriculum.

## Prerequisites

You'll need:
- **Node.js 18+** — Check with `node -v`
- **A Google account** — For free tier access (60 requests/min, 1,000/day)

## Install Gemini CLI

**Option 1: npm (recommended)**
```bash
npm install -g @google/gemini-cli
```

**Option 2: Homebrew (macOS/Linux)**
```bash
brew install gemini-cli
```

**Option 3: Run without installing**
```bash
npx @google/gemini-cli
```

## First Run

Start Gemini CLI:
```bash
gemini
```

You'll:
1. Choose a theme
2. Select "Login with Google"
3. Authenticate in browser

## Install Seeing

Once Gemini CLI runs:
```bash
gemini extensions install @createsomething/seeing
```

Or manually add to `~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "seeing": {
      "command": "npx",
      "args": ["@createsomething/seeing"]
    }
  }
}
```

Restart Gemini CLI after configuring.

## Verify

Test with:
```
/lesson what-is-creation
```

---

Need help with a specific step?
```

## Troubleshooting Responses

### If Node.js is missing

```
Node.js is required for Gemini CLI.

Download from: https://nodejs.org/

Choose the LTS version. After installation, restart your terminal and verify:
```bash
node -v
```

Should show v18 or higher.
```

### If authentication fails

```
If you see "Failed to log in" with a Google Cloud Project error:

1. Go to https://console.cloud.google.com/
2. Create or select a project
3. Copy the project ID
4. Set the environment variable:

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

Then restart Gemini CLI.
```

### If extension doesn't load

```
Check these:

1. **Verify syntax** in `~/.gemini/settings.json`
2. **Restart Gemini CLI** completely (quit and reopen)
3. **List extensions**: `gemini extensions list`

If still not working, try manual MCP configuration in settings.json.
```

## Resources

- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI Docs](https://geminicli.com/docs/get-started/installation/)
- [MCP Protocol](https://modelcontextprotocol.io/docs)
