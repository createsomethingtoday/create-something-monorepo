export interface IoFooterHandoff {
	kind: 'commercial' | 'research';
	showNewsletter: boolean;
	showCommercialCta: boolean;
}

const RESEARCH_DETAIL_ROUTE = /^\/(papers|experiments)\/[^/]+\/?$/;

export function getIoFooterHandoff(pathname: string): IoFooterHandoff {
	const continuesResearch = RESEARCH_DETAIL_ROUTE.test(pathname);

	return {
		kind: continuesResearch ? 'research' : 'commercial',
		showNewsletter: continuesResearch,
		showCommercialCta: !continuesResearch
	};
}
