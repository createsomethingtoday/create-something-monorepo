# Experiment: Abundance Network

**Property:** .agency (createsomething.agency)
**Started:** 2025-12-02
**Status:** Ready for Deployment

## Client Context

**Delivery Chain:** CREATE SOMETHING → Half Dozen → BLOND:ISH subsidiary
**Service:** Creative matching platform (Seekers ↔ Talent)
**Domain:** `createsomething.agency/api/abundance` (shows provenance)

## Hypothesis

Building a WhatsApp-based creative matching platform using the CREATE SOMETHING infrastructure will:
1. Validate that .agency's purpose is matching (Seekers ↔ Talent)
2. Demonstrate the hermeneutic spiral applied to user relationships
3. Prove the Subtractive Triad can guide feature scope (avoid over-engineering)

## Success Criteria

- [ ] GPT can create Seeker profiles via API
- [ ] GPT can create Talent profiles via API
- [ ] GPT can request matches with fit scores
- [ ] WhatsApp webhook receives and processes messages
- [ ] Returning users experience "delta intake" (memory)
- [ ] API responds in <100ms (edge latency)

## Metrics to Track

- **Time:** AI-native development vs manual estimate
- **Cost:** Token usage vs developer hours
- **Quality:** API response times, match accuracy
- **Interventions:** Manual fixes needed

## Subtractive Approach (Louis Wisdom)

> "Don't rebuild the GPT conversation engine; build only what's missing (database, matching algorithm, API)."

**Phase 1 (Core):** Tables + CRUD + Simple Matching
**Phase 2 (Integration):** GPT Actions + WhatsApp webhook
**Phase 3 (Trajectory):** Only if Phase 1-2 validate need

## Session Log

### Session 1: 2025-12-02

**Duration:** Starting now
**Goal:** Core infrastructure - D1 schema + API routes
**Progress:**
- Hermeneutic analysis completed
- Experiment structure created
- Beginning D1 migration

**Decisions:**
- Use existing CREATE SOMETHING D1 database (shared)
- Follow SvelteKit API patterns from .agency/api/contact
- Subtractive MVP: 3 tables (seekers, talent, matches)
- Skip complex archetype matrices for now (earn through iteration)

**Files Created:**
- `.claude/experiments/abundance-network/log.md`
- `packages/agency/migrations/0001_abundance_network.sql`
- `packages/agency/src/lib/types/abundance.ts`
- `packages/agency/src/lib/abundance/matching.ts`
- `packages/agency/src/routes/api/abundance/seekers/+server.ts`
- `packages/agency/src/routes/api/abundance/seekers/[id]/+server.ts`
- `packages/agency/src/routes/api/abundance/talent/+server.ts`
- `packages/agency/src/routes/api/abundance/talent/[id]/+server.ts`
- `packages/agency/src/routes/api/abundance/match/+server.ts`
- `packages/agency/src/routes/api/abundance/match/[id]/+server.ts`
- `packages/agency/src/routes/api/abundance/whatsapp/+server.ts`
- `packages/agency/static/openapi-abundance.yaml`

**Architecture:**
```
packages/agency/
├── migrations/
│   └── 0001_abundance_network.sql     # D1 schema (4 tables)
├── static/
│   └── openapi-abundance.yaml          # GPT Actions spec
└── src/
    ├── lib/
    │   ├── types/abundance.ts          # Type definitions
    │   └── abundance/matching.ts       # Matching algorithm
    └── routes/api/abundance/
        ├── seekers/                    # Seeker CRUD
        ├── talent/                     # Talent CRUD
        ├── match/                      # Matching endpoints
        └── whatsapp/                   # Webhook handler
```

**Session Complete:** TypeScript compiles cleanly.

---

## Deployment Commands (Execute in WezTerm)

```bash
# 1. Apply migration to D1 (creates 4 tables: seekers, talent, matches, intakes)
wrangler d1 execute create-something-db --remote --file=packages/agency/migrations/0001_abundance_network.sql

# 2. Build the agency package
cd packages/agency && pnpm build

# 3. Deploy to Cloudflare Pages
wrangler pages deploy .svelte-kit/cloudflare --project-name=create-something-agency

# 4. Set WhatsApp secrets in Cloudflare dashboard (Settings > Variables)
#    - WHATSAPP_VERIFY_TOKEN (any string you choose)
#    - WHATSAPP_ACCESS_TOKEN (from Meta Developer Console)
#    - WHATSAPP_PHONE_NUMBER_ID (from Meta Developer Console)

# 5. Configure GPT Action in ChatGPT
#    OpenAPI spec URL: https://createsomething.agency/openapi-abundance.yaml
```

## API Endpoints (after deployment)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/abundance/seekers` | POST | Create seeker profile |
| `/api/abundance/seekers` | GET | List/lookup seekers |
| `/api/abundance/seekers/[id]` | GET/PATCH | Get/update seeker |
| `/api/abundance/talent` | POST | Create talent profile |
| `/api/abundance/talent` | GET | List/lookup talent |
| `/api/abundance/talent/[id]` | GET/PATCH | Get/update talent |
| `/api/abundance/match` | POST | Find matches for a job |
| `/api/abundance/match` | GET | List matches |
| `/api/abundance/match/[id]` | GET/PATCH | Get/update match |
| `/api/abundance/whatsapp` | GET | Webhook verification |
| `/api/abundance/whatsapp` | POST | Receive WhatsApp messages |

## Hermeneutic Position

This infrastructure fulfills .agency's purpose: **matching Seekers with Talent**.

The hermeneutic circle revealed:
- **Infrastructure** → .agency (where it now lives)
- **Research documentation** → .io (future paper about hermeneutic spiral UX)
- **Build log** → `.claude/experiments/` (internal)

---

## Related Work

See also experiments on .io documenting .agency case studies - the hermeneutic circle connects research and service delivery.

