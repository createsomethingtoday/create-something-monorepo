# Identity Integration & Event Tracking

## Overview

Integrate Identity worker authentication across CREATE SOMETHING properties and track auth events as conversions in the unified analytics system.

**Philosophy**: One identity, many manifestations. The authentication infrastructure disappears; only the unified self remains.

## Context

- **Identity Worker**: `id.createsomething.space` provides centralized JWT auth (password + magic link)
- **Analytics**: `packages/components/src/lib/analytics` has conversion tracking ready
- **Current State**: Only `.lms` integrates with Identity; other properties lack auth flows

## Features

### 1. Auth Components Library

Create reusable Svelte authentication components in `packages/components`:

- `LoginForm` - Email/password login with Identity worker
- `SignupForm` - Email/password registration
- `MagicLinkForm` - Passwordless email flow
- `AuthProvider` - Context/store for auth state across components
- `UserMenu` - Dropdown showing user avatar, name, logout
- `ProtectedRoute` - Wrapper that redirects unauthenticated users

Components should:
- Use Canon tokens for styling (no hardcoded colors)
- Emit analytics events on auth actions
- Handle loading/error states gracefully
- Support both redirect and modal modes

### 2. Auth Event Tracking

Add authentication events to the analytics conversion category:

| Event Action | When | Metadata |
|--------------|------|----------|
| `auth_signup_start` | User opens signup form | `{ method: 'password' \| 'magic_link' }` |
| `auth_signup_complete` | Account created successfully | `{ method, tier }` |
| `auth_signup_error` | Signup failed | `{ method, error_code }` |
| `auth_login_start` | User opens login form | `{ method }` |
| `auth_login_complete` | Login successful | `{ method, returning_user: boolean }` |
| `auth_login_error` | Login failed | `{ method, error_code }` |
| `auth_logout` | User logs out | `{ session_duration_minutes }` |
| `auth_magic_link_sent` | Magic link email sent | `{}` |
| `auth_magic_link_clicked` | User arrives via magic link | `{ link_age_minutes }` |
| `auth_token_refresh` | Token refreshed | `{}` |
| `auth_session_expired` | Session ended naturally | `{ session_duration_minutes }` |

### 3. Property Integration

Integrate Identity authentication into each property:

#### .space (createsomething.space)
- Add optional login for personalized experience tracking
- Show UserMenu in header when logged in
- Track learning progress per-user (future)
- Priority: P2 (enhancement)

#### .io (createsomething.io)
- Replace local admin auth with Identity worker
- Migrate existing admin users to Identity
- Add `admin` claim to JWT for io-specific permissions
- Priority: P1 (security improvement)

#### .agency (createsomething.agency)
- Add client portal authentication
- Clients can view project status, deliverables
- Priority: P2 (future feature)

#### .ltd (createsomething.ltd)
- No auth needed (public philosophy docs)
- Skip this property
- Priority: P4 (not needed)

### 4. Server-Side Token Validation

Create shared utilities for validating Identity JWTs in SvelteKit:

```typescript
// packages/components/src/lib/auth/server.ts
export async function validateToken(token: string, env: Env): Promise<User | null>
export async function requireAuth(request: Request, env: Env): Promise<User>
export function getTokenFromRequest(request: Request): string | null
```

Validation should:
- Fetch JWKS from Identity worker (cached in KV)
- Verify signature using Web Crypto API
- Check expiration, audience, issuer
- Return typed user payload

### 5. Auth Middleware for SvelteKit

Create hooks for protected routes:

```typescript
// +layout.server.ts pattern
export const load: LayoutServerLoad = async ({ cookies, platform }) => {
  const token = cookies.get('access_token');
  const user = token ? await validateToken(token, platform.env) : null;
  return { user };
};
```

### 6. Session Persistence

Handle token storage and refresh:

- Store access token in httpOnly cookie (15 min expiry)
- Store refresh token in httpOnly cookie (7 day expiry)
- Auto-refresh before expiration
- Clear cookies on logout
- Emit analytics events for session lifecycle

## Constraints

- All auth components must use Canon design tokens
- Auth events must flow through existing analytics pipeline
- No new databases - use Identity worker's D1
- No sensitive data in analytics (no passwords, tokens)
- Respect existing `.lms` implementation patterns

## Success Criteria

1. User can sign up/login on `.space` and `.io`
2. Auth events appear in analytics dashboard
3. Token validation works server-side in SvelteKit
4. Session persists across page refreshes
5. Logout clears state correctly
6. Magic link flow works end-to-end

## Out of Scope

- Social login (OAuth providers)
- Two-factor authentication
- Password reset flow (exists in Identity, needs UI)
- Role-based access control beyond admin
