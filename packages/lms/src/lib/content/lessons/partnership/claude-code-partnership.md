# Human-Agent Partnership

## The Principle: Complementarity

**Core Insight**: Human-agent partnership is not delegation of grunt work but *division by capability*. Each participant does what they do best, creating a whole greater than either part.

This follows the Subtractive Triad's third level—**Heidegger's hermeneutic circle**: the human and agent form a system where each serves the whole. Neither dominates; both contribute according to their nature.

---

## What Claude Code Excels At

### 1. Writing New Features and Components
- Translating requirements into implementation
- Following established patterns and conventions
- Handling edge cases and error states
- Writing type-safe, tested code
- Maintaining consistency across the codebase

**Example**: "Add a newsletter subscription form to the footer with email validation, success/error states, and integration with the /api/newsletter endpoint"

### 2. Refactoring Existing Code
- Extracting duplicated logic (DRY principle)
- Modernizing patterns (callbacks → promises → async/await)
- Improving type safety
- Simplifying complex logic
- Maintaining behavioral equivalence

**Example**: "Refactor the authentication middleware to use the new session store pattern from packages/components"

### 3. Understanding Unfamiliar Codebases
- Tracing code paths through multiple files
- Identifying architectural patterns
- Finding where functionality is implemented
- Understanding data flow
- Documenting discovered patterns

**Example**: "How does the payment processing flow work from the checkout page through Stripe to confirmation?"

### 4. Creating and Debugging Tests
- Writing comprehensive test suites
- Covering edge cases systematically
- Debugging test failures
- Understanding assertion errors
- Maintaining test quality over time

**Example**: "Write integration tests for the new API endpoints, including authentication, validation errors, and rate limiting"

### 5. Architecture Planning and Documentation
- Proposing implementation approaches
- Documenting system design
- Creating diagrams and explanations
- Identifying potential issues
- Suggesting alternatives with tradeoffs

**Example**: "Design a caching strategy for the content delivery system that works with Cloudflare's edge network"

### 6. Multi-Step Task Execution
- Breaking down complex tasks
- Tracking progress systematically
- Handling dependencies between steps
- Recovering from errors
- Completing full workflows end-to-end

**Example**: "Migrate the users table schema to add OAuth fields, update all queries, run migration on staging, test, then deploy to production"

---

## What Humans Excel At

### 1. Judgment and Taste
- Deciding *what* to build and *why*
- Evaluating between technically equivalent options
- Making aesthetic decisions
- User experience intuition
- Knowing when "good enough" is truly good enough

**Human Territory**: "Should we prioritize performance optimization or release the new feature first? The team needs to demo progress next week."

### 2. Context and Nuance
- Understanding business constraints
- Knowing organizational history
- Reading political dynamics
- Interpreting ambiguous requirements
- Connecting disparate sources of information

**Human Territory**: "This feature needs to align with the Q4 partnership announcement, so keep the UI flexible for white-labeling"

### 3. Verification and Validation
- Testing in production-like environments
- Validating against real user needs
- Catching subtle bugs through use
- Confirming business logic correctness
- End-to-end validation with real data

**Human Territory**: "Let me test this checkout flow on staging with real payment methods and edge case products"

### 4. Business Decisions
- Budget allocation
- Timeline negotiation
- Scope prioritization
- Risk acceptance
- Strategic direction

**Human Territory**: "We'll release the MVP without email notifications and add them in v2 after we see usage patterns"

### 5. Creative Direction
- Brand voice and tone
- Visual design direction
- Content strategy
- Product positioning
- Innovation and differentiation

**Human Territory**: "The tone should feel more conversational and playful, less corporate—like Stripe's docs"

### 6. Risk Assessment
- Security implications
- Legal and compliance requirements
- Business risk evaluation
- Technical debt acceptance
- Long-term maintainability impact

**Human Territory**: "This data handling approach might violate GDPR—we need to anonymize before logging"

---

## Modes of Partnership

### 1. Delegation Mode
**Pattern**: Human defines outcome, agent owns execution, human verifies result.

```
Human: "Add user authentication to the API with JWT tokens and refresh token rotation"
Agent: *Plans approach, implements routes, adds middleware, writes tests, deploys*
Human: *Tests login flow, confirms token expiry works, checks security headers*
```

**When to Use**:
- Well-defined requirements with clear success criteria
- Established patterns exist in the codebase
- Human can verify output effectively
- Task is within agent's demonstrated capabilities

**Trust Level**: Medium—verify the result, not every step of the process.

**Verification Points**:
- Initial approach confirmation
- Final functionality testing
- Security/edge case review

---

### 2. Collaboration Mode
**Pattern**: Human and agent explore together, iterating toward solution.

```
Human: "The checkout flow feels clunky, help me understand why"
Agent: *Analyzes code, identifies 3 validation steps that block progress*
Human: "Ah yes, the address validation is killing momentum. Can we make it async?"
Agent: *Proposes moving validation to background, showing progress indicator*
Human: "Perfect. But validate on blur, not on submit"
Agent: *Adjusts implementation to validate fields individually*
Human: "Much better. Now the flow feels responsive"
```

**When to Use**:
- Problem space is unclear or exploratory
- Evaluating multiple alternatives
- Learning new patterns together
- Complex tradeoffs require human judgment

**Trust Level**: Low initially, building through iteration and shared understanding.

**Collaboration Rhythm**:
1. Agent proposes → Human evaluates
2. Human adjusts direction → Agent refines
3. Repeat until alignment emerges

---

### 3. Supervision Mode
**Pattern**: Human provides continuous guidance, agent executes step-by-step.

```
Human: "Let's refactor the payment flow. Start by reading the current implementation"
Agent: *Reads PaymentController.ts and summarizes flow*
Human: "Good. Now extract the Stripe-specific logic into a PaymentProvider service"
Agent: *Creates service, moves Stripe code*
Human: "Excellent. Now add error handling for network failures with exponential backoff"
Agent: *Implements retry logic with backoff*
Human: "Perfect. Add logging at each retry attempt"
Agent: *Adds structured logging*
```

**When to Use**:
- Teaching agent new domain-specific patterns
- High-risk changes requiring careful oversight
- Learning a new area of the codebase yourself
- Complex debugging requiring human intuition

**Trust Level**: Very low—verify and guide each step before proceeding.

**Supervision Signals**:
- Confirm understanding before execution
- Show intermediate results
- Explain reasoning for each step

---

### 4. Observation Mode
**Pattern**: Human works, agent watches and learns patterns.

```
Human: *Manually debugs a complex state synchronization bug*
Human: "Notice how I traced the state change backward through the component tree?
        Started at the UI symptom, found the props, walked up to the store update"
Agent: *Observes debugging strategy*
Human: "Next time you see a state bug in Svelte, try this same approach:
        1. Identify where the UI is wrong
        2. Find which prop/store drives that UI
        3. Trace backward to find where that value changes
        4. Look for the unexpected mutation"
Agent: *Learns domain-specific debugging pattern*
```

**When to Use**:
- Establishing new conventions in the codebase
- Demonstrating domain-specific debugging techniques
- Teaching by example when explanation is insufficient
- Building shared context for future collaboration

**Trust Level**: N/A—agent is learning, not executing.

**Teaching Moments**:
- Narrate your reasoning process
- Explain *why* you chose an approach
- Point out patterns to apply elsewhere
- Connect to existing knowledge

---

## Communication Patterns

### 1. Clear Intent Expression

**Poor**: "Fix the thing"
- Too vague, agent must guess what "thing" means

**Better**: "Fix the login form validation"
- Clearer scope, but missing details

**Best**: "Fix the login form validation to show errors on blur instead of submit, matching the pattern we use in SignupForm.svelte"
- Clear objective, specific behavior, reference example

**Pattern Formula**:
```
[Action] + [Target] + [Specific Behavior] + [Context/Example]
```

**Examples**:
- "Refactor the API routes to use the new middleware pattern from auth-router.ts"
- "Add loading states to all async buttons following the pattern in SubmitButton.svelte"
- "Debug why the cart total calculation is wrong when applying multiple discount codes"

---

### 2. Context Provision

**Minimal Context**: "Add a search feature"
- Agent must make all decisions without guidance

**Rich Context**:
```
Add a search feature to the papers listing page:
- Filter by title, abstract, and tags
- Use fuzzy matching (we already have fuse.js installed)
- Update URL query params so searches are shareable (see experiments page for pattern)
- Show result count above the grid
- Maintain scroll position when clearing search
- Use the existing SearchIcon component
```

**Pattern**: Provide enough context for the agent to make local decisions without constant questions.

**Context Checklist**:
- [ ] What should it do?
- [ ] How should it behave?
- [ ] What patterns should it follow?
- [ ] What constraints apply?
- [ ] What existing code should it reference?

---

### 3. Feedback Loops

**One-Way (Inefficient)**:
```
Human: "Add dark mode support"
Agent: *Implements full theme system with 12 color tokens, localStorage, system preference detection*
Human: "No no, I just meant add a toggle button for now. We're not ready for full theming"
```

**Iterative (Efficient)**:
```
Human: "Add dark mode support"
Agent: "I can see a few approaches:
        1. Full theme system with CSS custom properties
        2. Simple toggle that adds a 'dark' class to <body>
        3. Just the toggle UI, no functionality yet

        Which direction do you want?"
Human: "Option 2 for now—simple and functional"
Agent: *Implements minimal solution*
```

**Pattern**: Agent confirms approach before large implementations, especially when multiple paths exist.

**Confirmation Triggers**:
- Ambiguous requirements
- Multiple valid approaches
- Large scope (>1 hour of work)
- Architectural decisions

---

### 4. Course Correction

**Reactive (Late)**:
```
Agent: *Completes 10-file refactor using old pattern*
Human: "Oh, we're moving to the new session store pattern now. This needs to change"
Agent: *Reverts and redoes work*
```

**Proactive (Early)**:
```
Agent: *Shows first file refactored*
Human: "Good start, but we're migrating to the new session store pattern—see auth-store.ts"
Agent: *Adjusts approach, continues with correct pattern*
Human: *Spot checks next file*
Human: "Perfect, keep going"
```

**Pattern**: Review early outputs to catch direction errors before they compound.

**Early Review Points**:
- First file in multi-file refactor
- Initial implementation of new pattern
- Architecture decisions
- First test in new test suite

---

## The CLAUDE.md Contract

The `CLAUDE.md` file is the partnership's constitution—it defines how human and agent work together.

### What CLAUDE.md Contains

#### 1. Philosophy
The principles guiding all work:
```markdown
## Philosophy: The Subtractive Triad

Creation is the discipline of removing what obscures.
Every decision passes through three filters:
1. DRY (Implementation) → Eliminate duplication
2. Rams (Artifact) → Eliminate excess
3. Heidegger (System) → Eliminate disconnection
```

#### 2. Architecture
The structure the agent operates within:
```markdown
## Architecture

packages/
  space/    → createsomething.space  (Practice)
  io/       → createsomething.io     (Research)
  agency/   → createsomething.agency (Services)
  ltd/      → createsomething.ltd    (Philosophy)
```

#### 3. Domain Boundaries
What the agent owns vs. what requires handoff:
```markdown
## Your Domain: Creation

Claude Code excels at:
- Writing new features and components
- Refactoring existing code
- Understanding unfamiliar code paths

## Complementarity Principle

| Claude Code (You) | WezTerm (User) |
|-------------------|----------------|
| Write code | Monitor logs |
| Deploy code | Verify production |
| Test | Interactive debugging |
```

#### 4. Conventions
Patterns to follow:
```markdown
## File Conventions

- Routes: `src/routes/[path]/+page.svelte`
- API: `src/routes/api/[endpoint]/+server.ts`
- Components: `src/lib/components/`

## CSS Architecture

Tailwind for structure, Canon for aesthetics.
See `.claude/rules/css-canon.md` for tokens.
```

#### 5. Resources
Where to find information:
```markdown
## Skills Available

- `motion-analysis`: Analyze CSS animations from URLs
- `canon-maintenance`: Enforce design standards

## Reference Docs

- `.claude/rules/sveltekit-conventions.md`
- `.claude/rules/cloudflare-patterns.md`
```

### Why CLAUDE.md Matters

**Without it**: Every session starts from zero. Agent must re-learn patterns, conventions, and boundaries.

**With it**: Agent has persistent context. Patterns are consistent. Partnership is efficient.

**Living Document**: Update CLAUDE.md as:
- New patterns emerge
- Architecture evolves
- Domain boundaries shift
- Skills are added

---

## Trust Calibration

Trust is earned through demonstrated reliability. Calibrate based on context and history.

### High Trust Scenarios

**Characteristics**:
- Agent has succeeded at similar tasks 5+ times
- Clear patterns exist in the codebase
- Easy to verify output quickly
- Low risk if something goes wrong
- Changes are reversible via git

**Examples**:
- "Add a new API endpoint following the existing pattern"
- "Refactor this component to use the store pattern" (agent has done 10x)
- "Write tests for the new features"
- "Update documentation to reflect the new flow"

**Approach**: Delegate fully, verify output, provide feedback for next time.

---

### Medium Trust Scenarios

**Characteristics**:
- Agent has done similar work but not this exact task
- Some ambiguity in requirements
- Moderate risk of unexpected behavior
- Verification requires some effort
- Changes affect user-facing features

**Examples**:
- "Implement the new checkout flow based on this wireframe"
- "Optimize the database queries in the analytics page"
- "Add i18n support to the component library"

**Approach**: Confirm approach first, review intermediate output, verify final result thoroughly.

---

### Low Trust Scenarios

**Characteristics**:
- Novel problem space for both human and agent
- High stakes (production data, security, money)
- Unfamiliar technology or pattern
- Complex business logic with edge cases
- Difficult to verify correctness
- Irreversible operations

**Examples**:
- "Migrate production database schema for 50k users"
- "Implement GDPR data deletion across all systems"
- "Add payment processing with Stripe webhooks"
- "Refactor authentication to use OAuth2"

**Approach**: Supervision mode—guide each step, verify before proceeding, test extensively on staging.

---

### Trust Building Over Time

```
Session 1:  Supervision mode → verify each step, teach patterns
Session 5:  Collaboration mode → review approach, verify outcomes
Session 20: Delegation mode → verify final result, trust process
```

**Pattern**: Start cautious with new tasks. As agent demonstrates competence, increase delegation.

**Trust Signals**:
- Agent asks good questions
- Agent references relevant patterns
- Output matches expectations
- Agent catches its own errors
- Agent explains tradeoffs clearly

**Distrust Signals**:
- Agent makes unfounded assumptions
- Output has subtle bugs
- Agent ignores provided context
- Agent over-complicates simple tasks
- Agent can't explain its reasoning

---

## Anti-Patterns to Avoid

### 1. Over-Delegation
**Symptom**: "Just build the whole e-commerce platform and surprise me"

**Why It Fails**:
- Agent lacks business context for critical decisions
- High chance of fundamental misalignment
- Expensive to correct course after bulk work
- Wastes the trust you're trying to build

**Fix**: Break into phases. Delegate components, not entire systems. Verify architectural decisions before implementation.

**Better Approach**:
```
Phase 1: "Design the data schema for products, categories, and cart"
        *Review schema together*
Phase 2: "Implement the product listing page"
        *Review UX and performance*
Phase 3: "Add cart functionality"
        *Verify state management approach*
```

---

### 2. Micro-Management
**Symptom**: "Change line 47 to use `const` instead of `let`. Now add a semicolon to line 52."

**Why It Fails**:
- Human becomes bottleneck
- Agent can't develop judgment
- Inefficient use of both parties' time
- Defeats the purpose of partnership
- Frustrating for everyone

**Fix**: Delegate outcomes, not keystrokes. Trust implementation choices that don't affect behavior.

**Better Approach**:
```
Instead of: "Change this variable to const"
Say: "Ensure all immutable values use const throughout this file"

Instead of: "Add a space after this comma"
Say: "Run the formatter on this file" or trust the agent's style
```

---

### 3. Ignoring Output
**Symptom**: Agent completes task, human never verifies or integrates result

**Why It Fails**:
- Breaks the feedback loop
- Agent can't calibrate to your needs
- Wastes effort on both sides
- Erodes partnership over time
- May hide bugs that compound

**Fix**: Always close the loop. Verify, integrate, or explicitly explain why you're not using the output.

**Closing the Loop**:
```
✓ "Tested the new feature—works great. Merged to main"
✓ "Found a bug in the error handling. Here's what happened..."
✓ "Requirements changed, so we won't use this now. But the pattern is good for next time"
✗ *silence*
```

---

### 4. Context Hoarding
**Symptom**: "You should know why this matters" or "Just figure out what I want"

**Why It Fails**:
- Agent lacks information to make good choices
- Increases back-and-forth questions
- Leads to misaligned solutions
- Creates frustration and rework
- Wastes time guessing intent

**Fix**: Share context liberally—business goals, user needs, technical constraints, deadlines.

**Better Context Sharing**:
```
Instead of: "Add social login"
Say: "Add Google OAuth login. We're launching a partnership with Google Workspace next month,
     so this needs to work perfectly for Google accounts. Other providers can come later."
```

---

### 5. Treating Agent as Search Engine
**Symptom**: "What's the syntax for Array.map()?" *then implements yourself*

**Why It Fails**:
- Underutilizes agent capabilities
- Agent doesn't learn your patterns
- Misses partnership opportunities
- No shared context building
- You do all the work anyway

**Fix**: Ask agent to implement, not just explain. Building shared context is the goal.

**Better Approach**:
```
Instead of: "How do I filter an array in JavaScript?"
Say: "Refactor this for loop to use Array.filter() and Array.map()"
     *Agent implements, you learn by reviewing*
```

---

### 6. Zero Verification
**Symptom**: "Looks good, deploy it!" without testing

**Why It Fails**:
- Agent can make mistakes (context limits, misunderstandings)
- Silent failures compound over time
- Breaks production
- Erodes user trust
- Creates emergency firefighting

**Fix**: Always verify outputs. Depth of verification scales with risk.

**Verification Depth**:
```
Low Risk (docs update):     Quick read-through
Medium Risk (new feature):  Manual testing, review edge cases
High Risk (auth/payments):  Extensive testing, staging deployment, security review
```

**Always Verify**:
- Security-critical code
- Data transformations
- External integrations
- User-facing features
- Database migrations

---

## Practical Examples

### Example 1: Feature Development (Delegation Mode)

```
Human:
"Add a newsletter subscription form to the footer with:
- Email input with validation (valid email format)
- Submit button that shows loading state
- Success message on submission
- Error handling with user-friendly messages
- POST to /api/newsletter endpoint
- Store emails in the subscribers table (add migration if needed)
- Follow the form pattern in ContactForm.svelte"

Agent:
1. *Reads ContactForm.svelte to understand pattern*
2. *Creates NewsletterForm.svelte component*
3. *Adds API route at /api/newsletter/+server.ts*
4. *Creates database migration for subscribers table*
5. *Writes component tests*
6. *Updates footer to include new form*
7. *Tests full flow*
8. *Commits with message: "feat: add newsletter subscription form with email validation and database persistence"*
9. "Newsletter form is complete. The migration needs to be run on staging before deployment.
    Want me to walk through the changes?"
Human: *Tests form on staging, verifies email delivery, checks validation edge cases*
Human: "Perfect! This matches the design perfectly. Merging now."

**Outcome**: Task complete in one cycle. Human verified final result.

---

### Example 2: Complex Debugging (Collaboration Mode)

```
Human: "The search results are sometimes stale—users report seeing old data after updates"
Agent: "Let me trace the search flow..."
       *Analyzes search component, API endpoint, database queries*
Agent: "I see the issue. The search results are cached in KV with a 1-hour TTL,
       but cache invalidation only happens on new posts, not edits"
Human: "Ah yes! Can we invalidate on edits too?"
Agent: "Yes. I can add cache invalidation to the edit endpoint. Should I also
       reduce the TTL to 15 minutes for a safer default?"
Human: "Good idea. And add a manual cache clear button in the admin panel"
Agent: *Implements cache invalidation on edit, reduces TTL, adds admin button*
Human: *Tests in staging, edits a post, sees fresh results*
Human: "Much better. The manual clear button is a great addition—future-proofs us"
```

**Outcome**: Collaboration led to better solution than either would propose alone.

---

### Example 3: High-Risk Migration (Supervision Mode)

```
Human: "We need to migrate user sessions from localStorage to the database.
        This is production with 10k active users, so we need to be careful."
Agent: "Understood. High-risk migration. Should I start by reading the current session code?"
Human: "Yes, and propose a migration strategy before we change anything"
Agent: *Reads current implementation*
Agent: "Current approach:
       - Sessions stored in localStorage as JWT
       - No server-side state
       - 7-day expiry

       Proposed migration:
       1. Add sessions table to database
       2. Create session management API
       3. Dual-write period: write to both localStorage and database
       4. Switch reads to database
       5. Remove localStorage writes

       This gives us a rollback path at each step. Sound good?"
Human: "Perfect. Start with step 1—create the migration for the sessions table"
Agent: *Creates migration with schema*
Human: *Reviews schema*
Human: "Add an index on user_id and created_at for cleanup queries"
Agent: *Adds indexes*
Human: "Good. Run this on staging"
Agent: *Applies migration to staging database*
Human: *Verifies in staging database*
Human: "Clean. Now implement the session API"
Agent: *Creates session CRUD endpoints*
Human: *Reviews code, tests endpoints*
Human: "Add rate limiting to the create endpoint—we don't want session spam"
Agent: *Adds rate limiting*
...
```

**Outcome**: Multi-step supervised migration completed safely. Human verified each step.

---

### Example 4: Pattern Teaching (Observation Mode)

```
Human: *Debugging a subtle state synchronization issue in a Svelte store*
Human: "Watch how I debug this. It's a pattern you'll see again."
Human: *Opens browser DevTools, adds console.logs in the store's subscribe function*
Human: "See? The subscription fires 3 times on mount. That's the bug."
Human: "Now I trace backward: what's causing 3 subscriptions?"
Human: *Checks component mounting, finds component mounted 3 times due to route guard*
Human: "The route guard re-renders the component. We need to move the guard higher in the tree."
Human: *Moves guard to layout*
Human: *Tests—subscription now fires once*
Human: "This pattern—trace from symptom to cause—works for most state bugs.
        Next time you see unexpected reactivity, try:
        1. Log in the store's subscribe
        2. Count how many times it fires
        3. Trace backward to find what's triggering it
        4. Fix the architecture, not the symptom"
Agent: *Observes pattern and stores for future debugging tasks*
```

**Outcome**: Agent learns domain-specific debugging technique through observation.

---

## Reflection Questions

### Understanding Complementarity

1. **What tasks are you currently doing that Claude Code could own?**
   - Writing boilerplate?
   - Refactoring repetitive patterns?
   - Following established conventions?

2. **What decisions are you currently delegating that need your judgment?**
   - UX tradeoffs?
   - Performance vs. simplicity?
   - What features to build?

3. **How do you know when to trust vs. verify?**
   - Do you verify based on task type or agent history?
   - Are you over-verifying (micro-managing) or under-verifying (ignoring output)?

### Improving Communication

4. **Review your last 5 requests to Claude Code. Were they:**
   - Clear about the objective?
   - Rich in context?
   - Specific about constraints?
   - Reference examples when available?

5. **Do you close feedback loops?**
   - When Claude Code completes a task, do you verify and report back?
   - Do you explain why you're not using output?
   - Do you share what worked well for future tasks?

6. **Are you confirming approach before large implementations?**
   - Or discovering misalignment after the work is done?

### Calibrating Trust

7. **Map your recent tasks by trust level:**
   - High trust: What made you confident delegating?
   - Low trust: What made you supervise closely?
   - Did your trust level match the task risk?

8. **How has your trust in Claude Code evolved?**
   - Are there tasks you now delegate that you initially supervised?
   - Are there patterns the agent has mastered?
   - Are there areas where trust hasn't grown—why?

### Partnership Quality

9. **Which mode do you use most: Delegation, Collaboration, Supervision, Observation?**
   - Is this the right distribution for your current work?
   - Are you stuck in one mode when another would be better?

10. **Review your CLAUDE.md file:**
    - Does it reflect your current architecture?
    - Are conventions documented?
    - Do domain boundaries match reality?
    - When did you last update it?

### Anti-Pattern Check

11. **Which anti-patterns do you recognize in your partnership?**
    - Over-delegation: Asking for too much without guidance
    - Micro-management: Directing every keystroke
    - Ignoring output: Not verifying or providing feedback
    - Context hoarding: Not sharing relevant information
    - Search engine mode: Just asking questions, not building together
    - Zero verification: Shipping without testing

12. **What would make your partnership 10x more effective?**
    - Better context in CLAUDE.md?
    - Clearer communication patterns?
    - More structured verification?
    - Different task breakdown?

---

## Cross-Property References

> **Canon Reference**: See [Tool Complementarity](https://createsomething.ltd/patterns/tool-complementarity) for the philosophical foundation of human-agent partnership.
>
> **Canon Reference**: See [Dwelling in Tools](https://createsomething.ltd/patterns/dwelling-in-tools) for Heidegger's Zuhandenheit applied to development tools.
>
> **Research Depth**: Read [Code Mode Hermeneutic Analysis](https://createsomething.io/papers/code-mode-hermeneutic-analysis) for research on when to use tool calls vs. code.

---

## Summary: The Partnership Principle

**Human-agent partnership works when:**

1. **Clear division of labor**: Each does what they do best
2. **Rich context sharing**: Agent has information to make good local decisions
3. **Calibrated trust**: Verification depth matches task risk
4. **Closed feedback loops**: Verification and learning happen consistently
5. **Documented patterns**: CLAUDE.md captures evolving conventions

**The goal is not automation—it is complementarity.**

The human provides judgment, taste, context, and verification. The agent provides execution, consistency, thoroughness, and tirelessness. Together, they form a system where creation happens faster and better than either could achieve alone.

**Tools should recede.** The partnership works best when both human and agent focus on the work, not the partnership itself. The infrastructure disappears; only creation remains.

This is Heidegger's third level applied to collaboration: *Does this partnership serve the whole?*

When yes, the work speaks for itself.
