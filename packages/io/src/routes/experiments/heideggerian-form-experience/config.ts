/**
 * Heideggerian Form Experience - Service Configuration Tree
 *
 * This defines the cascading options for the service configuration form.
 * Each selection reveals the next level of options.
 *
 * Flow: Service Type → Scope → Features → Pricing Tier
 */

import type { ServiceTypeConfig, PricingTier } from './types';

// =============================================================================
// SERVICE TYPE CONFIGURATIONS
// =============================================================================

export const serviceConfig: Record<string, ServiceTypeConfig> = {
	automation: {
		label: 'Automation',
		description: 'Remove repetitive work from your processes',
		scopes: {
			workflow: {
				label: 'Workflow Automation',
				description: 'Automate task routing, approvals, and handoffs',
				features: [
					{
						id: 'auto-routing',
						label: 'Intelligent Routing',
						description: 'Route tasks based on content and context'
					},
					{
						id: 'auto-triggers',
						label: 'Event Triggers',
						description: 'Automate responses to business events'
					},
					{
						id: 'auto-approval',
						label: 'Smart Approvals',
						description: 'Conditional approval workflows'
					},
					{
						id: 'auto-notifications',
						label: 'Contextual Alerts',
						description: 'Notify the right people at the right time'
					}
				]
			},
			data: {
				label: 'Data Automation',
				description: 'Keep data flowing between systems automatically',
				features: [
					{
						id: 'data-sync',
						label: 'Cross-System Sync',
						description: 'Keep data consistent across platforms'
					},
					{
						id: 'data-transform',
						label: 'Data Transformation',
						description: 'Convert between formats automatically'
					},
					{
						id: 'data-validation',
						label: 'Validation Rules',
						description: 'Ensure data quality at entry'
					},
					{
						id: 'data-archival',
						label: 'Smart Archival',
						description: 'Lifecycle management for data'
					}
				]
			},
			reporting: {
				label: 'Reporting Automation',
				description: 'Generate and distribute reports automatically',
				features: [
					{
						id: 'report-generation',
						label: 'Auto-Generation',
						description: 'Create reports on schedule'
					},
					{
						id: 'report-distribution',
						label: 'Smart Distribution',
						description: 'Send to the right stakeholders'
					},
					{
						id: 'report-alerts',
						label: 'Threshold Alerts',
						description: 'Notify when metrics cross limits'
					},
					{
						id: 'report-dashboards',
						label: 'Live Dashboards',
						description: 'Real-time metric visualization'
					}
				]
			},
			integration: {
				label: 'Integration Automation',
				description: 'Connect disparate systems seamlessly',
				features: [
					{
						id: 'int-api',
						label: 'API Orchestration',
						description: 'Coordinate multiple API calls'
					},
					{
						id: 'int-webhooks',
						label: 'Webhook Management',
						description: 'Handle incoming events reliably'
					},
					{
						id: 'int-queues',
						label: 'Message Queues',
						description: 'Decouple systems with async messaging'
					},
					{
						id: 'int-fallbacks',
						label: 'Graceful Fallbacks',
						description: 'Handle failures without breaking flows'
					}
				]
			}
		}
	},
	transformation: {
		label: 'Transformation',
		description: 'Evolve how your organization works',
		scopes: {
			process: {
				label: 'Process Transformation',
				description: 'Redesign workflows for efficiency and clarity',
				features: [
					{
						id: 'proc-mapping',
						label: 'Process Mapping',
						description: 'Visualize current workflows'
					},
					{
						id: 'proc-optimization',
						label: 'Optimization',
						description: 'Remove unnecessary steps'
					},
					{
						id: 'proc-measurement',
						label: 'Metrics Framework',
						description: 'Track process performance'
					},
					{
						id: 'proc-governance',
						label: 'Governance',
						description: 'Ensure process compliance'
					}
				]
			},
			culture: {
				label: 'Culture Transformation',
				description: 'Shift mindsets and behaviors',
				features: [
					{
						id: 'cult-assessment',
						label: 'Culture Assessment',
						description: 'Understand current state'
					},
					{
						id: 'cult-workshops',
						label: 'Workshops',
						description: 'Facilitated team sessions'
					},
					{
						id: 'cult-coaching',
						label: 'Leadership Coaching',
						description: 'One-on-one executive support'
					},
					{
						id: 'cult-measurement',
						label: 'Culture Metrics',
						description: 'Track cultural indicators'
					}
				]
			},
			technology: {
				label: 'Technology Transformation',
				description: 'Modernize your tech stack',
				features: [
					{
						id: 'tech-assessment',
						label: 'Tech Assessment',
						description: 'Audit current systems'
					},
					{
						id: 'tech-roadmap',
						label: 'Modernization Roadmap',
						description: 'Plan the journey'
					},
					{
						id: 'tech-migration',
						label: 'Migration Support',
						description: 'Execute the transition'
					},
					{
						id: 'tech-training',
						label: 'Team Training',
						description: 'Build new capabilities'
					}
				]
			},
			strategy: {
				label: 'Strategic Transformation',
				description: 'Redefine your market position',
				features: [
					{
						id: 'strat-analysis',
						label: 'Market Analysis',
						description: 'Understand competitive landscape'
					},
					{
						id: 'strat-positioning',
						label: 'Positioning',
						description: 'Define your unique value'
					},
					{
						id: 'strat-planning',
						label: 'Strategic Planning',
						description: 'Build actionable roadmap'
					},
					{
						id: 'strat-execution',
						label: 'Execution Support',
						description: 'Turn plans into reality'
					}
				]
			}
		}
	},
	advisory: {
		label: 'Advisory',
		description: 'Expert guidance when you need it',
		scopes: {
			assessment: {
				label: 'Assessment',
				description: 'Deep dive into your current state',
				features: [
					{
						id: 'assess-audit',
						label: 'Comprehensive Audit',
						description: 'Full organizational review'
					},
					{
						id: 'assess-gaps',
						label: 'Gap Analysis',
						description: 'Identify improvement areas'
					},
					{
						id: 'assess-benchmark',
						label: 'Benchmarking',
						description: 'Compare to industry standards'
					},
					{
						id: 'assess-report',
						label: 'Executive Report',
						description: 'Actionable findings summary'
					}
				]
			},
			roadmap: {
				label: 'Roadmap Development',
				description: 'Chart the path forward',
				features: [
					{
						id: 'road-vision',
						label: 'Vision Definition',
						description: 'Articulate the destination'
					},
					{
						id: 'road-phases',
						label: 'Phase Planning',
						description: 'Break into achievable steps'
					},
					{
						id: 'road-dependencies',
						label: 'Dependency Mapping',
						description: 'Understand what blocks what'
					},
					{
						id: 'road-timeline',
						label: 'Timeline Development',
						description: 'Realistic scheduling'
					}
				]
			},
			review: {
				label: 'Expert Review',
				description: 'Get a second opinion',
				features: [
					{
						id: 'rev-code',
						label: 'Code Review',
						description: 'Technical quality assessment'
					},
					{
						id: 'rev-architecture',
						label: 'Architecture Review',
						description: 'System design evaluation'
					},
					{
						id: 'rev-security',
						label: 'Security Review',
						description: 'Vulnerability assessment'
					},
					{
						id: 'rev-performance',
						label: 'Performance Review',
						description: 'Efficiency analysis'
					}
				]
			},
			coaching: {
				label: 'Coaching',
				description: 'Develop your team capabilities',
				features: [
					{
						id: 'coach-exec',
						label: 'Executive Coaching',
						description: 'Leadership development'
					},
					{
						id: 'coach-team',
						label: 'Team Coaching',
						description: 'Group capability building'
					},
					{
						id: 'coach-technical',
						label: 'Technical Mentoring',
						description: 'Skill development'
					},
					{
						id: 'coach-onboarding',
						label: 'Onboarding Support',
						description: 'New hire acceleration'
					}
				]
			}
		}
	},
	development: {
		label: 'Development',
		description: 'Build something new',
		scopes: {
			web: {
				label: 'Web Development',
				description: 'Modern web applications',
				features: [
					{
						id: 'web-frontend',
						label: 'Frontend Development',
						description: 'User interfaces that work'
					},
					{
						id: 'web-backend',
						label: 'Backend Development',
						description: 'Server-side logic'
					},
					{
						id: 'web-fullstack',
						label: 'Full-Stack Development',
						description: 'End-to-end solutions'
					},
					{
						id: 'web-cms',
						label: 'CMS Integration',
						description: 'Content management'
					}
				]
			},
			api: {
				label: 'API Development',
				description: 'Interfaces that integrate',
				features: [
					{
						id: 'api-design',
						label: 'API Design',
						description: 'RESTful or GraphQL'
					},
					{
						id: 'api-implementation',
						label: 'Implementation',
						description: 'Production-ready code'
					},
					{
						id: 'api-documentation',
						label: 'Documentation',
						description: 'Developer-friendly docs'
					},
					{
						id: 'api-versioning',
						label: 'Versioning Strategy',
						description: 'Evolve without breaking'
					}
				]
			},
			mobile: {
				label: 'Mobile Development',
				description: 'Apps for iOS and Android',
				features: [
					{
						id: 'mobile-native',
						label: 'Native Development',
						description: 'Platform-specific apps'
					},
					{
						id: 'mobile-cross',
						label: 'Cross-Platform',
						description: 'One codebase, both platforms'
					},
					{
						id: 'mobile-pwa',
						label: 'Progressive Web App',
						description: 'Web-based mobile experience'
					},
					{
						id: 'mobile-backend',
						label: 'Mobile Backend',
						description: 'APIs optimized for mobile'
					}
				]
			},
			systems: {
				label: 'Systems Development',
				description: 'Infrastructure and tooling',
				features: [
					{
						id: 'sys-cli',
						label: 'CLI Tools',
						description: 'Command-line interfaces'
					},
					{
						id: 'sys-automation',
						label: 'Build Automation',
						description: 'CI/CD pipelines'
					},
					{
						id: 'sys-monitoring',
						label: 'Monitoring',
						description: 'Observability infrastructure'
					},
					{
						id: 'sys-infrastructure',
						label: 'Infrastructure as Code',
						description: 'Reproducible environments'
					}
				]
			}
		}
	}
};

// =============================================================================
// PRICING TIER CONFIGURATIONS
// =============================================================================

export interface PricingTierConfig {
	label: string;
	description: string;
	featureLimit: number | null; // null = unlimited
}

export const pricingTiers: Record<PricingTier, PricingTierConfig> = {
	starter: {
		label: 'Starter',
		description: 'For small teams exploring new capabilities',
		featureLimit: 2
	},
	growth: {
		label: 'Growth',
		description: 'For organizations ready to scale',
		featureLimit: 4
	},
	enterprise: {
		label: 'Enterprise',
		description: 'For complex, organization-wide initiatives',
		featureLimit: null // Unlimited
	}
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getScopesForServiceType(serviceType: string): Record<string, { label: string; description: string }> {
	const config = serviceConfig[serviceType];
	if (!config) return {};

	const result: Record<string, { label: string; description: string }> = {};
	for (const [key, scope] of Object.entries(config.scopes)) {
		result[key] = { label: scope.label, description: scope.description };
	}
	return result;
}

export function getFeaturesForScope(serviceType: string, scope: string) {
	return serviceConfig[serviceType]?.scopes[scope]?.features ?? [];
}

export function getFeatureLabelsByIds(serviceType: string, scope: string, featureIds: string[]): string[] {
	const features = getFeaturesForScope(serviceType, scope);
	return featureIds
		.map((id) => features.find((f) => f.id === id)?.label)
		.filter((label): label is string => label !== undefined);
}

export function validateFeatureCount(tier: PricingTier, selectedCount: number): boolean {
	const limit = pricingTiers[tier].featureLimit;
	if (limit === null) return true;
	return selectedCount <= limit;
}
