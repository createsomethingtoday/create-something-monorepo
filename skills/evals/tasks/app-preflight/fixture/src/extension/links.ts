const BLOCKED_HOSTS = ['localhost'];

// Short label for a help link shown under the settings panel.
export function describeLink(raw: string): string {
  const url = new URL(raw, 'http://localhost');
  if (BLOCKED_HOSTS.includes(url.hostname)) {
    return 'Help';
  }
  return url.hostname.replace(/^www\./, '');
}
