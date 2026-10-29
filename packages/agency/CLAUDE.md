# .agency Service Offerings: Map → Build → Control

Public category label: **AI-native technical support** (`agencyCoreMessaging.categoryLabel` in `src/lib/data/marketingCopy.ts`). **AI workflow systems** is the technical capability, not the public category (see `README.md`). The offer is making one business workflow safe to delegate—named objects, scoped actions, approval paths, evidence (receipts), and recovery.

**The source of truth for the product spine is `packages/agency/src/lib/data/productFamily.ts`**, not this file. Canonical marketing copy lives in `packages/agency/src/lib/data/marketingCopy.ts` (`agencyCoreMessaging`).

| Product | Kind | Route | Customer job |
|------|-------|-------|-------|
| **Map** | Standalone subscription | `/map` | Understand and design one human-agent workflow before implementation |
| **Build** | Scoped service | `/services` | Turn an approved workflow map into an owned, connected system |
| **Control** | Standalone subscription, includes Map | `/control` | Operate delegated work with explicit authority, approvals, evidence, and recovery |

**Signal → Decision → Proof are operator surfaces inside Control**, not separate products or licenses. They are the operating loop and the page rhythm. They have explainer pages under `/products/*` for depth and SEO, titled as Control surfaces.

**Altitude discipline** — every name lives at exactly one altitude, and only the top altitude is sold:

| Altitude | Names | Where it may appear |
|------|-------|-------|
| Commercial | Map · Build · Control | `.agency` public copy |
| Operating loop | Signal → Decision → Proof | Sections inside Control |
| Architecture | Database · Automation · Judgment, MCP-as-chassis | `.ltd` and `.io` only |

Internal names must never reach public copy. `productFamily.ts` declares them under `internalCompatibilityNames`: Atlas → Map, Workflow Pilot → Build, **Policy OS → Control**. Enforced by `packages/agency/scripts/check-public-copy.mjs` (rules support an `exempt` list; `productFamily.ts` is exempt as the declared home of the internal names).

**The parallel lane vocabulary is retired.** Public offers used to be named `Workflow Map → Workflow Pilot → Control Layer`, a near-miss of the product names that read as a fourth naming system. Display copy now uses **Map → Build → Control** everywhere. Two deliberate exceptions remain, and they are not lane names:

- *workflow map* as the plain-English **deliverable** ("Request a workflow map", the delivery artifact card on `/stack`).
- `serviceInterest: 'Workflow Map'` on `/contact` — a **CRM data value**, not display copy. Changing it would break lead routing.

**Atlas is the engineering name for Map's implementation** (`lib/atlas/`, `api/atlas/`, Atlas canvas/node/bindings — ~700 occurrences). That stays; internal code names are not a brand problem. Only user-visible Atlas strings are policed, and there are none left. Do not confuse this with the third-party **AI Interaction Atlas** vocabulary (see below), which is unrelated.

The former "Workflow Trust Layer" category is superseded.

Delivery vector vocabulary: **"Skills on MCP"** (canonical) / "Skills + MCP" (client-facing).

**Open-source lead gen**: **Ground MCP** (`/products/ground`) — code analysis that verifies before it claims. **Loom MCP** (`/products/loom`) is an **archive**: a retrospective on the continuity problem that led to Linear-first coordination. It is not an actively offered product. The `/dify` section is content marketing, not a sold product.

**Boundaries stated on-site**: no vendor lock-in; the client keeps the workflow map, contracts, policy, runbooks, code, and approval ownership.

**Nav convention**: primary navigation uses plain meaning ("How It Works", "What You Keep"), not owned product names—a first-time visitor does not yet know what Map or Control are. The spine is named in the footer and on `/products`. Enforced by `test/public-marketing-copy.test.ts`.
