export function resolveComposioUserId(input: {
  accountSlug: string;
  partnerClientSlug: string;
  composioUserId?: unknown;
}): string {
  const explicit = String(input.composioUserId ?? '').trim();
  if (explicit) return explicit;

  return `hd_notion_${input.partnerClientSlug.replace(/-/g, '_')}_${input.accountSlug.replace(/-/g, '_')}`;
}
