/** Owned Canon illustrations. New Agency stills remain review candidates until accepted. Essential content stays HTML. */
const base = '/images/canon-agency-v1/';
const portrait = { mobileSrc: base + 'review-nook.webp', mobileAspectRatio: 1122 / 1402, mobilePosition: 'center' };

export const agencyWelcomeScene = {
  src: base + 'hero-wide-v2.webp', aspectRatio: 1672 / 941, position: 'center', mobileSrc: base + 'hero-portrait-v1.webp', mobileAspectRatio: 1122 / 1402, mobilePosition: 'center',
  description: 'Concept illustration: the soft felt Canon makes room for a useful task at a warm workshop bench.'
} as const;

export const agencyQuietScene = {
  src: base + 'welcome-clean-plate.webp', aspectRatio: 1671 / 941, position: 'center', ...portrait,
  description: 'Concept illustration: folded paper, a lamp and an open workshop surface make room for the next decision.'
} as const;

export const agencyConnectionScene = {
  src: base + 'connection-loom.webp', aspectRatio: 1672 / 941, position: 'center', ...portrait,
  description: 'Concept illustration: Canon guides two paper paths into the same workshop loom.'
} as const;

export const agencyCharacter = {
  body: base + 'body-r41.webp', head: base + 'head-r42.webp', gestures: base + 'gestures-r45.webp'
} as const;

export const agencyInvitationScene = {
  src: base + 'cta-wide-v1.webp', aspectRatio: 1672 / 941, position: 'center',
  mobileSrc: base + 'cta-portrait-v1.webp', mobileAspectRatio: 1122 / 1402, mobilePosition: 'center',
  description: 'Concept illustration: felt Canon offers an open notebook beside a squared tray of paper tasks.'
} as const;
