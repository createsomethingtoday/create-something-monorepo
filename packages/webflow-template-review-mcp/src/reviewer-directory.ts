export interface ReviewerProfile {
  accountId: string;
  airtableCollaboratorId: string;
  email?: string;
  name?: string;
  lane?: string;
}

export type ReviewerDirectory = Map<string, ReviewerProfile>;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseReviewerProfile(accountId: string, value: unknown): ReviewerProfile | null {
  if (!isObject(value)) return null;
  const airtableCollaboratorId = typeof value.airtableCollaboratorId === 'string' ? value.airtableCollaboratorId.trim() : '';
  if (!airtableCollaboratorId) return null;
  return {
    accountId,
    airtableCollaboratorId,
    ...(typeof value.email === 'string' && value.email.trim() ? { email: value.email.trim() } : {}),
    ...(typeof value.name === 'string' && value.name.trim() ? { name: value.name.trim() } : {}),
    ...(typeof value.lane === 'string' && value.lane.trim() ? { lane: value.lane.trim() } : {}),
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

export function getReviewerProfileForAccount(directory: ReviewerDirectory, accountId?: string | null): ReviewerProfile | null {
  if (!accountId) return null;
  return directory.get(accountId) ?? null;
}

export function getReviewerProfileForEmail(directory: ReviewerDirectory, email?: string | null): ReviewerProfile | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  for (const profile of directory.values()) {
    if (profile.email?.toLowerCase() === normalized) return profile;
  }
  return null;
}
