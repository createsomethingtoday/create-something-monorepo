export interface ReviewerProfile {
  accountId: string;
  airtableCollaboratorId: string;
  email?: string;
  authEmailAliases?: string[];
  name?: string;
  lane?: string;
  /**
   * Grants featured-batch finalization (template_review_set_featured_flag).
   * Ordinary reviewers pick and vote; only directory entries with this flag
   * may arm the creator-notification path.
   */
  featuredCoordinator?: boolean;
}

export type ReviewerDirectory = Map<string, ReviewerProfile>;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseReviewerProfile(accountId: string, value: unknown): ReviewerProfile | null {
  if (!isObject(value)) return null;
  const airtableCollaboratorId = typeof value.airtableCollaboratorId === 'string' ? value.airtableCollaboratorId.trim() : '';
  if (!airtableCollaboratorId) return null;
  const email = typeof value.email === 'string' && value.email.trim() ? value.email.trim() : null;
  const canonicalEmail = email ? normalizeEmail(email) : null;
  const authEmailAliases = Array.isArray(value.authEmailAliases)
    ? [...new Set(
        value.authEmailAliases
          .filter((entry): entry is string => typeof entry === 'string')
          .map(normalizeEmail)
          .filter((entry) => entry && entry !== canonicalEmail),
      )]
    : [];
  return {
    accountId,
    airtableCollaboratorId,
    ...(email ? { email } : {}),
    ...(authEmailAliases.length > 0 ? { authEmailAliases } : {}),
    ...(typeof value.name === 'string' && value.name.trim() ? { name: value.name.trim() } : {}),
    ...(typeof value.lane === 'string' && value.lane.trim() ? { lane: value.lane.trim() } : {}),
    ...(value.featuredCoordinator === true ? { featuredCoordinator: true } : {}),
  };
}

export function parseReviewerDirectory(raw?: string | null): ReviewerDirectory {
  if (!raw?.trim()) return new Map();
  const parsed = JSON.parse(raw) as unknown;
  const directory = new Map<string, ReviewerProfile>();

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!isObject(item) || typeof item.accountId !== 'string') continue;
      const profile = parseReviewerProfile(item.accountId, item);
      if (profile) directory.set(profile.accountId, profile);
    }
    return directory;
  }

  if (!isObject(parsed)) return directory;
  for (const [accountId, value] of Object.entries(parsed)) {
    const profile = parseReviewerProfile(accountId, value);
    if (profile) directory.set(accountId, profile);
  }
  return directory;
}

export function applyReviewerAuthEmailAliases(directory: ReviewerDirectory, raw?: string | null): ReviewerDirectory {
  if (!raw?.trim()) return directory;
  const parsed = JSON.parse(raw) as unknown;
  if (!isObject(parsed)) return directory;

  const withAliases = new Map(directory);
  for (const [accountId, value] of Object.entries(parsed)) {
    const profile = directory.get(accountId);
    if (!profile || !Array.isArray(value)) continue;
    const canonicalEmail = profile.email ? normalizeEmail(profile.email) : null;
    const aliases = [...new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map(normalizeEmail)
        .filter((entry) => entry && entry !== canonicalEmail),
    )];
    if (aliases.length === 0) continue;
    withAliases.set(accountId, {
      ...profile,
      authEmailAliases: [...new Set([...(profile.authEmailAliases ?? []), ...aliases])],
    });
  }
  return withAliases;
}

export function getReviewerProfileForAccount(directory: ReviewerDirectory, accountId?: string | null): ReviewerProfile | null {
  if (!accountId) return null;
  return directory.get(accountId) ?? null;
}

export function getReviewerProfileForEmail(directory: ReviewerDirectory, email?: string | null): ReviewerProfile | null {
  const normalized = email ? normalizeEmail(email) : '';
  if (!normalized) return null;
  let matchedProfile: ReviewerProfile | null = null;
  for (const profile of directory.values()) {
    const canonicalEmail = profile.email ? normalizeEmail(profile.email) : null;
    const matches = canonicalEmail === normalized || profile.authEmailAliases?.includes(normalized);
    if (!matches) continue;
    if (matchedProfile && matchedProfile.accountId !== profile.accountId) return null;
    matchedProfile = profile;
  }
  return matchedProfile;
}
