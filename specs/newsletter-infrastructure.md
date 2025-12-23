# Newsletter Infrastructure Completion

## Overview

Complete the newsletter infrastructure to make it a fully functional instrument. This follows Canon principles: no growth hacks, just completing what exists.

**Philosophy**: "Weniger, aber besser" — Fewer subscribers, but genuinely interested ones.

## Property Mode

`.io` (Research Mode) - Requires test coverage and validation.

## Features

### 1. Unsubscribe Flow (csm-ul40)

**Status**: In Progress

Implement `/unsubscribe` endpoint that:
- Parses base64 token from query param (`?token=...`)
- Token format: `btoa(email:timestamp)`
- Validates token and extracts email
- Updates D1: `SET unsubscribed_at = datetime('now'), status = 'unsubscribed'`
- Displays Canon-styled confirmation page

**Files**:
- `packages/io/src/routes/unsubscribe/+page.server.ts` (created)
- `packages/io/src/routes/unsubscribe/+page.svelte` (create)
- `packages/space/src/routes/unsubscribe/+page.server.ts` (create)
- `packages/space/src/routes/unsubscribe/+page.svelte` (create)

**Acceptance Criteria**:
- [ ] Token validation works for valid tokens
- [ ] Invalid tokens show error message
- [ ] Database record updated on success
- [ ] Confirmation page uses Canon tokens

### 2. Double Opt-In (csm-dv3z)

**Blocked by**: csm-ul40

Add confirmation step before activating subscribers:
- Signup stores subscriber with `confirmed_at = NULL`
- Welcome email becomes confirmation email with `/confirm?token=...`
- Confirm endpoint sets `confirmed_at = datetime('now')`
- Bulk send only includes `confirmed_at IS NOT NULL`

**Files**:
- `packages/io/src/routes/api/newsletter/+server.ts` (modify)
- `packages/space/src/routes/api/newsletter/+server.ts` (modify)
- `packages/io/src/routes/confirm/+page.server.ts` (create)
- `packages/io/src/routes/confirm/+page.svelte` (create)

**Database Change**:
```sql
ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT;
```

**Acceptance Criteria**:
- [ ] New signups get confirmation email (not welcome)
- [ ] Confirmation email has working confirm link
- [ ] Unconfirmed subscribers not included in sends
- [ ] Confirmed subscribers receive welcome email

### 3. Source Tracking (csm-9qam)

**Blocked by**: csm-ul40

Track where subscribers came from:
- Accept `source` param in signup request
- Auto-populate based on property (`space`, `io`, `agency`, `ltd`)
- Store in existing `source` column
- Dashboard can filter by source

**Files**:
- `packages/io/src/routes/api/newsletter/+server.ts` (modify)
- `packages/space/src/routes/api/newsletter/+server.ts` (modify)
- `packages/agency/src/routes/api/newsletter/+server.ts` (modify)

**Acceptance Criteria**:
- [ ] Source field populated on signup
- [ ] Property auto-detected if not provided
- [ ] Admin dashboard shows source column

### 4. Bounce Handling (csm-gv9w) [Optional]

Configure Resend webhook for bounce handling:
- Create webhook endpoint at `/api/newsletter/webhook`
- Validate Resend signature
- Mark bounced emails as `status = 'bounced'`
- Exclude bounced from bulk sends

**Files**:
- `packages/io/src/routes/api/newsletter/webhook/+server.ts` (create)

**Requires**: Resend webhook configuration in dashboard

### 5. Content Strategy Documentation (csm-jh5l)

Document the newsletter content strategy:
- Content pillars and cadence
- Voice guidelines
- Template structure
- Anti-patterns

**Files**:
- `packages/io/docs/newsletter-strategy.md` (create)

## Environment

```bash
# Start dev server
pnpm dev --filter=io

# Generate types
pnpm --filter=io exec wrangler types
```

## Verification

Each feature should be tested by:
1. Running the dev server
2. Testing the flow manually
3. Checking D1 database state
4. Verifying email delivery (for confirmation flows)
