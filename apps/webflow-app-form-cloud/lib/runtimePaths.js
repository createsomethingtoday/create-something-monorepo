function normalizePrefix(value) {
  if (!value || value === '/') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  if (!withoutTrailingSlash || withoutTrailingSlash === '/') {
    return '';
  }

  return withoutTrailingSlash.startsWith('/')
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash.replace(/^\/+/, '')}`;
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith('//');
}

function getNextDataAssetPrefix() {
  if (typeof window === 'undefined') {
    return '';
  }

  const nextData = window.__NEXT_DATA__;
  const rawAssetPrefix = typeof nextData?.assetPrefix === 'string' ? nextData.assetPrefix : '';
  if (!rawAssetPrefix) {
    return '';
  }

  try {
    const assetUrl = new URL(rawAssetPrefix, window.location.origin);
    return normalizePrefix(assetUrl.pathname);
  } catch {
    return normalizePrefix(rawAssetPrefix);
  }
}

export function getBasePath() {
  return normalizePrefix(
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    ''
  ) || getNextDataAssetPrefix();
}

export function getAssetPrefix() {
  const assetPrefix =
    process.env.NEXT_PUBLIC_ASSETS_PREFIX ||
    process.env.ASSETS_PREFIX ||
    getNextDataAssetPrefix();

  if (!assetPrefix) {
    return getBasePath();
  }

  return isAbsoluteUrl(assetPrefix)
    ? assetPrefix.replace(/\/+$/, '')
    : normalizePrefix(assetPrefix);
}

export function withBasePath(path) {
  if (!path) {
    return getBasePath() || '/';
  }

  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = getBasePath();

  if (!basePath || normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath;
  }

  return `${basePath}${normalizedPath}`;
}

export function withAssetPrefix(path) {
  if (!path) {
    return getAssetPrefix() || '/';
  }

  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const assetPrefix = getAssetPrefix();

  if (!assetPrefix || normalizedPath === assetPrefix || normalizedPath.startsWith(`${assetPrefix}/`)) {
    return normalizedPath;
  }

  return `${assetPrefix}${normalizedPath}`;
}
