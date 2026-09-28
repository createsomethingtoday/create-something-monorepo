/** Public reading/navigation shell; keep transactions, auth and interactive tools separate. */
export function isIoResearchSurface(pathname: string, routeId: string | null): boolean {
	return (
		[
			'/',
			'/papers',
			'/experiments',
			'/plugins',
			'/methodology',
			'/about',
			'/contact',
			'/subscribe',
			'/privacy',
			'/terms',
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
