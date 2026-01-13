# OUTERFIELDS PCN Tools - Client Setup Guide

## What You're Getting

An AI assistant that understands your OUTERFIELDS platform. Ask it questions about how things work, get implementation guidance, and explore architectural patterns—all directly in Claude Desktop.

**This is like having a senior developer on call 24/7 who knows your codebase inside and out.**

## Prerequisites

- **Node.js 18+** installed ([download here](https://nodejs.org/))
- **Claude Desktop** installed ([download here](https://claude.ai/download))

Check your Node version:
```bash
node --version
# Should show v18.x.x or higher
```

## Installation (5 minutes)

### Step 1: Install the package globally

Open your terminal and run:

```bash
npm install -g @outerfields/pcn-tools
```

This makes the tool available to Claude Desktop from anywhere on your machine.

### Step 2: Find your Claude Desktop config file

The location depends on your operating system:

**macOS/Linux**:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Quick way to open it** (macOS/Linux):
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

If the file doesn't exist, create it.

### Step 3: Add the MCP server configuration

Add this to your config file:

```json
{
  "mcpServers": {
    "outerfields-pcn": {
      "command": "npx",
      "args": ["@outerfields/pcn-tools"]
    }
  }
}
```

**If you already have other MCP servers configured**, just add the `"outerfields-pcn"` entry inside the existing `"mcpServers"` object.

Example with multiple servers:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    },
    "outerfields-pcn": {
      "command": "npx",
      "args": ["@outerfields/pcn-tools"]
    }
  }
}
```

### Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q on Mac, close all windows on Windows)
2. Reopen Claude Desktop
3. You're ready!

## How to Use It

Just start a conversation in Claude Desktop and ask about your platform:

### Example Questions

**Understanding components**:
```
How does the VideoModal component work?
Explain engagement tracking in my PCN platform
What does the Heatmap visualization show?
```

**Learning patterns**:
```
How is data stored in Cloudflare?
Explain the authentication flow
Show me the analytics pipeline
```

**Getting help building features**:
```
How do I add a new analytics metric?
Guide me through adding a video player feature
How do I create a custom heatmap?
```

**Deployment & maintenance**:
```
How do I deploy to production?
What environment variables do I need?
Help me troubleshoot a build error
```

**System overview**:
```
Show me the architecture
What's the technology stack?
How does data flow through the system?
```

## Example Conversation

```
You: How does video engagement tracking work in my platform?

Claude: Let me explain the engagement tracking pattern in your OUTERFIELDS PCN.

The system tracks video engagement like this:

1. **Frontend Tracking**: The VideoModal component tracks playback every 10 seconds
   using a setInterval function. Each tracking event sends the current timestamp,
   video duration, and completion status.

2. **API Storage**: POST /api/videos/[id]/engagement receives the data and stores
   it in Cloudflare KV with the key pattern `video:{id}:engagement`. The data is
   structured as an array of segments (0-99% of video length).

3. **State Management**: The engagementStats Svelte store fetches this data and
   caches it client-side. Components subscribe to this store reactively.

4. **Visualization**: The Heatmap component consumes the engagement data and
   displays replay intensity using a purple color gradient. High replay counts
   show brighter purple.

Here's the actual code from your VideoModal component:

[detailed code examples]

Would you like me to explain any specific part in more detail?
```

## Troubleshooting

### "MCP server not showing up in Claude Desktop"

1. **Check the config file path** - Make sure you edited the right file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Validate the JSON** - Use [jsonlint.com](https://jsonlint.com/) to check for syntax errors

3. **Completely restart Claude Desktop** - Quit and reopen, don't just close the window

4. **Check the logs** (macOS):
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### "Command not working" or "Package not found"

1. **Verify installation**:
   ```bash
   npm list -g @outerfields/pcn-tools
   ```
   Should show the package in the global install list.

2. **Reinstall if needed**:
   ```bash
   npm uninstall -g @outerfields/pcn-tools
   npm install -g @outerfields/pcn-tools
   ```

3. **Check Node.js version**:
   ```bash
   node --version
   ```
   Must be 18.0.0 or higher.

### Getting an error about permissions

If you see "EACCES: permission denied":

**macOS/Linux**:
```bash
sudo npm install -g @outerfields/pcn-tools
```

**Or fix npm permissions** (better long-term solution):
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g @outerfields/pcn-tools
```

## What Makes This Different

**Traditional documentation**:
- Static pages you have to search through
- Out of date when code changes
- One-size-fits-all explanations
- No context about YOUR specific question

**AI-native documentation (what you have now)**:
- Answers YOUR specific question
- Always up to date with the implementation
- Provides working code examples
- Guides you step-by-step through changes
- Available 24/7 in any conversation

This is what "better than Uscreen" means in practice. Your platform doesn't just work well—it *explains itself*.

## Editing Presentations via PRs (Recommended)

OUTERFIELDS presentations are implemented as SvelteKit routes using the shared `Presentation` + `Slide` components.

**Goal**: the client edits decks in a *presentations-only* repo, opens a PR, and the deployed OUTERFIELDS site updates after merge.

### 1) Get the presentations repo

Clone the presentations-only repository (ask CREATE SOMETHING for the repo URL):

```bash
git clone <outerfields-presentations-repo-url>
cd outerfields-presentations
```

### 2) Give Claude Desktop file access (restricted to that repo)

In your Claude Desktop config file, add a filesystem MCP server that is scoped to your local presentations folder.

Example (macOS):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/ABSOLUTE/PATH/TO/outerfields-presentations"
      ]
    },
    "outerfields-pcn": {
      "command": "npx",
      "args": ["@outerfields/pcn-tools"]
    }
  }
}
```

**Why this works**:
- `outerfields-pcn` helps Claude understand *how the platform works*
- `filesystem` lets Claude *edit only the presentations repo* (no monorepo access)

### 3) What Claude should edit

Decks should live as routes (e.g. `presentations/<deck-slug>/+page.svelte`) and compose:
- `Presentation` (`$lib/components/Presentation.svelte`)
- `Slide` (`$lib/components/Slide.svelte`)
- Any **approved embedded components** (CREATE SOMETHING will provide the allowlist; Claude can assemble embeds safely)

### 4) The workflow

1. Chat with Claude: “Create a new deck for <audience> at /presentations/<slug>”
2. Claude edits the Svelte files in the presentations repo
3. Client opens a PR
4. Merge → Cloudflare Pages deploys → share the updated deck URL

## Need Help?

**Email**: micah@createsomething.io
**Docs**: https://outerfields.io/docs

We're here to help you get the most out of your PCN platform.

---

**Built by CREATE SOMETHING**
AI-native development for Premium Content Networks
