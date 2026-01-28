# Holiday Content Roadmap (Dec 2024 - Jan 2025)

**Goal:** Build subscription content for January 2025 launch
**Cadence:** Project-based (not schedule-based) — complete when quality is achieved

## Phase 1: Package Existing Agents (Week 1-2)

### Create @create-something/agents package

```bash
packages/agents/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── gmail-notion/
    │   ├── README.md
    │   ├── index.ts
    │   ├── config.schema.json
    │   ├── example.config.json
    │   └── tests/
    ├── notion-dedup/
    │   ├── README.md
    │   ├── index.ts
    │   ├── config.schema.json
    │   ├── example.config.json
    │   └── tests/
    └── shared/
        ├── types.ts
        └── utils.ts
```

**Tasks:**
- [ ] Extract Gmail→Notion client code into reusable agent
- [ ] Extract Notion Dedup client code into reusable agent
- [ ] Create configuration schemas for each
- [ ] Write comprehensive README for each agent
- [ ] Add example configurations
- [ ] Test in isolated environment

**Deliverable:** `@create-something/agents` package published to npm

---

### Create @create-something/claude-patterns package

```bash
packages/claude-patterns/
├── README.md
├── package.json
└── src/
    ├── skills/
    │   ├── README.md
    │   └── [your Claude Code skills]/
    ├── prompts/
    │   ├── README.md
    │   └── [reusable prompt patterns]/
    └── mcp-servers/
        ├── README.md
        └── [MCP server examples]/
```

**Tasks:**
- [ ] Document existing Claude Code skills
- [ ] Create reusable prompt patterns library
- [ ] Package MCP server examples (if any)
- [ ] Write installation/usage guides

**Deliverable:** `@create-something/claude-patterns` package published to npm

---

## Phase 2: Record Video Content (Week 2-3)

### Agent Walkthroughs (15-30 min each)

**Gmail to Notion Agent** (30 min)
- [ ] Part 1: Installation & configuration (15 min)
  - Prerequisites (Cloudflare account, Gmail API, Notion API)
  - Environment setup
  - Configuration file walkthrough
  - First sync demonstration
- [ ] Part 2: Customization & deployment (15 min)
  - Customizing sync rules
  - Adding filters
  - Error handling
  - Production deployment

**Notion Dedup Agent** (20 min)
- [ ] Installation & configuration (10 min)
- [ ] Running deduplication (5 min)
- [ ] Advanced options & customization (5 min)

**Claude Code Patterns Overview** (30 min)
- [ ] Introduction to patterns library (5 min)
- [ ] Top 5 useful skills walkthrough (15 min)
- [ ] Creating your own skill (10 min)

### Recording Setup
- Screen recording: Use QuickTime or OBS
- Audio: Clean, clear microphone
- Format: 1080p minimum
- Editing: Minimal cuts, clear captions
- Platform: Upload to Vimeo/YouTube (private/unlisted)

---

### Workshop Recording (60-90 min)

**Workshop: Building Agentic Integrations** (90 min)
- [ ] Introduction to agentic principles (10 min)
- [ ] Architecture patterns for agents (15 min)
- [ ] Building an agent from scratch (40 min)
  - Problem definition
  - Designing autonomous behavior
  - Implementation walkthrough
  - Testing & validation
- [ ] Deploying to Cloudflare Workers (15 min)
- [ ] Q&A from common questions (10 min)

**Recording Tips:**
- Record in segments, edit together
- Use real examples (not toy code)
- Show mistakes/debugging (authenticity)
- Pause and explain "why" decisions

---

## Phase 3: Create Template Repositories (Week 3-4)

### Cloudflare Workers Agent Template

```bash
templates/cloudflare-agent-starter/
├── README.md
├── wrangler.jsonc
├── package.json
├── src/
│   ├── index.ts          # Main worker
│   ├── agent.ts          # Agent logic
│   ├── config.ts         # Configuration
│   └── types.ts
└── tests/
```

**Features:**
- TypeScript configured
- Cloudflare Workers AI integration
- D1 database setup
- KV storage setup
- Environment variables template
- Testing setup (Vitest)

**Tasks:**
- [ ] Create template repository
- [ ] Document all configuration options
- [ ] Add deployment instructions
- [ ] Test deploy from template

---

### SvelteKit + Cloudflare Starter

```bash
templates/sveltekit-cloudflare-starter/
├── README.md
├── wrangler.jsonc
├── svelte.config.js
├── package.json
├── src/
│   ├── routes/
│   │   ├── +page.svelte
│   │   └── api/
│   │       └── agent/
│   │           └── +server.ts
│   └── lib/
│       ├── agents/
│       └── components/
└── tests/
```

**Features:**
- SvelteKit 5 configured
- Cloudflare Pages setup
- @create-something/canon integrated
- @create-something/agents integrated
- Example agent API routes
- Example UI components

**Tasks:**
- [ ] Create template with integrations
- [ ] Document setup process
- [ ] Add example implementations
- [ ] Test deploy to Cloudflare Pages

---

## Phase 4: Documentation & Support Infrastructure (Week 4)

### GitHub Discussions Setup
- [ ] Enable Discussions on monorepo
- [ ] Create categories:
  - General
  - Agent Help
  - Show & Tell (showcase)
  - Feature Requests
  - Q&A
- [ ] Pin welcome post with guidelines

### Email Support Setup
- [ ] Set up micah@createsomething.io (if not already)
- [ ] Create support email templates
- [ ] Document common questions/answers

### Quarterly Q&A System
- [ ] Create Google Form for question submission
- [ ] Plan first Q&A for February 2025
- [ ] Document Q&A process

---

## Phase 5: Pricing & Payment Integration (Week 4)

### Payment Provider Setup
- [ ] Choose provider (Stripe recommended)
- [ ] Set up subscription products:
  - Build tier: $40-60/mo
  - Enterprise tier: Custom pricing
- [ ] Create customer portal
- [ ] Test payment flow

### Access Control
- [ ] Implement subscription verification
- [ ] Create gated content routes
- [ ] Set up npm package access control (for private packages)

### Update Subscribe Page
- [ ] Add real pricing (finalize $40, $50, or $60)
- [ ] Add payment integration
- [ ] Add subscription management

---

## Content Checklist Summary

### Packages (Code)
- [ ] @create-something/agents (Gmail-Notion, Notion Dedup)
- [ ] @create-something/claude-patterns (Skills, Prompts)

### Videos (Knowledge)
- [ ] Gmail to Notion walkthrough (30 min)
- [ ] Notion Dedup walkthrough (20 min)
- [ ] Claude Patterns overview (30 min)
- [ ] Building Agentic Integrations workshop (90 min)

### Templates (Starter Projects)
- [ ] Cloudflare Workers agent template
- [ ] SvelteKit + Cloudflare starter

### Infrastructure (Support)
- [ ] GitHub Discussions enabled
- [ ] Email support ready
- [ ] Quarterly Q&A process documented
- [ ] Payment system integrated

---

## Launch Checklist (January 2025)

### Pre-Launch (Week 1 of Jan)
- [ ] All content completed and tested
- [ ] Payment system tested end-to-end
- [ ] Email to early access subscribers
- [ ] Final pricing confirmed

### Launch Day
- [ ] Activate subscriptions on /subscribe
- [ ] Send launch announcement email
- [ ] Post on Twitter/LinkedIn (if applicable)
- [ ] Update homepage with subscription CTA

### Post-Launch (Week 2+ of Jan)
- [ ] Monitor signups and feedback
- [ ] Respond to support emails
- [ ] Document common issues
- [ ] Plan next content release

---

## Content Cadence After Launch

**Important:** Content is released when projects complete, not on fixed schedule.

### When You Complete a New Client Project:
1. Generalize into reusable agent
2. Add to @create-something/agents
3. Record 20-30 min walkthrough
4. Write experiment demonstrating it
5. Announce to subscribers
6. Update subscription value

### Realistic Pace:
- New agent: 1-2 per quarter (as client projects complete)
- New experiment: When new patterns emerge
- New workshop: When significant patterns accumulate
- Q&A sessions: Quarterly (Feb, May, Aug, Nov)

### Communicate Clearly to Subscribers:
"Content is released when projects complete—quality over arbitrary deadlines. Expect 4-6 new agents per year, quarterly workshops, and continuous experiments."

---

## Budget Considerations

### Video Hosting
- Vimeo Pro: ~$20/mo (unlimited private videos)
- Alternative: YouTube unlisted (free)

### Payment Processing
- Stripe: 2.9% + $0.30 per transaction
- For $50/mo subscription: ~$1.75 per subscriber

### Infrastructure (Already Have)
- Cloudflare Pages: Free
- Cloudflare Workers: Free tier generous
- D1, KV, R2: Included in your setup

### Time Investment
- Package 2 agents: ~20-30 hours
- Record 4 videos (2.5 hrs total): ~10-15 hours (with editing)
- Create 2 templates: ~10-15 hours
- Setup infrastructure: ~5-10 hours
- **Total: ~50-70 hours over 4 weeks**

---

## Success Metrics (Track After Launch)

### Subscription Metrics
- Signups per month
- Churn rate
- Average revenue per subscriber

### Engagement Metrics
- Video completion rates
- GitHub Discussion activity
- Support email volume
- Template repository clones

### Content Effectiveness
- Which agents get most usage?
- Which videos get most views?
- Which workshops generate most questions?

---

## Notes on Philosophy Alignment

Remember: The project-based cadence **is the feature**, not a limitation.

**Communicate this to subscribers:**
- "New content when projects complete, not on arbitrary schedules"
- "Every agent battle-tested in production"
- "Quality over velocity"

This aligns with agentic principles: Systems work when they're ready, not when the calendar says so.

---

## Questions to Answer During Holidays

1. **Exact pricing:** $40, $50, or $60/mo for Build tier?
2. **Payment provider:** Stripe, Paddle, or other?
3. **Video platform:** Vimeo, YouTube, or self-hosted?
4. **Access control:** How to gate npm packages? (Verdaccio, npm organizations, or other?)
5. **Founding member discount:** Offer to early subscribers? If so, how much?

---

## Final Thought

You have 4-6 weeks to build content during holidays. Don't aim for perfection—aim for "good enough to launch."

**Launch criteria:**
- ✅ 2 agents packaged and working
- ✅ 2 video walkthroughs recorded
- ✅ 1 workshop recorded
- ✅ 1 template repository
- ✅ Payment system working

Everything else can be added after launch as projects complete.

The goal is to **prove the model works**, not to have every possible piece of content ready.
