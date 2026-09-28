/** Public reading/navigation shell; keep legal, transactions, auth and interactive tools separate. */
export function isIoResearchSurface(pathname: string, routeId: string | null): boolean {
	return (
		[
			'/',
			'/papers',
			'/experiments',
			'/plugins',
			'/methodology',
			'/about',
			'/categories',
			'/graph',
			'/newsletters',
			'/docs',
			'/agents',
			'/mcp'
		].includes(pathname) ||
		routeId === '/category/[slug]' ||
		routeId === '/agents/[slug]' ||
		routeId === '/mcp/[slug]' ||
		(routeId?.startsWith('/docs/') ?? false) ||
		routeId === '/experiments/[slug]' ||
		pathname.startsWith('/papers/') ||
		pathname.startsWith('/plugins/') ||
		pathname.startsWith('/newsletters/')
	);
}
