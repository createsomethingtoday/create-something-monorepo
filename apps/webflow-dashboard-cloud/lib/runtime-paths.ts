function normalizeBasePath(value: string | undefined | null): string {
  if (!value || value === '/') return '';
  const trimmed = value.endsWith('/') ? value.slice(0, -1) : value;
  return trimmed === '/' ? '' : trimmed;
}

function getNextAssetPrefix(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const nextData = window.__NEXT_DATA__ as { assetPrefix?: string } | undefined;
  return typeof nextData?.assetPrefix === 'string' ? nextData.assetPrefix : undefined;
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

  return normalizeBasePath(getNextAssetPrefix() || getServerBasePath());
}

export function appPath(pathname: string): string {
  return withBasePath(pathname, getClientBasePath());
}
