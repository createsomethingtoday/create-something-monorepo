export const AGENCY_PROTECTED_PATHS = [
	'/account',
	'/dashboard',
	'/admin',
	'/api/community',
	'/mcp-access'
] as const;

export function isAgencyProtectedPath(pathname: string): boolean {
	return AGENCY_PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}
