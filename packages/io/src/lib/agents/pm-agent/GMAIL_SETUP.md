# Gmail Integration Setup for PM Agent

This guide walks through setting up Gmail OAuth for the PM Agent.

## Prerequisites

- Google account (Gmail or Google Workspace)
- Access to Google Cloud Console
- Node.js installed locally

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it something like "CREATE-SOMETHING-PM-Agent"
4. Click "Create"

---

## Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click "Gmail API" → "Enable"

---

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (or "Internal" if using Google Workspace)
3. Fill in:
   - **App name:** CREATE SOMETHING PM Agent
   - **User support email:** Your email
   - **Developer contact email:** Your email
4. Click "Save and Continue"
5. **Scopes:** Click "Add or Remove Scopes" and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
6. Click "Save and Continue"
7. **Test users:** Add your Gmail address as a test user
8. Click "Save and Continue"

---

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select **"Desktop app"** as Application type
4. Name it "PM Agent Desktop Client"
5. Click "Create"
6. **Download JSON** - this contains your client_id and client_secret

---

## Step 5: Get Refresh Token

### Option A: Use the Setup Script (Recommended)

1. Save the downloaded JSON as:
   ```
   packages/io/scripts/gmail-credentials.json
   ```

2. Run the setup script:
   ```bash
   cd packages/io
   node scripts/gmail-oauth-setup.js
   ```

3. Follow the prompts:
   - Browser will open for Google OAuth consent
   - Grant permission to your account
   - Script will display your refresh token

4. Save the tokens to Wrangler secrets (script will show exact commands)

### Option B: Use OAuth Playground

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click ⚙️ (settings) → Check "Use your own OAuth credentials"
3. Enter your client_id and client_secret
4. In Step 1, select scopes:
   - Gmail API v1 → `https://www.googleapis.com/auth/gmail.readonly`
   - Gmail API v1 → `https://www.googleapis.com/auth/gmail.send`
   - Gmail API v1 → `https://www.googleapis.com/auth/gmail.modify`
5. Click "Authorize APIs" → Grant permission
6. Click "Exchange authorization code for tokens"
7. Copy the **Refresh token**

---

## Step 6: Save Secrets to Wrangler

```bash
cd packages/io

# Your client ID from the downloaded JSON
npx wrangler secret put GMAIL_CLIENT_ID
# Paste your client_id

# Your client secret from the downloaded JSON
npx wrangler secret put GMAIL_CLIENT_SECRET
# Paste your client_secret

# The refresh token from Step 5
npx wrangler secret put GMAIL_REFRESH_TOKEN
# Paste your refresh_token
```

---

## Step 7: Verify Setup

After deploying, test the Gmail integration:

```bash
# Check if Gmail is accessible
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "gmail_triage"}'
```

You should see either:
- A list of processed emails (success!)
- "No new client inquiries" (success, but inbox is empty/processed)
- An error message (check your secrets)

---

## API Endpoints

### Triage Gmail Inbox

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "gmail_triage",
    "gmail_query": "is:unread in:inbox category:primary"
  }'
```

### Process Specific Thread

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "gmail_process_thread",
    "thread_id": "18abc123def..."
  }'
```

### Triage Everything (Contact Forms + Gmail)

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "triage_all"}'
```

---

## Gmail Search Queries

Common queries for `gmail_query` parameter:

| Query | Description |
|-------|-------------|
| `is:unread` | All unread emails |
| `is:unread in:inbox` | Unread inbox emails |
| `is:unread category:primary` | Unread primary emails (not promotions) |
| `from:client@example.com` | Emails from specific sender |
| `subject:inquiry` | Emails with "inquiry" in subject |
| `newer_than:1d` | Emails from last 24 hours |
| `newer_than:7d is:unread` | Unread from last week |
| `has:attachment` | Emails with attachments |
| `label:work` | Emails with custom label |

Combine queries:
```
is:unread in:inbox category:primary newer_than:3d
```

---

## How Gmail Tools Work

### 1. read_gmail_inbox
Reads emails matching a query. Returns summaries with:
- Email ID and thread ID
- From (name and email)
- Subject and date
- Snippet (preview text)
- Whether it's unread

### 2. get_email_thread
Gets full conversation history. Use when:
- The email is part of an ongoing conversation
- You need context from previous messages

### 3. create_gmail_draft
Creates a draft reply in Gmail. Key points:
- Draft appears in Gmail Drafts folder
- Human must click Send in Gmail
- Include thread_id for proper threading
- Agent logs reasoning for review

### 4. mark_email_read
Marks email as read after processing. Use after:
- Creating a draft response
- Escalating to human
- Determining email doesn't need response

### 5. archive_email
Removes email from inbox (keeps in All Mail). Use for:
- Emails that need no response
- Spam/marketing that slipped through

---

## Security Notes

### Secrets Management
- Never commit credentials to git
- Use Wrangler secrets for production
- Rotate credentials if compromised

### Scopes Requested
The agent requests these permissions:
- `gmail.readonly` - Read emails (required)
- `gmail.send` - Send emails (for future direct send)
- `gmail.modify` - Mark as read, archive (required)

### Token Refresh
- Access tokens expire in ~1 hour
- Refresh tokens are long-lived but can expire if:
  - Not used for 6 months
  - User revokes access
  - Password changed (sometimes)
- The agent caches access tokens for 50 minutes

### What the Agent Can't Do
- Delete emails (no `gmail.delete` scope)
- Modify labels beyond read/archive
- Access other users' email (only your account)
- Send emails without creating draft first

---

## Troubleshooting

### "Gmail not configured"
Check that all three secrets are set:
```bash
npx wrangler secret list
```

Should show:
- GMAIL_CLIENT_ID
- GMAIL_CLIENT_SECRET
- GMAIL_REFRESH_TOKEN

### "Failed to refresh Gmail token"
- Verify client_id and client_secret match your Google Cloud credentials
- Check that refresh_token is correct (no extra spaces)
- Ensure Gmail API is enabled in Google Cloud Console

### "Request had insufficient authentication scopes"
- Delete and recreate the refresh token
- Make sure you selected all three scopes during OAuth consent

### "Access blocked: This app's request is invalid"
- Check OAuth consent screen is configured
- Ensure redirect URI matches (for setup script: `http://localhost:3333/callback`)
- If using OAuth Playground, check "Use your own OAuth credentials"

### No emails being processed
- Check your gmail_query - try broader query like `is:unread`
- Verify the inbox has unread emails matching your query
- Check agent logs for skip reasons (spam, newsletters, etc.)

---

## Files Reference

```
packages/io/
├── src/lib/agents/pm-agent/
│   ├── gmail.ts          # Gmail API client (OAuth, API calls)
│   ├── gmail-tools.ts    # Agent tools (read, draft, archive)
│   └── GMAIL_SETUP.md    # This file
├── scripts/
│   ├── gmail-oauth-setup.js    # One-time setup script
│   └── gmail-credentials.json  # Your OAuth credentials (DO NOT COMMIT)
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ Gmail PM Agent - Quick Reference                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SETUP (one-time):                                          │
│   1. Enable Gmail API in Google Cloud                      │
│   2. Create OAuth Desktop credentials                       │
│   3. Run: node scripts/gmail-oauth-setup.js                │
│   4. Save secrets to Wrangler                               │
│                                                             │
│ USAGE:                                                      │
│   Triage Gmail:      {"action": "gmail_triage"}            │
│   Process thread:    {"action": "gmail_process_thread",    │
│                       "thread_id": "..."}                  │
│   Triage everything: {"action": "triage_all"}              │
│                                                             │
│ COMMON QUERIES:                                             │
│   is:unread category:primary                               │
│   is:unread newer_than:1d                                  │
│   from:important@client.com                                 │
│                                                             │
│ DRAFTS:                                                     │
│   - Agent creates draft in Gmail                           │
│   - Check Gmail Drafts folder                               │
│   - Human clicks Send                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
