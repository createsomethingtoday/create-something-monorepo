import type { CanonRegistryManifest } from './schema.js';

const CLEAR_PRIMITIVE_ITEMS: CanonRegistryManifest['items'] = [
	{
		id: 'component.clear-page-section',
		name: 'ClearPageSection',
		kind: 'component',
		maturity: 'stable',
		description:
			'Open page section primitive for clear communication layouts with restrained spacing and readable hierarchy.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPageSection.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'layout', 'section', 'surface'],
		modalities: ['web', 'app'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Sections must preserve heading order, landmarks, and readable spacing.',
			extension: 'Use page sections for full-width layout bands instead of nested card shells.'
		}
	},
	{
		id: 'component.clear-error-page',
		name: 'ClearErrorPage',
		kind: 'component',
		maturity: 'stable',
		description:
			'Plain-language error state surface that names what happened and the next recovery action.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearErrorPage.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'error', 'recovery', 'state'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'Error surfaces must state the problem and recovery path in text.',
			evidence: 'When possible, include receipt, owner, or support route for the failure.',
			extension: 'Project overlays may provide local support copy without replacing the primitive.'
		}
	},
	{
		id: 'component.clear-platform-hero',
		name: 'ClearPlatformHero',
		kind: 'component',
		maturity: 'stable',
		description:
			'First-screen platform hero that pairs a plain operational claim with proof metadata.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPlatformHero.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'hero', 'claim', 'proof'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core', 'component.clear-proof-strip'],
		contract: {
			accessibility: 'Hero claims must remain readable as text and not depend on decorative media.',
			evidence: 'Claims need adjacent proof metadata or a route to receipts.',
			extension: 'Project overlays own local offer copy while Canon owns the claim/proof structure.'
		}
	},
	{
		id: 'component.clear-logo-strip',
		name: 'ClearLogoStrip',
		kind: 'component',
		maturity: 'stable',
		description: 'Compact trust or partner strip for recognizable proof without crowding the page.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearLogoStrip.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'proof', 'logos', 'trust'],
		modalities: ['web', 'app'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Logo rows need text alternatives and must not be the only proof claim.',
			evidence: 'Use only when the relationship or receipt behind the mark is true.',
			extension: 'Local overlays provide logo assets and labels; Canon owns strip structure.'
		}
	},
	{
		id: 'component.clear-proof-strip',
		name: 'ClearProofStrip',
		kind: 'component',
		maturity: 'stable',
		description: 'Compact proof objects for claims, validation gates, receipts, and trust evidence.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearProofStrip.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'proof', 'evidence', 'receipt'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			evidence: 'Proof items must connect claims to concrete artifacts, checks, or receipts.',
			extension: 'Prefer this when multiple proof objects need to be scanned together.'
		}
	},
	{
		id: 'component.clear-workflow-mini-artifact',
		name: 'ClearWorkflowMiniArtifact',
		kind: 'component',
		maturity: 'stable',
		description:
			'Small workflow artifact card for showing object, state, owner, and receipt in compact surfaces.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearWorkflowMiniArtifact.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'workflow', 'artifact', 'receipt'],
		modalities: ['web', 'app', 'chat', 'glasses'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'Mini artifacts must keep object, state, and owner readable without hover.',
			evidence: 'Receipt or source metadata should sit near the workflow state.',
			extension: 'Use for compact workflow previews before inventing local status cards.'
		}
	},
	{
		id: 'component.clear-state-rows',
		name: 'ClearStateRows',
		kind: 'component',
		maturity: 'stable',
		description: 'Scannable rows for workflow state, owner, evidence, and next action.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearStateRows.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'state', 'workflow', 'owner'],
		modalities: ['web', 'app', 'chat', 'voice', 'glasses'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'State must be encoded in text and structure, not color alone.',
			evidence: 'Rows should name owner, evidence, receipt, or next action.',
			extension: 'Use for operational state lists across web, chat summaries, and thin displays.'
		}
	},
	{
		id: 'component.clear-artifact-card',
		name: 'ClearArtifactCard',
		kind: 'component',
		maturity: 'stable',
		description: 'Card for a single proof artifact, policy object, receipt, or source-of-truth item.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearArtifactCard.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'artifact', 'proof', 'card'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Artifact cards need explicit titles and link/action labels.',
			evidence: 'Artifact metadata should identify what is proved and where the source lives.',
			extension: 'Use before creating local proof cards for individual artifacts.'
		}
	},
	{
		id: 'component.clear-card-grid',
		name: 'ClearCardGrid',
		kind: 'component',
		maturity: 'stable',
		description: 'Repeated clear cards for comparable work objects, offers, artifacts, or services.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearCardGrid.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'grid', 'cards', 'comparison'],
		modalities: ['web', 'app'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Card grids must preserve readable headings and stable focus order.',
			extension: 'Use for repeated items; avoid nested card-in-card page composition.'
		}
	},
	{
		id: 'component.clear-use-case-band',
		name: 'ClearUseCaseBand',
		kind: 'component',
		maturity: 'stable',
		description: 'Use-case band for mapping audience needs to outcomes, proof, and actions.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearUseCaseBand.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'use-case', 'outcome', 'workflow'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'Use cases must be stated as workflow needs and outcomes.',
			evidence: 'Each use case should connect to proof, receipt, or a next action.',
			extension: 'Project overlays provide domain-specific use cases without changing the band.'
		}
	},
	{
		id: 'component.clear-quote-metric-panel',
		name: 'ClearQuoteMetricPanel',
		kind: 'component',
		maturity: 'stable',
		description: 'Panel pairing a human quote with metric proof or operational evidence.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearQuoteMetricPanel.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'quote', 'metric', 'proof'],
		modalities: ['web', 'app'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Quotes and metrics must remain readable as text.',
			evidence: 'Metrics need labels and should not imply precision without source proof.',
			extension: 'Local overlays provide quote and metric content; Canon owns the proof layout.'
		}
	},
	{
		id: 'component.clear-pillar-grid',
		name: 'ClearPillarGrid',
		kind: 'component',
		maturity: 'stable',
		description: 'Pillar grid for principle, capability, or workflow structure summaries.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearPillarGrid.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'pillars', 'principles', 'structure'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Pillars need descriptive headings and optional links with clear labels.',
			extension: 'Use for structured explanation before creating local principle grids.'
		}
	},
	{
		id: 'component.clear-metadata-rail',
		name: 'ClearMetadataRail',
		kind: 'component',
		maturity: 'stable',
		description: 'Metadata rail for owner, source, receipt, status, and related workflow facts.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearMetadataRail.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'metadata', 'owner', 'receipt'],
		modalities: ['web', 'app', 'chat', 'voice'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'Metadata labels and values must remain paired in text.',
			evidence: 'Rails should expose owner, source, receipt, or status metadata near decisions.',
			extension: 'Use for supporting facts instead of hiding trust details in prose.'
		}
	},
	{
		id: 'component.clear-security-panel',
		name: 'ClearSecurityPanel',
		kind: 'component',
		maturity: 'stable',
		description: 'Security and governance panel for controls, logs, owners, and review state.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearSecurityPanel.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'security', 'governance', 'controls'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'Security state must be visible in text and grouped by control or log.',
			evidence: 'Controls and logs should identify owner, state, and proof.',
			extension: 'Project policy details stay local while Canon owns the security display pattern.'
		}
	},
	{
		id: 'component.clear-content-highlights',
		name: 'ClearContentHighlights',
		kind: 'component',
		maturity: 'stable',
		description: 'Highlight list for key claims, lessons, capabilities, or evidence points.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearContentHighlights.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'content', 'highlights', 'claims'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Highlights must use readable text labels and not only visual emphasis.',
			extension: 'Use for compact content summaries before creating local feature lists.'
		}
	},
	{
		id: 'component.clear-receipt-grid',
		name: 'ClearReceiptGrid',
		kind: 'component',
		maturity: 'stable',
		description: 'Grid for receipts, validation proof, artifacts, and completion evidence.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearReceiptGrid.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'receipt', 'proof', 'validation'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility: 'Receipts need labels, status text, and navigable links when interactive.',
			evidence: 'Every receipt should identify what was validated and where proof lives.',
			extension: 'Use before inventing local proof grids or launch evidence panels.'
		}
	},
	{
		id: 'component.clear-cta-band',
		name: 'ClearCtaBand',
		kind: 'component',
		maturity: 'stable',
		description: 'Call-to-action band that names the next action and supporting proof.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearCtaBand.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'cta', 'action', 'handoff'],
		modalities: ['web', 'app'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Action labels must describe the outcome and remain keyboard reachable.',
			evidence: 'When trust matters, pair the action with a proof or receipt cue.',
			extension: 'Local overlays provide action copy and destinations; Canon owns band structure.'
		}
	},
	{
		id: 'component.clear-action-footer',
		name: 'ClearActionFooter',
		kind: 'component',
		maturity: 'stable',
		description: 'Footer action group for final commands, secondary routes, and handoff state.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearActionFooter.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'action', 'footer', 'handoff'],
		modalities: ['web', 'app', 'chat'],
		dependencies: ['token.canon-core'],
		contract: {
			accessibility: 'Footer actions must be clearly labeled and ordered by expected workflow.',
			extension: 'Use for terminal action groups before creating local footer button clusters.'
		}
	},
	{
		id: 'component.clear-decision-panel',
		name: 'ClearDecisionPanel',
		kind: 'component',
		maturity: 'stable',
		description:
			'Clear communication surface for allow, review, block, and neutral decision states with evidence and receipts.',
		ownerPackage: '@create-something/canon',
		sourcePath: 'packages/canon/src/lib/components/clear/ClearDecisionPanel.svelte',
		importPath: '@create-something/canon',
		docsPath: '/canon/components/clear',
		tags: ['clear', 'decision', 'run-wait-stop', 'evidence', 'receipt'],
		modalities: ['web', 'app', 'chat', 'voice', 'glasses'],
		dependencies: ['token.canon-core', 'policy.signal-decision-proof'],
		contract: {
			accessibility:
				'Decision state must be present in text and structure, not only color or animation.',
			evidence: 'Every decision item should name evidence, receipt, owner, or next action.',
			motion: 'Motion is limited to state, selection, progression, or handoff.',
			extension:
				'Use this before inventing local decision cards, approval panels, or status shells.'
		}
	}
];

export const CANON_REGISTRY_MANIFEST: CanonRegistryManifest = {
	schemaVersion: 1,
	id: 'canon-registry',
	sourceOfTruth: '@create-something/canon/registry',
	description:
		'Machine-readable Canon foundation for CREATE SOMETHING design system discovery, templates, modality adapters, and project extension governance.',
	requiredModalities: ['web', 'chat', 'app', 'voice', 'glasses'],
	extensionLifecycle: [
		{
			stage: 'project-local',
			description:
				'Project or client overlay owns the need, evidence, and local implementation without forking Canon primitives.'
		},
		{
			stage: 'candidate',
			description:
				'Pattern repeats across at least two surfaces or clients and receives a source-adjacent contract plus docs path.'
		},
		{
			stage: 'canon-stable',
			description:
				'Canon owns the primitive, export path, tests, docs, and compatibility contract for all consumers.'
		},
		{
			stage: 'deprecated',
			description:
				'Canon keeps discovery metadata and migration guidance while routing new work to the replacement primitive.'
		}
	],
	agentContract: {
		purpose: 'canon-design-system-discovery',
		primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
		useFor: [
			'choose Canon primitives before inventing local UI',
			'map a requested surface to web, chat, app, voice, or glasses modality constraints',
			'find templates that preserve Signal, Decision, Proof, receipt, and owner structure',
			'decide whether a client/project pattern should stay local or become a Canon candidate'
		],
		stopBefore: [
			'copying third-party brand identity into Canon',
			'creating a local component when an equivalent stable primitive exists',
			'moving reasoning or trust boundaries onto thin display devices',
			'promoting a project-local overlay without evidence from multiple surfaces or clients'
		]
	},
	items: [
		{
			id: 'token.canon-core',
			name: 'Canon Core Tokens',
			kind: 'token',
			maturity: 'stable',
			description:
				'Shared color, typography, spacing, radius, motion, surface, and proof-state values used by Canon consumers.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/styles/tokens.css',
			importPath: '@create-something/canon/styles/tokens.css',
			docsPath: '/canon/resources/tokens',
			tags: ['tokens', 'css', 'foundation', 'theme'],
			modalities: ['web', 'app', 'chat', 'voice', 'glasses'],
			contract: {
				accessibility: 'Tokens must preserve readable contrast and must not make state color-only.',
				extension: 'Project overlays may add aliases, but canonical values remain owned by Canon.'
			}
		},
		{
			id: 'component.button',
			name: 'Button',
			kind: 'component',
			maturity: 'stable',
			description: 'Action control for primary, secondary, and ghost interactions.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/components/Button.svelte',
			importPath: '@create-something/canon',
			docsPath: '/canon/components/button',
			tags: ['action', 'control', 'web'],
			modalities: ['web', 'app'],
			dependencies: ['token.canon-core'],
			contract: {
				accessibility: 'Actions need explicit labels, disabled state, and visible focus treatment.',
				extension: 'Use variants before adding local button styles.'
			}
		},
		{
			id: 'component.card',
			name: 'Card',
			kind: 'component',
			maturity: 'stable',
			description: 'Container for grouping related content with controlled emphasis.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/components/Card.svelte',
			importPath: '@create-something/canon',
			docsPath: '/canon/components/card',
			tags: ['container', 'surface', 'web'],
			modalities: ['web', 'app'],
			dependencies: ['token.canon-core'],
			contract: {
				accessibility: 'Cards must not hide structure from headings, landmarks, or link text.',
				extension: 'Use cards for bounded repeated items, not nested page-section decoration.'
			}
		},
		{
			id: 'component.navigation',
			name: 'Navigation',
			kind: 'component',
			maturity: 'stable',
			description: 'Primary wayfinding with property-aware navigation and clear visual style support.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/components/Navigation.svelte',
			importPath: '@create-something/canon',
			docsPath: '/canon/components/navigation',
			tags: ['navigation', 'wayfinding', 'property'],
			modalities: ['web', 'app'],
			dependencies: ['token.canon-core'],
			contract: {
				accessibility: 'Navigation must expose clear labels, current state, and mobile-safe targets.',
				extension: 'Property packages configure links and policy; Canon owns the primitive.'
			}
		},
		...CLEAR_PRIMITIVE_ITEMS,
		{
			id: 'adapter.atlas-graph-artifact',
			name: 'Atlas Graph Artifact',
			kind: 'adapter',
			maturity: 'stable',
			description:
				'Renderer-independent workflow graph contract for human-readable and agent-readable maps.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/atlas/headless.ts',
			importPath: '@create-something/canon/atlas/headless',
			docsPath: '/canon/components/clear',
			tags: ['atlas', 'graph', 'workflow-map', 'agent-contract'],
			modalities: ['web', 'app', 'chat', 'voice', 'glasses'],
			dependencies: ['policy.signal-decision-proof'],
			contract: {
				evidence: 'Graph nodes must preserve owner, status, products, and source-of-truth role.',
				extension:
					'Renderers may change by modality, but the graph/story artifact shape stays Canon-owned.'
			}
		},
		{
			id: 'template.atlas-development-handoff',
			name: 'Atlas Development Handoff Template',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Agent-readable handoff packet that turns an Atlas workflow map into Database, Automation, Judgment, Linear, verification, and stop-condition sections.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/atlas/handoff.ts',
			importPath: '@create-something/canon/atlas/handoff',
			docsPath: '/canon/resources/registry',
			tags: ['atlas', 'handoff', 'linear', 'template', 'agent-contract', 'workflow-map'],
			modalities: ['web', 'chat', 'app', 'voice', 'glasses'],
			dependencies: ['adapter.atlas-graph-artifact', 'policy.signal-decision-proof'],
			contract: {
				accessibility:
					'Handoff packets must preserve readable text sections so chat, voice, and thin displays can summarize without relying on visual-only state.',
				evidence:
					'Every packet must name the durable record, run path, approval point, stop condition, proof surface, verification command, and Linear evidence path.',
				extension:
					'Project overlays may add local context, but the Atlas-to-development packet structure stays Canon-owned.'
			}
		},
		{
			id: 'policy.signal-decision-proof',
			name: 'Signal Decision Proof Contract',
			kind: 'policy',
			maturity: 'stable',
			description:
				'Governance product loop: Atlas maps, Signal captures, Decision routes, Proof records back to Atlas.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/governance/products.ts',
			importPath: '@create-something/canon/governance',
			docsPath: '/canon/components/clear',
			tags: ['atlas', 'signal', 'decision', 'proof', 'governance'],
			modalities: ['web', 'chat', 'app', 'voice', 'glasses'],
			contract: {
				evidence:
					'Production surfaces must preserve the loop: Atlas -> Signal -> Decision -> Proof -> Atlas.',
				extension: 'New products attach to this loop instead of inventing parallel IDs.'
			}
		},
		{
			id: 'template.canon-extension-intake',
			name: 'Canon Extension Intake Template',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Machine-readable packet for project and client overlays to propose Canon extensions, candidate promotion, or deprecated replacement routing.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/registry/schema.ts',
			importPath: '@create-something/canon/registry',
			docsPath: '/canon/resources/registry',
			tags: ['template', 'extension', 'intake', 'overlay', 'promotion', 'governance'],
			modalities: ['web', 'chat', 'app', 'voice', 'glasses'],
			dependencies: ['policy.signal-decision-proof'],
			contract: {
				accessibility:
					'Extension packets must name modality constraints before a display primitive is promoted.',
				evidence:
					'Candidate promotion requires evidence from at least two distinct surfaces or clients.',
				extension:
					'Project overlays own project-local evidence; Canon owns stable exports, docs, tests, and compatibility.'
			}
		},
		{
			id: 'template.canon-project-overlay-manifest',
			name: 'Canon Project Overlay Manifest',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Machine-readable manifest for project and client overlays to declare theme, token, template, copy, policy, and registry artifacts without forking Canon primitives.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/registry/schema.ts',
			importPath: '@create-something/canon/registry',
			docsPath: '/canon/resources/registry',
			tags: ['template', 'overlay', 'manifest', 'project', 'client', 'governance'],
			modalities: ['web', 'chat', 'app', 'voice', 'glasses'],
			dependencies: ['template.canon-extension-intake', 'policy.signal-decision-proof'],
			contract: {
				accessibility:
					'Overlay manifests must name target modalities before local copy, visual, or interaction policy is applied.',
				evidence:
					'Complete overlays declare theme, tokens, templates, copy rules, surface policy, registry metadata, and any extension-intake evidence.',
				extension:
					'Projects extend Canon through named overlay artifacts; primitive changes still route through Canon extension intake and review.'
			}
		},
		{
			id: 'template.canon-project-overlay-template-pack',
			name: 'Canon Project Overlay Template Pack',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Copyable project/client overlay starter pack with theme, tokens, templates, copy rules, surface policy, registry metadata, and a typed manifest.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/overlays/project-template/index.ts',
			importPath: '@create-something/canon/overlays/project-template',
			docsPath: '/canon/resources/registry',
			tags: [
				'template',
				'overlay',
				'starter',
				'project',
				'client',
				'copyable',
				'governance'
			],
			modalities: ['web', 'chat', 'app', 'voice', 'glasses'],
			dependencies: [
				'template.canon-project-overlay-manifest',
				'template.canon-extension-intake',
				'token.canon-core',
				'policy.signal-decision-proof'
			],
			contract: {
				accessibility:
					'Template packs must include modality policy so thin displays can summarize state without visual-only context.',
				evidence:
					'The starter manifest must review as ready and point to every required overlay artifact path.',
				extension:
					'Projects copy and fill the overlay files; primitive changes still route through Canon extension intake instead of forks.'
			}
		},
		{
			id: 'template.web-governed-workflow',
			name: 'Web Governed Workflow Template',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Default web/app composition for a mapped workflow: hero claim, Atlas map, decision panel, proof strip, and action footer.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/registry/data.ts',
			docsPath: '/canon/components/clear',
			tags: ['template', 'web', 'workflow', 'governance'],
			modalities: ['web', 'app'],
			dependencies: [
				'component.navigation',
				'component.clear-decision-panel',
				'component.clear-proof-strip',
				'adapter.atlas-graph-artifact'
			],
			contract: {
				accessibility: 'Template must keep headings, landmarks, and next action readable.',
				evidence: 'A claim is incomplete until the adjacent proof object is visible.',
				extension: 'Client overlays provide copy, starter maps, integrations, and receipts.'
			}
		},
		{
			id: 'template.chat-decision-brief',
			name: 'Chat Decision Brief Template',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Compact chat response structure for decision state, evidence, owner, next action, and stop condition.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/registry/data.ts',
			tags: ['template', 'chat', 'decision', 'brief'],
			modalities: ['chat', 'voice'],
			dependencies: ['policy.signal-decision-proof'],
			contract: {
				evidence: 'Chat briefs must cite or name proof, not only summarize confidence.',
				extension: 'Project prompts may adapt language but must preserve state/evidence/owner/action.'
			}
		},
		{
			id: 'template.glasses-routing-hud',
			name: 'Glasses Routing HUD Template',
			kind: 'template',
			maturity: 'candidate',
			description:
				'Thin heads-up display structure for ranked work, brief detail access, confirmation, and handoff.',
			ownerPackage: '@create-something/canon',
			sourcePath: 'packages/canon/src/lib/registry/data.ts',
			tags: ['template', 'glasses', 'hud', 'routing'],
			modalities: ['glasses'],
			dependencies: ['policy.signal-decision-proof'],
			contract: {
				accessibility: 'Main view must stay one-glance and reserve details for explicit selection.',
				evidence: 'Evidence may be available on detail press but must not clutter the home view.',
				extension:
					'Reasoning, ranking, secrets, and trust decisions stay on the Worker/server side; glasses display routed state.'
			}
		}
	]
};
