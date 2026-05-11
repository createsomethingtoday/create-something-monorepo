function normalizeBasePath(value: string | undefined | null): string {
  if (!value || value === '/') return '';

  let path = value.trim();
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return '';
    }
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  return trimmed === '/' ? '' : trimmed;
}

function getNextAssetPrefix(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const nextData = window.__NEXT_DATA__ as { assetPrefix?: string } | undefined;
  return typeof nextData?.assetPrefix === 'string' ? nextData.assetPrefix : undefined;
}

function getNextPagePath(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const nextData = window.__NEXT_DATA__ as { page?: string } | undefined;
  return typeof nextData?.page === 'string' ? nextData.page : undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRouteSuffixPattern(routePath: string): RegExp | null {
  const normalizedRoute = normalizeBasePath(routePath);
  if (!normalizedRoute) return null;

  const segments = normalizedRoute
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return '[^/]+';
      }

      return escapeRegex(segment);
    });

  if (segments.length === 0) return null;
  return new RegExp(`/${segments.join('/')}$`);
}

function inferBasePathFromCurrentLocation(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const pathname = normalizeBasePath(window.location.pathname);
  if (!pathname) return '';

  const routePattern = toRouteSuffixPattern(getNextPagePath() || '');
  if (!routePattern) {
    return '';
  }

  const match = pathname.match(routePattern);
  if (!match || match.index === undefined) {
    return '';
  }

  return normalizeBasePath(pathname.slice(0, match.index));
}

export function getServerBasePath(): string {
  return normalizeBasePath(
    process.env.BASE_URL || process.env.ASSETS_PREFIX || process.env.NEXT_PUBLIC_BASE_PATH,
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

  return normalizeBasePath(inferBasePathFromCurrentLocation() || getNextAssetPrefix() || getServerBasePath());
}

export function appPath(pathname: string): string {
  return withBasePath(pathname, getClientBasePath());
}
