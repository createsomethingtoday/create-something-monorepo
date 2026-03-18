declare global {
  interface Window {
    __NEXT_DATA__?: {
      assetPrefix?: string;
    };
  }
}

function normalizeBasePath(value: string | undefined | null): string {
  if (!value || value === '/') return '';
  const trimmed = value.endsWith('/') ? value.slice(0, -1) : value;
  return trimmed === '/' ? '' : trimmed;
}

export function getServerBasePath(): string {
  return normalizeBasePath(
    process.env.BASE_URL || process.env.ASSETS_PREFIX || process.env.NEXT_PUBLIC_BASE_PATH
  );
}

export function withBasePath(pathname: string, basePath: string = getServerBasePath()): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${normalizeBasePath(basePath)}${normalizedPath}`;
}

export function getClientBasePath(): string {
  if (typeof window === 'undefined') {
    return getServerBasePath();
  }

  return normalizeBasePath(window.__NEXT_DATA__?.assetPrefix || getServerBasePath());
}

export function appPath(pathname: string): string {
  return withBasePath(pathname, getClientBasePath());
}
