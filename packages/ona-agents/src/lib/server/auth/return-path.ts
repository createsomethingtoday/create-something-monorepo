export const defaultAgentReturnPath = '/agents';

export function safeAgentReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return defaultAgentReturnPath;
  }

  try {
    const base = new URL('https://ona-agents.invalid');
    const target = new URL(value, base);
    if (target.origin !== base.origin || target.pathname === '/sign-in') {
      return defaultAgentReturnPath;
    }
    if (target.pathname.startsWith('/api/auth/')) {
      return defaultAgentReturnPath;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return defaultAgentReturnPath;
  }
}

export function labelAgentReturnPath(value: string): string {
  return value === '/agents' || value.startsWith('/agents?') || value.startsWith('/agents#')
    ? `Agent transition notice (${value})`
    : value;
}
