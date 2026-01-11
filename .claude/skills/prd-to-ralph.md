# PRD to Ralph Converter

Convert a feature description into a Ralph-compatible PRD JSON file.

## When to Use

When you have a feature idea and want to run it through the Ralph autonomous loop.

## How to Use

1. Describe your feature in plain language
2. Mention this skill: "use /prd-to-ralph"
3. I'll ask clarifying questions
4. Generate prd.json ready for Ralph

## The Process

### Step 1: Understand the Feature

I'll ask 3-5 essential questions:
- What is the core user problem being solved?
- What are the must-have vs nice-to-have requirements?
- What existing code/patterns should I follow?
- Are there any technical constraints?
- What does "done" look like?

### Step 2: Break Into Atomic Stories

Each story MUST be:
- **Completable in one Ralph iteration** (one Claude Code session)
- **Independently verifiable** (clear acceptance criteria)
- **Atomic** (does one thing well)

Rule: If a story needs more than 3 files changed, break it down further.

### Step 3: Write Acceptance Criteria

Good acceptance criteria are:
- Specific and testable
- Written as boolean checks
- Verifiable without human input

Examples:
- Good: "Login form renders at /login route"
- Good: "Email validation rejects 'invalid-email' format"
- Bad: "Form looks good"
- Bad: "Works correctly"

### Step 4: Order Stories

Stories should be ordered by dependency:
1. Foundation stories first (database, types, schemas)
2. Core functionality second
3. UI/integration last
4. Tests alongside their features

## Output Format

```json
{
  "title": "Feature Name",
  "description": "Brief description of the feature",
  "created": "2026-01-11T00:00:00Z",
  "stories": [
    {
      "id": "story-1",
      "title": "Short descriptive title",
      "description": "What this story accomplishes",
      "acceptance": [
        "Specific testable criterion 1",
        "Specific testable criterion 2",
        "Tests pass: pnpm test --filter=<package>"
      ],
      "files": ["likely/file/paths.ts"],
      "passes": false
    }
  ]
}
```

## Story Size Guide

| Complexity | Max Files | Example |
|------------|-----------|---------|
| Trivial | 1 | Add a constant, fix typo |
| Simple | 2-3 | Add a component, endpoint |
| Standard | 3-5 | Feature with tests |
| Too Big | 5+ | BREAK IT DOWN |

## Example Conversion

**User says:**
"I want to add a contact form to the agency site with email validation and database storage"

**Resulting PRD:**

```json
{
  "title": "Agency Contact Form",
  "description": "Contact form with validation and D1 storage",
  "created": "2026-01-11T00:00:00Z",
  "stories": [
    {
      "id": "contact-1",
      "title": "Create contact submissions D1 table",
      "description": "Add migration for contact_submissions table",
      "acceptance": [
        "Migration file exists at migrations/XXXX_contact_submissions.sql",
        "Table has columns: id, name, email, message, created_at",
        "Migration applies without errors"
      ],
      "files": ["packages/agency/migrations/"],
      "passes": false
    },
    {
      "id": "contact-2",
      "title": "Add contact form API endpoint",
      "description": "POST /api/contact endpoint that validates and stores submissions",
      "acceptance": [
        "POST /api/contact returns 200 on valid submission",
        "Returns 400 with errors on invalid email",
        "Stores submission in D1 contact_submissions table",
        "Returns JSON: { success: true, id: string }"
      ],
      "files": ["packages/agency/src/routes/api/contact/+server.ts"],
      "passes": false
    },
    {
      "id": "contact-3",
      "title": "Create ContactForm component",
      "description": "Svelte component with form fields and client-side validation",
      "acceptance": [
        "Component renders name, email, message fields",
        "Client-side email validation shows error for invalid format",
        "Submit button is disabled while submitting",
        "Shows success message after submission"
      ],
      "files": ["packages/agency/src/lib/components/ContactForm.svelte"],
      "passes": false
    },
    {
      "id": "contact-4",
      "title": "Add contact page with form",
      "description": "Create /contact route with ContactForm component",
      "acceptance": [
        "Route accessible at /contact",
        "ContactForm component renders",
        "Form submission works end-to-end"
      ],
      "files": ["packages/agency/src/routes/contact/+page.svelte"],
      "passes": false
    }
  ]
}
```

## Running Ralph

After generating prd.json:

```bash
# Navigate to project root
cd /path/to/create-something-monorepo

# Run Ralph
./packages/agent-sdk/scripts/ralph.sh --prd-file prd.json --max-iterations 10
```

## Tips

1. **Spend time on the PRD** - 30 min on PRD saves 3 hours of failed iterations
2. **Be specific** - Vague acceptance criteria = vague implementations
3. **Think like QA** - How would you verify each criterion?
4. **Include file paths** - Helps Claude find the right location
5. **Reference existing patterns** - "Follow the pattern in src/routes/api/auth"
