export interface WorkHistoryBullet {
	label: string;
	text: string;
}

export interface WorkHistoryItem {
	id: string;
	date: string;
	role: string;
	org: string;
	subtitle?: string;
	bullets: WorkHistoryBullet[];
}

/**
 * Work history timeline for .agency.
 *
 * Sources (repo-local):
 * - `packages/agency/static/resume-officehours.html`
 * - `packages/space/static/resume-micah-johnson-techforce.html`
 *
 * Notes:
 * - Some foundational experiences (e.g. photography company, equine vet tech) are intentionally left as
 *   "date needed" until confirmed, to avoid guessing.
 */
export const workHistory: WorkHistoryItem[] = [
	{
		id: 'tamu-animal-sciences',
		date: '2008 – 2010',
		role: 'B.S. Animal Sciences (Pre-vet track)',
		org: 'Texas A&M University',
		subtitle: 'Meat science praxis · Animal food science · Feed economics',
		bullets: [
			{
				label: 'Complexity',
				text: 'Physical systems (anatomy, processing constraints) and economic systems (feed distribution under real-world constraints).'
			},
			{
				label: 'Abstraction Tools',
				text: 'Categorization frameworks (cuts/processing), measurement + calculation, and turning messy reality into repeatable procedures.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Comfort with first-principles detail plus operational clarity: build models that stay true to reality while making it teachable and executable.'
			}
		]
	},
	{
		id: 'burleson-equine-hospital',
		date: '2010 – 2012',
		role: 'Veterinary Technician (Equine)',
		org: 'Burleson Equine Hospital',
		subtitle: 'Equine nursing · Blood draws · Farm visits · Clinical logging',
		bullets: [
			{
				label: 'Complexity',
				text: 'High-stakes clinical work with living systems: patient variability, time-sensitive decisions, and strict safety constraints (animal + human).'
			},
			{
				label: 'Hands-on Duties',
				text: "Equine nursing, drawing blood, administering medication per doctor's orders, assisting on farm visits, and maintaining accurate logs."
			},
			{
				label: 'Abstraction Tools',
				text: 'Protocols, checklists, dosage discipline, and documentation as a single source of truth for continuity of care.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Operational rigor + traceability: when stakes are real, you design systems that prevent errors, keep humans in the loop, and leave an audit trail.'
			}
		]
	},
	{
		id: 'photography-company',
		date: '2011 – 2013',
		role: 'Co-owner (Photography Company)',
		org: 'Independent',
		subtitle: 'Creative production pipeline · First attempt at web development as a service',
		bullets: [
			{
				label: 'Complexity',
				text: 'High-variance client work: creative direction, production, delivery, and expectation management.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Repeatable production workflows: templates, checklists, and “same inputs → predictable outputs” thinking.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Service instincts: ship outcomes on deadline, communicate tradeoffs clearly, and turn craft into a system clients can trust.'
			}
		]
	},
	{
		id: 'enterprise-holdings',
		date: '2014 – 2015',
		role: 'Digital Content Specialist',
		org: 'Enterprise Holdings',
		subtitle: 'CMS · SEO · Content operations',
		bullets: [
			{
				label: 'Complexity',
				text: 'Large-scale content systems: taxonomy, consistency, searchability, and operational maintenance.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Content models, publishing workflows, and the discipline of “structure first, copy second.”'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Agent systems need clean information architecture. This is early training in making knowledge queryable and dependable.'
			}
		]
	},
	{
		id: 'maritz',
		date: '2015 – 2016',
		role: 'Interactive Developer',
		org: 'Maritz',
		subtitle: 'Enterprise client web projects',
		bullets: [
			{
				label: 'Complexity',
				text: 'Shipping inside constraints: stakeholders, timelines, brand standards, and production reliability.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Reusable front-end patterns, component thinking, and pragmatic engineering tradeoffs.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Client work is constraint work. You get good by choosing what not to build and making the rest robust.'
			}
		]
	},
	{
		id: 'hunter',
		date: '2016 – 2018',
		role: 'UI Designer & Web Manager',
		org: 'Hunter Engineering',
		subtitle: 'Led web team · UI/UX design · Public sites',
		bullets: [
			{
				label: 'Complexity',
				text: 'Bridging product reality to user experience: constraints, stakeholder needs, and long-lived public surfaces.'
			},
			{
				label: 'Abstraction Tools',
				text: 'UI systems, standards, and operating rules: make it consistent so the team can move faster without quality decay.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'A strong interface is an abstraction layer. Same principle applies to agent tooling: reduce cognitive load without hiding truth.'
			}
		]
	},

	{
		id: 'webflow-support',
		date: 'Feb 2018 – Mar 2020',
		role: 'Customer Support Specialist & Team Manager',
		org: 'Webflow',
		subtitle: '500+ user conversations · Onboarding systems · Troubleshooting',
		bullets: [
			{
				label: 'Complexity',
				text: 'Real-world failure modes: permissions, publishing, integrations, CSS/JS bugs, user mental models, and trust repair.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Troubleshooting trees, internal runbooks, and onboarding programs that turn tacit knowledge into repeatable process.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'This is where “tools + explainability” becomes a discipline: show work, leave an audit trail, and design for the next person.'
			}
		]
	},

	{
		id: 'webflow-educator',
		date: 'Mar 2020 – Apr 2021',
		role: 'On-Screen Educator',
		org: 'Webflow',
		subtitle: 'Webflow University 2.0 · Documentation that links output to inputs',
		bullets: [
			{
				label: 'Complexity',
				text: 'Teaching at scale: reducing complexity without lying, across wildly different skill levels.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Curriculum design, clear mental models, and “explain the system, not the steps.”'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Clients need systems they can understand. Agent work especially needs transparency, guardrails, and a shared vocabulary.'
			}
		]
	},
	{
		id: 'webflow-marketplace-ops',
		date: 'Jul 2023 – Dec 2024',
		role: 'Marketplace Operations Manager',
		org: 'Webflow',
		subtitle: 'Template marketplace QA · Operational dashboards · Standards',
		bullets: [
			{
				label: 'Complexity',
				text: 'Marketplace systems: quality enforcement, creator experience, and scaling review across thousands of assets.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Dashboards, checklists, and standards-as-code thinking: turn subjective review into consistent evaluation.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Operational data becomes intelligence. The value is in the feedback loop, not the one-off report.'
			}
		]
	},
	{
		id: 'webflow-system-architect',
		date: 'Dec 2024 – Present',
		role: 'Senior Systems Architect',
		org: 'Webflow',
		subtitle: 'Marketplace data infrastructure · Pipelines (Census/Snowflake/Amplitude/Segment)',
		bullets: [
			{
				label: 'Complexity',
				text: 'Distributed systems and data reality: events, identity, attribution, and the difference between “data exists” and “data is trusted.”'
			},
			{
				label: 'Abstraction Tools',
				text: 'Pipelines, service boundaries, and auditability: design systems where changes are traceable and safe to evolve.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'This is the core .agency muscle: build the connective tissue and operating boundaries so AI can operate safely in real operations.'
			}
		]
	},
	{
		id: 'create-something',
		date: 'Nov 2018 – Present',
		role: 'Webflow & API Developer',
		org: 'CREATE SOMETHING',
		subtitle: 'Custom development · API integrations · Automation systems',
		bullets: [
			{
				label: 'Complexity',
				text: 'Integrations live at the edges: mismatched data models, brittle auth, third-party outages, and humans who just need it to work.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Webflow + custom code, API-first builds, and automation “glue” that reduces tool sprawl into a single workflow.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'This becomes the delivery backbone: connect systems, preserve auditability, and make automation maintainable (not a pile of zaps).'
			}
		]
	},
	{
		id: 'half-dozen',
		date: 'Jul 2024 – Present',
		role: 'Co-Founder, Technology',
		org: 'Half Dozen',
		subtitle: 'Full-stack platform · 10+ service integrations · Multi-tenant operations',
		bullets: [
			{
				label: 'Complexity',
				text: 'Operational edge cases: schedules, payments, compliance, and the human messiness around live events.'
			},
			{
				label: 'Abstraction Tools',
				text: 'Integration architecture, permissioning, and reliability patterns for systems that must keep running.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'Deep integration work: it’s not the API call, it’s the lifecycle. This is where “connectivity layer” becomes real.'
			}
		]
	},
	{
		id: 'workway',
		date: 'Apr 2025 – Present',
		role: 'Founder',
		org: 'WORKWAY',
		subtitle: 'Workflow marketplace · Knowledge graph architecture · Edge infrastructure',
		bullets: [
			{
				label: 'Complexity',
				text: 'Compound automation: multi-step workflows, failure recovery, and progressive autonomy (humans stay in control).'
			},
			{
				label: 'Abstraction Tools',
				text: 'Workflow primitives + marketplace structure: turn “custom automation” into composable building blocks.'
			},
			{
				label: 'Carry-forward (.agency)',
				text: 'This becomes the productized expression of the service: patterns that are stable enough to sell and safe enough to trust.'
			}
		]
	}
];

export const workHistoryMilestones = {
	events: [
		{ date: '2008', label: 'A&M', description: 'Domain systems', highlight: false },
		{ date: '2018', label: 'Webflow', description: 'Support → Education', highlight: false },
		{ date: '2023', label: 'Marketplace', description: 'Ops systems', highlight: false },
		{ date: '2024', label: 'Sr Systems Arch', description: 'Data infra', highlight: true },
		{ date: '2018', label: 'Create Something', description: 'Web + APIs', highlight: true },
		{ date: '2025', label: 'WORKWAY', description: 'Automation infra', highlight: true }
	],
	orientation: 'horizontal' as const
};
