# Cross-Domain SSO for CREATE SOMETHING Properties

## Overview

Enable seamless authentication across all CREATE SOMETHING properties (.ltd, .io, .space, .agency). When a user logs in at one property, they should remain logged in when navigating to another property.

## Problem

Each property sets cookies scoped to its own TLD. Browsers don't share cookies across different domains, so login at `createsomething.ltd` doesn't carry over to `createsomething.space`.

## Solution

Cross-domain token exchange: when a logged-in user clicks a property link, we generate a short-lived token, redirect to the target property, exchange the token for a session, and set cookies on that domain.

## Features

### Identity Worker Endpoints (DONE)

- [x] Migration for cross_domain_tokens table
- [x] Token storage queries in db/queries.ts
- [x] POST /v1/auth/cross-domain/generate - Generate token (requires auth)
- [x] POST /v1/auth/cross-domain/exchange - Exchange token for session

### Property Routes

Each property needs these routes:

#### /api/auth/cross-domain (Generate and Redirect)
- Verify user is logged in
- Call identity-worker to generate token
- Redirect to target property with token

#### /auth/cross-domain (Receive and Set Session)
- Extract token from URL
- Call identity-worker to exchange token
- Set session cookies
- Redirect to final destination

Properties to update:
- packages/space
- packages/io
- packages/agency
- packages/ltd

### Account Page Links

Update property links on account pages to use cross-domain redirect when logged in:
- Change `<a href="https://createsomething.space">` to `/api/auth/cross-domain?target=space&redirect=/account`

## Security

- 60-second token TTL
- Single-use tokens
- Hashed storage
- Target validation
- Rate limiting (5 tokens/minute)

## Files to Create

For each property (space, io, agency, ltd):
1. `src/routes/api/auth/cross-domain/+server.ts`
2. `src/routes/auth/cross-domain/+page.server.ts`
3. `src/routes/auth/cross-domain/+page.svelte`

Files to modify:
4. `src/routes/account/+page.svelte` - Update property links

## Rollout

1. Deploy identity-worker with migration
2. Add routes to all properties
3. Update account page links
4. Deploy all properties
