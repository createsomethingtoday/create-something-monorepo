import { describe, it, expect } from 'vitest';
import { canPlay, canRead, isSameOrigin, normalizeEmail } from '../src/lib/server/policy';
describe('private media boundary', () => {
  const memberFilm = { visibility: 'published', ingest_status: 'ready', access: 'members' };
  it('denies anonymous and revoked membership without leaking catalog metadata', () => {
    for (const role of [undefined, 'blocked'] as const) {
      expect(canPlay(memberFilm, role)).toBe(false);
      expect(canRead(memberFilm, role)).toBe(false);
    }
    expect(canPlay(memberFilm, 'member')).toBe(true);
  });
  it('never exposes drafts, archives or unprocessed media to members', () => {
    for (const visibility of ['draft', 'archived']) {
      expect(canRead({ ...memberFilm, visibility }, 'member')).toBe(false);
      expect(canPlay({ ...memberFilm, visibility }, 'member')).toBe(false);
    }
    for (const ingest_status of ['processing', 'pending_upload', 'failed'])
      expect(canPlay({ ...memberFilm, ingest_status }, 'admin')).toBe(false);
  });
  it('allows explicitly published public previews only', () => {
    expect(canPlay({ ...memberFilm, access: 'public' })).toBe(true);
    expect(canRead({ ...memberFilm, access: 'public', visibility: 'draft' })).toBe(false);
  });
  it('rejects absent, cross-site and opaque origins on mutations', () => {
    for (const origin of ['', 'null', 'https://evil.example', 'https://createsomething.agency'])
      expect(
        isSameOrigin(
          new Request('https://private.createsomething.agency/api/members', {
            headers: origin ? { origin } : {}
          })
        )
      ).toBe(false);
    expect(
      isSameOrigin(
        new Request('https://private.createsomething.agency/api/members', {
          headers: { origin: 'https://private.createsomething.agency' }
        })
      )
    ).toBe(true);
  });
  it('normalizes invitations and rejects malformed emails', () => {
    expect(normalizeEmail('  Member@Example.com ')).toBe('member@example.com');
    for (const email of [null, {}, 'bad', 'a@b', 'a b@example.com'])
      expect(normalizeEmail(email)).toBeNull();
  });
});
