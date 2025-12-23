# GDPR Compliance for Authenticated Users

## Overview

Add GDPR compliance features for authenticated users across CREATE SOMETHING properties. Anonymous analytics are already compliant (no cookies, respects DNT). This focuses on authenticated user data handling.

**Philosophy**: Privacy is not a feature—it's respect for the user's autonomy. The infrastructure disappears; trust remains.

## Context

**Current State:**
- Anonymous analytics: No cookies, sessionStorage only, respects DNT ✓
- Authenticated users: session_token cookie, user_id tracked in events
- Missing: Cookie consent, privacy policy, data export/deletion

**Legal Basis:**
- Anonymous: Legitimate interest (no personal data)
- Authenticated: Consent required for cookies and tracking

## Features

### 1. Cookie Consent Banner

Minimal, non-intrusive banner for auth cookies:

- Show only when user is about to authenticate (login/signup page)
- Single action: "Continue" accepts necessary cookies
- Link to privacy policy
- Store consent in localStorage (not a cookie)
- No cookie wall—anonymous browsing always allowed

Implementation:
- Component: CookieConsent.svelte in packages/components
- Check consent before setting session_token cookie
- Consent state: 'pending' | 'accepted' | 'declined'

### 2. Privacy Policy Page

Static page explaining data practices:

- What we collect (session data, page views, user profile)
- Why we collect it (authentication, personalization)
- How long we keep it (session: 7 days, analytics: 90 days)
- Third parties (Cloudflare only—no Google, no Meta)
- User rights (access, export, deletion)
- Contact for privacy requests

Location: /privacy on each property
Shared content via components package

### 3. Data Export Endpoint

Allow users to download their data:

GET /api/user/export (authenticated)

Returns JSON with:
- User profile (email, name, tier, created_at)
- Analytics events (last 90 days)
- Session history
- Any collections or saved content

Response as downloadable JSON file with Content-Disposition header.

### 4. Data Deletion Endpoint

Allow users to delete their account and data:

DELETE /api/user/delete (authenticated)

Actions:
- Soft delete user record (30-day grace period exists in identity-worker)
- Anonymize analytics events (set user_id to null)
- Clear all sessions
- Return confirmation

POST /api/user/delete/confirm for permanent deletion after grace period.

### 5. Consent State Management

Track and respect user consent:

- Store in localStorage: cs_consent = { analytics: bool, timestamp: string }
- Check before tracking authenticated events
- Provide settings page to update preferences
- Sync consent state with identity-worker (optional field)

### 6. Analytics Opt-Out

Allow users to disable analytics tracking:

- Toggle in account settings
- Stored in user profile (identity-worker)
- Checked before any event tracking
- DNT browser setting always respected regardless

## Constraints

- Cookie banner only for auth, not analytics (anonymous = no consent needed)
- No cookie wall—users can browse without accepting
- Privacy policy must be accessible without login
- Data export must complete within 30 seconds
- Deletion must be reversible for 30 days (existing identity-worker behavior)

## Implementation Notes

Files to create:
1. packages/components/src/lib/gdpr/CookieConsent.svelte
2. packages/components/src/lib/gdpr/PrivacyPolicy.svelte
3. packages/components/src/lib/gdpr/consent.ts (state management)
4. packages/io/src/routes/privacy/+page.svelte
5. packages/space/src/routes/privacy/+page.svelte
6. packages/io/src/routes/api/user/export/+server.ts
7. packages/io/src/routes/api/user/delete/+server.ts
8. packages/space/src/routes/api/user/export/+server.ts
9. packages/space/src/routes/api/user/delete/+server.ts

## Success Criteria

1. Cookie consent shown before auth cookie is set
2. Privacy policy accessible at /privacy
3. Authenticated users can export their data as JSON
4. Authenticated users can delete their account
5. Consent state persists and is respected
6. Analytics respects opt-out preference
