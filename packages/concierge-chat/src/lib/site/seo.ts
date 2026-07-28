export const abundanceSite = {
	name: 'Abundance Staffing',
	url: 'https://abundance-concierge-chat.pages.dev',
	description:
		'Guided nurse applications, facility coverage requests, public nursing jobs, and recruiter-reviewed staffing handoffs.',
	image: '/abundance/hero-home-2026.webp'
};

interface FaqEntry {
	question: string;
	answer: string;
}

interface BreadcrumbEntry {
	name: string;
	path: string;
}

interface ServiceEntry {
	name: string;
	description: string;
	path: string;
	audience: string;
}

export interface SeoJob {
	id: string;
	title: string;
	employer?: string;
	location?: string;
	city?: string;
	state?: string;
	country?: string;
	employment_type?: string;
	pay_min?: number;
	pay_max?: number;
	currency?: string;
	posted_at?: string;
	application_url?: string;
}

export function absoluteUrl(path = '/') {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	return `${abundanceSite.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function jsonLdScript(data: unknown) {
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${json}</script>`;
}

export function organizationJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: abundanceSite.name,
		url: abundanceSite.url,
		logo: absoluteUrl('/abundance/logo-mark.svg'),
		description: abundanceSite.description,
		sameAs: []
	};
}

export function websiteJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: abundanceSite.name,
		url: abundanceSite.url,
		description: abundanceSite.description,
		publisher: {
			'@type': 'Organization',
			name: abundanceSite.name
		}
	};
}

export function breadcrumbJsonLd(items: BreadcrumbEntry[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: absoluteUrl(item.path)
		}))
	};
}

export function serviceJsonLd(service: ServiceEntry) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Service',
		name: service.name,
		description: service.description,
		url: absoluteUrl(service.path),
		provider: {
			'@type': 'Organization',
			name: abundanceSite.name,
			url: abundanceSite.url
		},
		audience: {
			'@type': 'Audience',
			audienceType: service.audience
		},
		areaServed: 'United States',
		serviceType: 'Nurse staffing'
	};
}

export function faqJsonLd(faqs: FaqEntry[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((faq) => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer
			}
		}))
	};
}

export function jobItemListJsonLd(jobs: SeoJob[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Nursing jobs from Abundance Staffing',
		itemListElement: jobs.map((job, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			url: absoluteUrl(`/apply?job_id=${encodeURIComponent(job.id)}`),
			item: jobPostingJsonLd(job)
		}))
	};
}

export function jobPostingJsonLd(job: SeoJob) {
	const location = job.city || job.state || job.location
		? {
				'@type': 'Place',
				address: {
					'@type': 'PostalAddress',
					addressLocality: job.city,
					addressRegion: job.state,
					addressCountry: job.country ?? 'US',
					streetAddress: job.location && !job.city ? job.location : undefined
				}
			}
		: undefined;
	const salary =
		job.pay_min || job.pay_max
			? {
					'@type': 'MonetaryAmount',
					currency: job.currency ?? 'USD',
					value: {
						'@type': 'QuantitativeValue',
						minValue: job.pay_min,
						maxValue: job.pay_max,
						unitText: 'UNKNOWN'
					}
				}
			: undefined;

	return pruneUndefined({
		'@type': 'JobPosting',
		title: job.title,
		description: `Open nursing role available for Abundance Staffing recruiter review: ${job.title}.`,
		datePosted: job.posted_at,
		hiringOrganization: {
			'@type': 'Organization',
			name: job.employer ?? abundanceSite.name
		},
		jobLocation: location,
		employmentType: job.employment_type,
		baseSalary: salary,
		directApply: false,
		url: absoluteUrl(`/apply?job_id=${encodeURIComponent(job.id)}`),
		sameAs: job.application_url
	});
}

function pruneUndefined<T>(value: T): T {
	if (Array.isArray(value)) return value.map(pruneUndefined).filter((item) => item !== undefined) as T;
	if (!value || typeof value !== 'object') return value;

	return Object.fromEntries(
		Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.map(([key, entry]) => [key, pruneUndefined(entry)])
	) as T;
}
