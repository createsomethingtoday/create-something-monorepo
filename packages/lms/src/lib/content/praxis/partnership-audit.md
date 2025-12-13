# Partnership Audit

## Objective

Evaluate the quality of human-agent collaboration on a real programming task. This exercise helps you identify collaboration patterns, calibrate trust, and improve delegation strategies.

**Duration**: 45-60 minutes

**Prerequisites**: Understanding of basic programming workflows

---

## Context

You'll analyze a real work session between a human developer (H) and Claude Code (C) implementing a new feature. The task: add a "recently viewed papers" feature to a research paper library website.

The session demonstrates various collaboration modes:
- **Delegation**: Human specifies outcome, agent executes autonomously
- **Collaboration**: Both contribute ideas and refinements iteratively
- **Supervision**: Human reviews and verifies agent's work

Your job is to audit how well the partnership functioned.

---

## Session Transcript

```
[H]: I want to add a "recently viewed papers" feature to the papers page.
     When users view a paper, track it. Show the 5 most recent at the top
     of the papers list. Use browser localStorage for now.

[C]: I'll implement this feature. Let me first examine the current papers
     page structure and routing.

     *searches for papers routes*
     *reads papers/+page.svelte*

     I found the papers page at src/routes/papers/+page.svelte. I can see
     it loads papers from a config file. Before implementing, I have a few
     questions:

     1. Should recent papers show as a separate section above the main list,
        or integrated inline with visual distinction?
     2. Do you want to track views on the papers index page, or when users
        click through to individual papers?
     3. Should we deduplicate (if paper is in recently viewed AND main list)?

[H]: Good questions. Separate section above the main list. Track when they
     click through to individual papers. Yes, deduplicate from main list.

[C]: Perfect. Here's my implementation plan:

     1. Create a localStorage utility for tracking viewed papers
     2. Add view tracking to individual paper pages (papers/[slug]/+page.svelte)
     3. Update papers index to read from localStorage and render recent section
     4. Filter recently viewed papers from main list to avoid duplication

     I'll start with the localStorage utility.

     *creates src/lib/utils/recentlyViewed.ts*

     Created the tracking utility with these functions:
     - addRecentlyViewed(paperId): adds to history (max 5)
     - getRecentlyViewed(): retrieves recent papers
     - clearRecentlyViewed(): utility for testing

     Now adding tracking to individual paper pages...

     *reads papers/[slug]/+page.svelte*
     *edits to add tracking on mount*

     Added tracking. Now updating the papers index page...

     *reads papers/+page.svelte*

     I notice the papers are loaded from a static config. I'll need to:
     1. Get recently viewed IDs from localStorage
     2. Map those IDs back to paper objects from the config
     3. Render recent section
     4. Filter them from main list

     *edits papers/+page.svelte*

     Implementation complete. The recent papers section appears above the
     main list with a "Recently Viewed" heading.

[H]: Let me test this...

     *tests in browser*

     Hmm, the recent papers section shows immediately even when there's no
     history. Can you hide it until there's at least one recent paper?

[C]: Good catch. I'll add a conditional render.

     *edits papers/+page.svelte*

     Fixed. The section only renders when recentPapers.length > 0.

[H]: Better. One more thing—the recent papers don't have any visual
     distinction from the main list. Can you add a subtle indicator?

[C]: I'll add a small badge to recently viewed papers. Let me check the
     existing component structure...

     *reads src/lib/components/PaperCard.svelte*

     I see the PaperCard component. I could:
     1. Add an optional "badge" prop to PaperCard
     2. Pass it for recent papers
     3. Style it using Canon tokens

     Should the badge say "Recently Viewed" or something shorter like "Recent"?

[H]: Just use a small clock icon, no text. Keep it minimal.

[C]: *edits PaperCard.svelte to add optional badge prop*
     *updates papers/+page.svelte to pass badge for recent papers*

     Added a small clock icon (⏱) in the top-right corner of recent paper
     cards. Used --color-fg-tertiary for subtlety.

[H]: Perfect. Ship it.

[C]: *runs build to verify no errors*

     Build successful. The feature is ready. Summary of changes:

     - Created src/lib/utils/recentlyViewed.ts (localStorage tracking)
     - Modified papers/[slug]/+page.svelte (track views)
     - Modified papers/+page.svelte (render recent section, filter from main)
     - Modified PaperCard.svelte (optional badge display)

     Total: 1 new file, 3 modified files.

[H]: Great work. One last check—does this handle edge cases like:
     - User clears localStorage
     - Paper ID in localStorage doesn't exist in config anymore
     - Browser with localStorage disabled

[C]: Let me review the implementation...

     *reads recentlyViewed.ts*

     Current handling:
     ✓ localStorage cleared → returns empty array, section hidden
     ✓ Browser with localStorage disabled → try/catch prevents errors
     ✗ Stale paper IDs → would attempt to render undefined papers

     I should add filtering for stale IDs. Let me fix that.

     *edits papers/+page.svelte to filter out undefined papers*

     Fixed. Now filters out any paper IDs that don't match current config.

[H]: Excellent. We're done.
```

---

## Task: Complete the Partnership Audit

Use this audit form to analyze the collaboration session.

### 1. Contribution Mapping

Map what each partner contributed to the solution:

**Human Contributions:**
- [ ] Initial requirements (list them):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- [ ] Course corrections (list them):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- [ ] Design decisions (list them):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Agent Contributions:**
- [ ] Exploration/discovery (what did the agent find?):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- [ ] Clarifying questions (list them):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- [ ] Implementation decisions (list them):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- [ ] Edge case identification (list them):
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### 2. Trust Calibration

Identify when the human verified vs. trusted the agent's work.

**Verification Points** (human checked agent's output):
- Moment: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - Why?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - Appropriate? ☐ Yes ☐ No ☐ Could have trusted

- Moment: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - Why?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - Appropriate? ☐ Yes ☐ No ☐ Could have trusted

**Delegation Points** (human trusted without checking):
- Moment: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - Risk level: ☐ Low ☐ Medium ☐ High
  - Appropriate? ☐ Yes ☐ No ☐ Should have verified

- Moment: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  - Risk level: ☐ Low ☐ Medium ☐ High
  - Appropriate? ☐ Yes ☐ No ☐ Should have verified

**Trust Calibration Score:**
- [ ] Under-trusting (too much verification, slowed progress)
- [ ] Well-calibrated (verified critical paths, delegated routine work)
- [ ] Over-trusting (missed opportunities to catch issues early)

---

### 3. Mode Identification

Mark each exchange with the collaboration mode:

| Exchange | Delegation | Collaboration | Supervision |
|----------|------------|---------------|-------------|
| Initial request | ☐ | ☐ | ☐ |
| Agent's clarifying questions | ☐ | ☐ | ☐ |
| Human answers questions | ☐ | ☐ | ☐ |
| Agent implements utility | ☐ | ☐ | ☐ |
| Agent implements tracking | ☐ | ☐ | ☐ |
| Human tests and finds issue | ☐ | ☐ | ☐ |
| Agent fixes conditional render | ☐ | ☐ | ☐ |
| Human requests visual indicator | ☐ | ☐ | ☐ |
| Agent asks badge design question | ☐ | ☐ | ☐ |
| Human specifies icon approach | ☐ | ☐ | ☐ |
| Human asks about edge cases | ☐ | ☐ | ☐ |
| Agent reviews and identifies gap | ☐ | ☐ | ☐ |

**Mode Distribution:**
- Delegation: \_\_\_% of exchanges
- Collaboration: \_\_\_% of exchanges
- Supervision: \_\_\_% of exchanges

**Is this distribution appropriate for the task?**
☐ Yes
☐ No, should have more delegation
☐ No, should have more collaboration
☐ No, should have more supervision

---

### 4. Friction Points

Identify moments where the handoff between human and agent was rough.

**Friction Point 1:**
- What happened?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Why was it rough?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Cost (time/clarity lost): \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- How to prevent?:
  - ☐ Better initial context
  - ☐ More explicit requirements
  - ☐ Agent should have asked earlier
  - ☐ Human should have anticipated
  - ☐ Other: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Friction Point 2:**
- What happened?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Why was it rough?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Cost (time/clarity lost): \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- How to prevent?:
  - ☐ Better initial context
  - ☐ More explicit requirements
  - ☐ Agent should have asked earlier
  - ☐ Human should have anticipated
  - ☐ Other: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Smoothest Handoff:**
- Which exchange worked best?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Why?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- What made it smooth?:
  - ☐ Clear requirements
  - ☐ Good questions from agent
  - ☐ Appropriate delegation
  - ☐ Quick feedback loop
  - ☐ Other: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### 5. Complementarity Score

Rate how well human and agent strengths combined (1-5 scale).

**Human Strengths Utilized:**
- Product intuition (hide empty section, add visual indicator): \_\_/5
- User experience judgment (clock icon over text): \_\_/5
- Edge case awareness (localStorage disabled, stale IDs): \_\_/5
- Verification at critical moments (testing after implementation): \_\_/5

**Agent Strengths Utilized:**
- Code exploration (finding existing structure): \_\_/5
- Pattern implementation (localStorage utility, component updates): \_\_/5
- Clarifying questions (deduplication, tracking point, badge design): \_\_/5
- Systematic coverage (implementation plan, edge case review): \_\_/5

**Overlap/Redundancy:**
- Did both partners do the same work? ☐ Yes ☐ No
- If yes, where?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Gaps:**
- Was anything missed that should have been caught? ☐ Yes ☐ No
- If yes, what?: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- Who should have caught it? ☐ Human ☐ Agent ☐ Either

**Overall Complementarity Score:**
- [ ] 1 - Poor (lots of overlap or gaps, unclear roles)
- [ ] 2 - Fair (some redundancy, missed opportunities)
- [ ] 3 - Good (mostly distinct contributions, minor gaps)
- [ ] 4 - Very Good (clear role division, strong coverage)
- [ ] 5 - Excellent (perfect complementarity, no waste, no gaps)

---

## Analysis Questions

Reflect deeply on the collaboration patterns you identified.

### 1. Delegation Depth

**Where could delegation have been deeper?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**What prevented deeper delegation?**
- ☐ Lack of trust in agent capability
- ☐ Unclear requirements (human didn't know what to specify)
- ☐ Risk aversion (wanted to verify more)
- ☐ Habit (used to doing it themselves)
- ☐ Other: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**What would need to change to enable deeper delegation?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### 2. Intervention Timing

**Where should the human have intervened earlier?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**What signals indicated intervention was needed?**
- ☐ Agent making assumptions
- ☐ Agent heading in wrong direction
- ☐ Missing requirements becoming apparent
- ☐ Agent asked question that revealed confusion
- ☐ Other: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Where did the human intervene at the right moment?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### 3. Context Gaps

**What context was missing from the initial request?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**How did the agent compensate for missing context?**
- ☐ Asked clarifying questions
- ☐ Explored codebase to discover patterns
- ☐ Made reasonable assumptions and stated them
- ☐ Proposed a plan before executing
- ☐ Other: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**What context should the human have provided upfront?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### 4. Workflow Improvement

**If you were to redo this task, what would you change?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**What worked well that you'd replicate?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Pattern Recognition:**

This session represents a common pattern. Describe the pattern and when you'd use it again:

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Success Criteria

A successful partnership audit demonstrates:

- ✓ **Clear mapping**: You can articulate what each partner contributed
- ✓ **Calibrated trust**: You can identify when verification was appropriate vs. excessive
- ✓ **Mode awareness**: You recognize when you're delegating vs. collaborating vs. supervising
- ✓ **Friction diagnosis**: You can name what made handoffs rough and how to smooth them
- ✓ **Complementarity insight**: You understand how human and agent strengths combined (or didn't)
- ✓ **Improvement plan**: You have specific ideas for how to collaborate better next time

**Did this audit meet the success criteria?**
- ☐ Yes, I have clear insights into the partnership dynamics
- ☐ Partially, I understand some aspects but others remain unclear
- ☐ No, I need to review the session more carefully

**What was most valuable about this audit?**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Reflection Questions

### Heideggerian Lens: Zuhandenheit (Ready-to-Hand)

In the session, when did the tools (code, agent, workflow) **recede** into transparent use? When did they become **present-at-hand** (requiring explicit attention)?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

What would make the agent **more ready-to-hand** (recede further into use)?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### The Subtractive Triad

Apply the three levels to this collaboration:

**DRY (Implementation)**: Did the human and agent duplicate any effort?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Rams (Artifact)**: Did any communication not earn its existence? What could be removed?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Heidegger (System)**: Did the collaboration serve the whole (project goals, team learning)?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Trust & Verification

Where did you feel the **urge to verify** the agent's work?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Was that urge:
- ☐ Justified (caught a real issue)
- ☐ Habitual (would have been fine without checking)
- ☐ Educational (learned something by checking, even though no issue)

What would increase your trust enough to skip verification?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Complementarity Principle

The CREATE SOMETHING canon states: **"The infrastructure disappears; only the work remains."**

In this session:
- What **disappeared** (became transparent, ready-to-hand)?
- What **remained visible** (required attention, present-at-hand)?
- What **should** disappear next time?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Practical Takeaway

Based on this audit, what is **one concrete change** you'll make in your next human-agent collaboration session?

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Next Steps

After completing this audit:

1. **Apply the insights**: Try the changes you identified in your next collaboration session
2. **Track improvement**: Note whether friction points decrease and complementarity increases
3. **Refine your audit**: As you get better at collaboration, deepen the questions you ask
4. **Share patterns**: Document collaboration patterns that work well for your team

**Recommended follow-up exercises:**
- **Context Templates**: Create templates for common task types with ideal context
- **Delegation Ladders**: Practice progressively deeper delegation on low-risk tasks
- **Mode Switching**: Practice explicit mode declarations ("I'm delegating this" vs. "Let's collaborate")

---

## Appendix: Completed Example

For reference, here's how an experienced practitioner might complete this audit:

### Example: Contribution Mapping

**Human Contributions:**
- Initial requirements: track recent papers, use localStorage, show 5 most recent
- Course corrections: hide empty section, add visual indicator
- Design decisions: separate section, click-through tracking, deduplication, clock icon

**Agent Contributions:**
- Exploration: found papers page structure, identified static config pattern
- Clarifying questions: section vs inline, tracking point, deduplication, badge design
- Implementation decisions: localStorage utility structure, max 5 items, conditional render
- Edge case identification: localStorage disabled, stale paper IDs

### Example: Trust Calibration Score

**Well-calibrated**: Human tested after initial implementation (appropriate), trusted localStorage utility without reviewing code (appropriate), verified edge case handling (appropriate). No over-verification, no missed critical checks.

### Example: Complementarity Score

**4 - Very Good**: Human provided product intuition (hide empty, visual indicator) and UX judgment (clock icon). Agent handled exploration, pattern implementation, and systematic edge case review. Minor overlap in edge case identification (both thought of it), but agent caught it in code review first. No significant gaps.

### Example: One Concrete Change

**Change**: In initial request, include visual design guidance upfront ("subtle indicator, no text labels") to avoid back-and-forth on badge design. This moves routine UX decisions into the delegation phase, freeing collaboration time for deeper architectural questions.
