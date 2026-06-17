export function parseBooleanFlag(value: string | undefined): boolean | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      return undefined;
  }
}

export function readRuntimeEnv(platform: App.Platform | undefined, key: string) {
  if (typeof process !== 'undefined') {
    const processValue = process.env?.[key];
    if (typeof processValue === 'string' && processValue.length > 0) {
      return processValue;
    }
  }

  const platformEnv = platform?.env as Record<string, unknown> | undefined;
  const platformValue = platformEnv?.[key];
  if (typeof platformValue === 'string' && platformValue.length > 0) {
    return platformValue;
  }

  return undefined;
}

export function readRuntimeList(platform: App.Platform | undefined, key: string): string[] {
  return (
    readRuntimeEnv(platform, key)
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

export function isProductionRuntime(platform?: App.Platform) {
  return readRuntimeEnv(platform, 'ENVIRONMENT') === 'production';
}

export function isPreviewAccessEnabled(platform?: App.Platform) {
  const explicitFlag = parseBooleanFlag(readRuntimeEnv(platform, 'ALLOW_CLERK_ACCESS_PREVIEW'));
  if (explicitFlag !== undefined) {
    return explicitFlag;
  }

  return !isProductionRuntime(platform);
}
