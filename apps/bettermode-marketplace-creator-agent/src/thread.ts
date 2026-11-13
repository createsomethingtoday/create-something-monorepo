// Thread state for the response queue. A queue item is a thread (root post).
// Its state is derived from the live thread, so every event and every sweep
// reaches the same answer: the item needs a response when a creator spoke last.

import type { BettermodeMember, BettermodePost } from './bettermode';

export type ThreadMessage = {
  id: string;
  createdAt: string;
  author: BettermodeMember | null;
  isStaff: boolean;
  isRoot: boolean;
  text: string;
};

export type ThreadState = {
  // Published messages, oldest first. The root post is always included.
  messages: ThreadMessage[];
  needsResponse: boolean;
  latestCreatorMessage: ThreadMessage | null;
  // First creator message that staff has not answered.
  waitingSince: string | null;
  lastStaffReplyAt: string | null;
};

export function threadState(
  root: BettermodePost,
  isStaff: (member: BettermodeMember | null) => boolean,
): ThreadState {
  const posts: Array<{ post: BettermodePost; isRoot: boolean }> = [{ post: root, isRoot: true }];
  for (const reply of root.replies?.nodes ?? []) {
    posts.push({ post: reply, isRoot: false });
    for (const nested of reply.replies?.nodes ?? []) {
      posts.push({ post: nested, isRoot: false });
    }
  }

  const messages = posts
    // A reply that moderation holds is invisible to creators, so it is not a response.
    .filter(({ post, isRoot }) => isRoot || !post.status || post.status === 'PUBLISHED')
    .map(({ post, isRoot }): ThreadMessage => {
      const author = post.owner || post.createdBy || null;
      return {
        id: post.id,
        createdAt: post.createdAt || post.publishedAt || '',
        author,
        isStaff: isStaff(author),
        isRoot,
        text: postText(post),
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let lastStaffIndex = -1;
  let latestCreatorMessage: ThreadMessage | null = null;
  for (let index = 0; index < messages.length; index += 1) {
    if (messages[index].isStaff) lastStaffIndex = index;
    else latestCreatorMessage = messages[index];
  }

  const firstUnanswered = messages.slice(lastStaffIndex + 1).find((message) => !message.isStaff);

  return {
    messages,
    needsResponse: !!firstUnanswered,
    latestCreatorMessage,
    waitingSince: firstUnanswered?.createdAt || null,
    lastStaffReplyAt: lastStaffIndex >= 0 ? messages[lastStaffIndex].createdAt || null : null,
  };
}

export type StaffConfig = {
  // Member IDs that always count as staff.
  adminIds: string[];
  // Email domains that count as staff, lowercase.
  domains: string[];
};

// Staff messages count as responses. A reply sent through the Bettermode API
// is owned by the app identity (`APP::<id>`), not by the admin who approved
// it, so app-owned posts count as staff too.
export function isStaff(member: BettermodeMember | null, config: StaffConfig): boolean {
  if (!member) return false;
  if (member.id.startsWith('APP::') || config.adminIds.includes(member.id)) return true;
  const email = member.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) return false;
  return config.domains.some((domain) => email.endsWith(`@${domain}`));
}

// Short fingerprint of a message body. An edit changes it. A repeat event
// for the same text does not, so it never triggers a new draft.
export function textFingerprint(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${normalized.length}:${(hash >>> 0).toString(16)}`;
}

export function postText(post: BettermodePost): string {
  const full = post.textContent?.trim();
  if (full) return full;
  return stripHtml(post.shortContent || post.description || post.title || '');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
