# Agent Continuity Patterns

**Source**: [Anthropic Engineering - Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

## The Problem

Long-running agents lose context across sessions. Each new context window is "an engineer arriving with no memory of what happened."

## Core Patterns

### 1. Progress File

Persistent text file documenting prior work. Updated at session end.

```
claude-progress.txt
├── What was completed
├── What failed and why
├── What to do next
└── Known issues
```

**CREATE SOMETHING equivalent**: CLAUDE.md + conversation summaries

### 2. Initialization Script

Executable setup that any new session can run to restore working state.

```bash
# init.sh
cd /project
npm install
npm run dev &
echo "Ready"
```

**CREATE SOMETHING equivalent**: CLAUDE.md development commands section

### 3. Structured Feature List

JSON with explicit status tracking. Model updates only status fields.

```json
{
  "features": [
    {
      "id": "auth-login",
      "description": "User login with email/password",
      "passes": false
    }
  ]
}
```

**CREATE SOMETHING equivalent**: TodoWrite tool

### 4. Session Startup Protocol

Every session begins identically:

1. Run `pwd` to confirm directory
2. Read git log and progress files
3. Select highest-priority incomplete feature
4. Run E2E tests before implementing

### 5. One Feature Per Session

Constraint prevents scope creep. Each session:
- Picks one feature
- Implements it
- Tests it
- Commits with descriptive message
- Updates progress file

## Failure Modes

| Problem | Solution |
|---------|----------|
| Premature completion claims | Comprehensive feature list with explicit pass/fail |
| Lost setup knowledge | Executable init.sh |
| Undocumented bugs | Git commits + progress notes |
| Doing too much at once | One feature per session constraint |

## Integration with CREATE SOMETHING

### Already Present
- CLAUDE.md as initialization context
- `.claude/memory/` for domain knowledge
- TodoWrite for task tracking
- Atomic git commits

### To Adopt
- Explicit session startup sequence (could be a hook)
- Structured feature JSON for complex multi-session work
- Browser automation prompting for E2E testing

## Hermeneutic Frame

The harness doesn't solve continuity—it **enables re-entry into the hermeneutic circle**. Each session is a new interpreter. The artifacts (progress files, git history, feature lists) are the shared understanding that allows interpretation to continue.

This is Heidegger's insight: understanding is always already situated. The harness creates the situation.
