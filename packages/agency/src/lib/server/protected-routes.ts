export const AGENCY_PROTECTED_PATHS = [
	'/account',
	'/dashboard',
	'/admin',
	'/delivery/abundance/healthcare-analyst',
	'/api/community',
	'/api/control',
	'/mcp-access',
	'/map/workspace',
	'/map/subscribe'
] as const;

export function isAgencyProtectedPath(pathname: string): boolean {
	return AGENCY_PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}
