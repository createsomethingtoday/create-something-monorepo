---
title: "Subtractive Triad Audit: Kickstand"
subtitle: "Applying the Subtractive Triad framework (DRY → Rams → Heidegger) to audit a production
				venue intelligence system—demonstrating that creation is the discipline of removing what obscures."
authors: ["Micah Johnson"]
category: "Case Study"
abstract: "This paper documents the application of theSubtractive Triadframework to Kickstand,
				a venue intelligence automation system serving Half Dozen (a CREATE SOMETHING client). The system
				had evolved through multiple architectural phases (Node.js → Railway → Cloudflare Workers),
				accumulating significant technical debt. Through systematic application of three subtractive
				disciplines—DRY (Unify), Rams (Remove), and Heidegger (Reconnect)—we achieved: 92% reduction
				in active scripts (1"
keywords: []
publishedAt: "2025-01-08"
readingTime: 12
difficulty: "intermediate"
published: true
---


## Abstract
This paper documents the application of theSubtractive Triadframework to Kickstand,
				a venue intelligence automation system serving Half Dozen (a CREATE SOMETHING client). The system
				had evolved through multiple architectural phases (Node.js → Railway → Cloudflare Workers),
				accumulating significant technical debt. Through systematic application of three subtractive
				disciplines—DRY (Unify), Rams (Remove), and Heidegger (Reconnect)—we achieved: 92% reduction
				in active scripts (155 → 13), 100% reduction in TypeScript errors (30 → 0), and 48% improvement
				in overall health score (6.2 → 9.2). The case study validates the Subtractive Triad as an
				effective framework for production system audits.



## 1. The Subtractive Triad Framework
Meta-principle:Creation is the discipline of removing what obscures.
The Subtractive Triad provides three lenses for evaluating any codebase, each operating
					at a different level of abstraction:
The triad is coherent because it's one principle—subtractive revelation—applied
					at three scales. Truth emerges through disciplined removal at every level of abstraction.


## 2. System Context: Kickstand
Kickstand is avenue intelligence automation systemthat monitors music venues'
					social media and websites to extract artist performance data. It serves Half Dozen, which
					is a client of CREATE SOMETHING.
The system produces daily intelligence reports, artist extractions, and venue monitoring data.
					It had evolved through multiple deployment phases:
Each migration left artifacts behind, creating the debt that this audit addresses.
- Phase 1:Node.js + local development
- Phase 2:Railway deployment
- Phase 3:Cloudflare Workers (current production)


## 3. Level 1: DRY (Implementation) — Unify
Question:"Have I built this before?"
Score: 5/10 — Critical duplication found
The codebase maintainedtwo complete implementationsof core services—one
					in Node.js and one in Cloudflare Workers TypeScript:
- Marked Node.js services with@deprecatednotices
- Fixed 30 TypeScript errors in Workers implementation
- Updated Cloudflare Workflow API usage (event.payloadnotevent.params)
- Added proper type annotations throughout


## 4. Level 2: Rams (Artifact) — Remove
Question:"Does this earn its existence?"
Score: 6/10 — Significant excess found
155 JavaScript filesin the scripts directory, with only ~20 actively needed:
- • 155 scripts total
- • 35 explicitly archived
- • ~70 likely obsolete
- • ~30 one-time migrations
- • ~20 actively needed
- • 13 scripts active
- • 153 scripts archived
- • Organized into categories:
- - migrations/ (38 scripts)
- - tests/ (24 scripts)
- - one-time/ (19 scripts)
- Moved 153 scripts to organized archive directories
- Archived Railway configuration toconfig/archive/
- Moved Railway docs todocs/archive/railway/
- Created archive README documenting restoration process


## 5. Level 3: Heidegger (System) — Reconnect
Question:"Does this serve the whole?"
Score: 7/10 — Minor disconnection found
The README described three different deployment targets, creating systemic incoherence:
// README claimed:
1. Node.js + Railway (documented as primary)
2. n8n (mentioned as future target)
3. Cloudflare Workers (actual production)
Additionally, the relationship between Kickstand → Half Dozen → CREATE SOMETHING was
					undocumented within the system itself.
- RewroteREADME.mdfor Cloudflare Workers architecture
- Createddocs/ARCHITECTURE.mddocumenting system context
- Addedservices/LEGACY.mddeprecation guide
- Addedmonitoring/LEGACY.mddeprecation guide
- Documented the hermeneutic circle: how Kickstand fits into the larger system


## 6. Results
Key fixes to achieve zero build errors:
- Addedwarn()method to Logger class
- Fixed Cloudflare Workflow API (event.payloadnotevent.params)
- FixedLogger.error()call signatures throughout
- Added type assertions for API responses
- UpdatedMonitorResultinterface
- Removed@types/nodefrom tsconfig to resolve conflicts


## 7. Conclusion
This case study validates the Subtractive Triad as an effective framework for production
					system audits. The three levels complement each other:
Kickstand is now afunctional and coherent system. Its core value proposition—venue
					intelligence through automated monitoring and artist extraction—works well, and the codebase
					now reflects this clarity.
The Subtractive Path Forward
- DRYcatches mechanical duplication (parallel implementations)
- Ramscatches functional obsolescence (155 → 13 scripts)
- Heideggercatches systemic disconnection (documentation drift)

