import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

// Lesson metadata - matches the seeing package
const SEEING_LESSONS = [
	{
		id: 'setting-up',
		title: 'Setting Up',
		description: 'Install Gemini CLI and the Seeing extension. Five minutes to your first practice.',
		duration: '5 min'
	},
	{
		id: 'what-is-creation',
		title: 'What Is Creation?',
		description: 'The meta-principle: creation as the discipline of removing what obscures.',
		duration: '10 min'
	},
	{
		id: 'dry-implementation',
		title: 'DRY: Implementation',
		description: 'Level 1 — "Have I built this before?" Learn to see duplication.',
		duration: '15 min'
	},
	{
		id: 'rams-artifact',
		title: 'Rams: Artifact',
		description: 'Level 2 — "Does this earn its existence?" Learn to see excess.',
		duration: '15 min'
	},
	{
		id: 'heidegger-system',
		title: 'Heidegger: System',
		description: 'Level 3 — "Does this serve the whole?" Learn to see disconnection.',
		duration: '20 min'
	},
	{
		id: 'triad-application',
		title: 'Applying the Triad',
		description: 'Putting the three questions together. The framework becomes perception.',
		duration: '25 min'
	},
	{
		id: 'capstone-intro',
		title: 'Capstone: Ship Your Site',
		description: 'Your graduation project: design, build, and deploy a personal site you own.',
		duration: '10 min'
	},
	{
		id: 'capstone-design',
		title: 'Design with AI Studio',
		description: 'Use Google AI Studio to generate your site layout and content.',
		duration: '30 min'
	},
	{
		id: 'capstone-build',
		title: 'Build with Gemini CLI',
		description: 'Turn your design into code with AI assistance.',
		duration: '45 min'
	},
	{
		id: 'capstone-deploy',
		title: 'Deploy to Cloudflare',
		description: 'Put your site live on Cloudflare Pages with your own domain.',
		duration: '30 min'
	},
	{
		id: 'capstone-graduate',
		title: 'Graduate',
		description: 'Submit your site URL and move to the next level.',
		duration: '5 min'
	}
] as const;

type LessonId = (typeof SEEING_LESSONS)[number]['id'];

// Lesson content - embedded for now, could be moved to @createsomething/seeing package
const LESSON_CONTENT: Record<LessonId, string> = {
	'setting-up': `
## Prerequisites

- **Node.js 20 or higher** — Check with \`node -v\`
- **A Google account** — For free tier access

If you need Node.js, download it from [nodejs.org](https://nodejs.org/).

---

## Step 1: Install Gemini CLI

Choose one method:

### Option A: npm (Recommended)

\`\`\`bash
npm install -g @google/gemini-cli
\`\`\`

### Option B: Homebrew (macOS/Linux)

\`\`\`bash
brew install gemini-cli
\`\`\`

### Option C: Run without installing

\`\`\`bash
npx @google/gemini-cli
\`\`\`

Verify installation:

\`\`\`bash
gemini --version
\`\`\`

**Source**: [geminicli.com/docs/get-started/installation](https://geminicli.com/docs/get-started/installation/)

---

## Step 2: Authenticate

Start Gemini CLI:

\`\`\`bash
gemini
\`\`\`

On first run, you'll see an authentication menu. Choose **Login with Google** (recommended).

1. A browser window opens
2. Sign in with your Google account
3. Authorize Gemini CLI
4. Return to your terminal — you're authenticated

### Free Tier Limits

With a personal Google account:
- **1,000 requests per day**
- **60 requests per minute**
- **1M token context window** (Gemini 2.5 Pro)

These limits are generous for learning.

**Source**: [geminicli.com/docs/get-started/authentication](https://geminicli.com/docs/get-started/authentication/)

---

## Step 3: Install the Seeing Extension

Add to \`~/.gemini/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "seeing": {
      "command": "npx",
      "args": ["@createsomething/seeing"]
    }
  }
}
\`\`\`

Create the directory if needed:

\`\`\`bash
mkdir -p ~/.gemini
\`\`\`

Restart Gemini CLI after adding the configuration.

**Source**: [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/)

---

## Step 4: Verify

Test that everything works:

\`\`\`bash
/lesson what-is-creation
\`\`\`

If you see the lesson content, you're ready.

---

## Troubleshooting

**"Command not found: gemini"** — npm's bin directory isn't in your PATH. Use \`npx @google/gemini-cli\` instead, or add npm's bin to your PATH.

**Authentication fails** — Try running \`gemini\` again and selecting a different auth method.

**Extension not loading** — Check \`~/.gemini/settings.json\` syntax (must be valid JSON), then restart Gemini CLI.

**Node.js version too old** — Gemini CLI requires Node.js 20+. Upgrade via [nodejs.org](https://nodejs.org/).

---

## Resources

- [Gemini CLI Installation](https://geminicli.com/docs/get-started/installation/) — Official guide
- [Gemini CLI Authentication](https://geminicli.com/docs/get-started/authentication/) — All auth methods
- [MCP Server Configuration](https://geminicli.com/docs/tools/mcp-server/) — Extension setup
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP documentation

---

## Ready

You have Gemini CLI. You have the Seeing extension.

Now let's learn what creation actually is.
`,
	'what-is-creation': `
> **First time here?** If you haven't set up Gemini CLI yet, start with [Setting Up](/seeing/setting-up).

## The Paradox

Most people think creation is about adding.

More features. More code. More options. More complexity. The instinct runs deep: to create is to produce, to generate, to add to the world.

But consider this question: When you simplify code, are you creating or destroying?

When you refactor a 500-line file into a clear 50-line abstraction, have you created something? Most developers would say yes. But you removed 450 lines. You subtracted.

**The paradox**: Some of the most creative acts are acts of removal.

## Michelangelo's Insight

When asked how he carved David, Michelangelo reportedly said:

> "I saw the angel in the marble and carved until I set him free."

He didn't add marble to create David. He removed what wasn't David.

The sculpture was always there, hidden in the stone. Creation was the act of revealing it.

## The Meta-Principle

**Creation is the discipline of removing what obscures.**

This is the foundation of everything in CREATE SOMETHING. Every principle, every practice, every pattern builds on this insight.

When you write code, you're not building from nothing. You're revealing a solution that was always possible. The problem has a shape. The solution fits that shape. Your job is to remove everything that doesn't fit:

- Remove duplication until the concept is clear
- Remove excess until only the essential remains
- Remove disconnection until the system coheres

## What Obscures?

Three things obscure truth in code:

### 1. Duplication (Implementation Level)
When the same concept is expressed multiple times, the concept itself becomes obscured. Which version is canonical? Which is correct? The duplication creates noise that hides the signal.

### 2. Excess (Artifact Level)
When a feature has more than it needs, the essential purpose becomes obscured. What does this actually do? What's the core value? The excess creates confusion that hides clarity.

### 3. Disconnection (System Level)
When parts don't relate properly to the whole, the system's purpose becomes obscured. How does this fit? What does it serve? The disconnection creates fragmentation that hides coherence.

## Subtractive Creation in Practice

This isn't just philosophy. It's practical guidance.

**Before you add code, ask:**
- Am I adding, or am I revealing?
- What would I need to remove for this to be clearer?
- Is this creation, or is this obscuring?

**When you review code, ask:**
- What's hiding here that could be revealed through removal?
- What duplication, excess, or disconnection is obscuring the solution?
- What's the simplest form that still works?

---

## Reflection

Before moving on, sit with this:

**What's one thing in your current codebase that's obscured by duplication, excess, or disconnection?**

Don't fix it yet. Just see it.

Seeing comes before doing. That's why we're here.

---

## Resources

The Subtractive Triad draws from three foundational sources:

- **DRY**: From *The Pragmatic Programmer* by Andy Hunt and David Thomas (1999). [pragprog.com/titles/tpp20](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)

- **Rams**: Dieter Rams' Ten Principles of Good Design. [rams-foundation.org](https://rams-foundation.org/foundation/design-comprehension/theses/)

- **Heidegger**: The concepts of Zuhandenheit (ready-to-hand) and Vorhandenheit (present-at-hand) from *Being and Time* (1927). [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/heidegger/)

These sources inform each level of the Triad you'll learn in the following lessons.
`,
	'dry-implementation': `
## Level 1 of the Subtractive Triad

**Question**: "Have I built this before?"  
**Action**: Unify

This is the first question because it's the fastest filter. Either the code exists or it doesn't. Either you're duplicating or you're not.

## What DRY Really Means

DRY stands for "Don't Repeat Yourself." The principle was formally introduced in [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) by Andy Hunt and David Thomas (1999).

**DRY is not**: "Never write similar code twice."  
**DRY is**: "Every piece of knowledge must have a single, unambiguous, authoritative representation in a system."

The difference matters.

### Bad DRY

\`\`\`typescript
// Someone read "DRY" and made this:
const BUTTON_COLOR = '#3b82f6';
const LINK_COLOR = '#3b82f6';  
const HEADER_COLOR = '#3b82f6';

// "They're all blue, so DRY says make one constant!"
const PRIMARY_COLOR = '#3b82f6';
\`\`\`

This is wrong. These aren't duplicated knowledge. They're three different concepts that happen to have the same value. If button color changes, link color might not.

### Good DRY

\`\`\`typescript
// The design system defines blue:
const colors = { blue: { 500: '#3b82f6' } };

// Components use the token:
const buttonStyles = { bg: colors.blue[500] };
const linkStyles = { color: colors.blue[500] };
\`\`\`

Now there's one authoritative representation of "blue-500". If it changes, it changes everywhere. That's DRY.

## The Question in Practice

When you're about to write code, ask: **"Have I built this before?"**

This question has layers:

### Layer 1: Exact Match
Have I literally written this function before? Is there a \`formatDate()\` somewhere?

### Layer 2: Conceptual Match
Have I built something that serves the same purpose? Different name, same concept?

### Layer 3: Library Match
Has someone else built this? Is there a well-tested solution?

## When Duplication Is OK

Not all repetition is duplication. Sometimes similar code serves different purposes:

- Two handlers that look similar but will evolve differently
- Test setup that could be shared but is clearer inline
- Validation rules that coincidentally match but serve different domains

**The test**: If one changes, must the other change? If yes, unify. If no, leave separate.

---

## Reflection

The DRY question becomes instinct when you ask it before writing, not after.

**What would change if you asked "Have I built this before?" every time you started typing?**

---

## Resources

- **Original Source**: [*The Pragmatic Programmer: 20th Anniversary Edition*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Andy Hunt and David Thomas

- **Key Insight**: "Duplication is far cheaper than the wrong abstraction" — Sandi Metz. This nuance is critical: don't unify prematurely.

- **The Test**: Code duplication ≠ knowledge duplication. Two functions with identical code that serve different purposes and will evolve differently are *not* DRY violations.
`,
	'rams-artifact': `
## Level 2 of the Subtractive Triad

**Question**: "Does this earn its existence?"  
**Action**: Remove

Named for [Dieter Rams](https://rams-foundation.org/homepage/), the legendary designer whose principle was:

**Weniger, aber besser** — Less, but better.

## The Rams Standard

Rams led design at Braun for over 30 years. Every button, every line, every element had to justify itself. If it didn't serve the essential purpose, it was removed.

His [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) include:

1. Good design is innovative
2. Good design makes a product useful
3. Good design is aesthetic
4. Good design makes a product understandable
5. Good design is unobtrusive
6. Good design is honest
7. Good design is long-lasting
8. Good design is thorough down to the last detail
9. Good design is environmentally friendly
10. **Good design is as little design as possible**

The tenth principle encapsulates the philosophy: concentrate on essential aspects, don't burden products with non-essentials, return to purity and simplicity.

This isn't minimalism for aesthetics. It's minimalism for function. Every element that doesn't earn its place actively harms the product by obscuring what matters.

## The Question in Practice

After you've checked for duplication (DRY), ask: **"Does this earn its existence?"**

This applies to:

### Features
Does this feature serve a real need, or an imagined one?
- "Users might want to..." → They haven't asked. Wait.
- "It would be cool if..." → Cool isn't useful. Remove.
- "Just in case..." → Cases that haven't happened don't need handling.

### Parameters
Does this parameter justify its complexity?
- Props with defaults that never change → Remove the prop
- Options that are always the same value → Make it a constant
- Flexibility that's never exercised → Simplify

### Code
Does this code earn its lines?
- Abstractions with one implementation → Inline them
- Helper functions used once → Inline them
- Comments that describe what code already says → Remove them

## The Existence Test

For anything you're about to add, ask:

1. **What happens if I don't add this?** — If "nothing much," don't add it.
2. **Who asked for this?** — If no one asked, why are you building it?
3. **When was this last needed?** — If you can't remember, it's probably not needed.
4. **What's the simplest version?** — Build that first. Add complexity only when forced.

---

## Reflection

The Rams question challenges our instinct to add. Building feels productive. Removing feels like giving up.

But removal is creation. Every feature you don't build is time for features that matter. Every line you don't write is clarity for lines that remain.

**What would you remove from your current project if you had to justify every feature's existence?**

---

## Resources

- **Rams Foundation**: [rams-foundation.org](https://rams-foundation.org/homepage/) — Official foundation preserving Rams' design legacy

- **Ten Principles**: [The Theses](https://rams-foundation.org/foundation/design-comprehension/theses/) — Original articulation of the principles

- **Design Museum Overview**: [What Is Good Design?](https://designmuseum.org/discover-design/all-stories/what-is-good-design-a-quick-look-at-dieter-rams-ten-principles) — Accessible introduction to Rams' principles

- **Digital Influence**: Jonathan Ive, Apple's former Chief Design Officer, translated Rams' principles into digital products. The iPhone calculator is a direct homage to Rams' Braun designs.
`,
	'heidegger-system': `
## Level 3 of the Subtractive Triad

**Question**: "Does this serve the whole?"  
**Action**: Reconnect

This is the deepest level. DRY looks at implementation. Rams looks at artifacts. Heidegger looks at systems.

Named for [Martin Heidegger](https://plato.stanford.edu/entries/heidegger/), the philosopher who explored how things exist in relation to their context in *Being and Time* (1927).

## The Hermeneutic Circle

Heidegger's key insight: **You understand the parts through the whole, and the whole through the parts.**

Reading a sentence: You understand words through the sentence's meaning, and the sentence's meaning through the words. Neither comes first. Understanding spirals between them.

The same applies to systems. You understand a function through the system it serves, and the system through its functions. A component makes sense only in context. A service exists only within an architecture.

## The Question in Practice

After checking for duplication (DRY) and excess (Rams), ask: **"Does this serve the whole?"**

This requires knowing what "the whole" is:

### Identify the System
What system does this belong to? What's the system's purpose?

### Map the Connections
How does this part connect to other parts? What does it depend on? What depends on it?

### Evaluate the Fit
Does this part strengthen or fragment the whole?

## Seeing Disconnection

Train yourself to notice:

**Orphaned code**: Functions nothing calls, components nothing renders

**Fragmented boundaries**: Imports that cross architectural lines, responsibilities split across modules

**Misaligned naming**: Code that says "user" when the system says "member"

**Wrong placement**: Logic in the UI that belongs in a service

---

## Key Concepts for Developers

Two Heideggerian concepts illuminate how we relate to tools:

### Zuhandenheit (Ready-to-hand)

When using a hammer, you don't think about the hammer—you think about the nail. The tool *withdraws* from attention and becomes an extension of your intention. Well-designed code works the same way: it recedes, letting you focus on the problem.

### Vorhandenheit (Present-at-hand)

When the hammer breaks, suddenly you notice it. It shifts from transparent use to explicit attention. Poorly designed code is always present-at-hand—you're constantly aware of the tool instead of the work.

**The goal**: Code that stays ready-to-hand. Systems that recede into transparent use.

---

## Reflection

The Heidegger question is the hardest because it requires perspective. You have to see the whole to evaluate whether parts serve it.

**What is the "whole" that your current project serves? Can you articulate it clearly?**

If you can't articulate the whole, you can't evaluate whether parts serve it. Sometimes the first step is clarifying purpose.

---

## Resources

- **Stanford Encyclopedia of Philosophy**: [Heidegger](https://plato.stanford.edu/entries/heidegger/) — Comprehensive overview of Heidegger's philosophy

- **Heideggerian Terminology**: [Wikipedia](https://en.wikipedia.org/wiki/Heideggerian_terminology) — Glossary of key concepts

- **Primary Source**: *Being and Time* (Sein und Zeit), 1927 — Heidegger's foundational work
`,
	'triad-application': `
## The Three Questions Together

You've learned the three levels separately. Now you use them together.

**The Subtractive Triad is a decision framework.** For any technical choice, ask three questions in sequence:

1. **DRY** (Implementation) → "Have I built this before?"
2. **Rams** (Artifact) → "Does this earn its existence?"
3. **Heidegger** (System) → "Does this serve the whole?"

## Why This Order?

**DRY is fastest** — You either have the code or you don't. Quick to check.  
**Rams requires judgment** — You must evaluate need vs. excess. Slower.  
**Heidegger is deepest** — You must understand the whole system. Slowest.

Start shallow, spiral deeper. If DRY eliminates the decision, you don't need Rams. If Rams eliminates the feature, you don't need Heidegger.

## A Complete Example

**Scenario**: "Add a dark mode toggle to user profiles."

### Level 1: DRY
**Ask**: Have I built this before?  
**Finding**: Yes! There's a theme switcher in settings.  
**Decision**: Reuse the existing \`useTheme()\` hook.

### Level 2: Rams
**Ask**: Does a profile-level toggle earn its existence?  
**Finding**: The settings toggle already serves this need.  
**Decision**: This feature doesn't earn its existence.

**The decision ends here.** Rams eliminated the feature.

## The Spiral

The triad isn't linear—it spirals. You'll revisit levels as understanding deepens.

\`\`\`
Design a feature (implementation)
↓
DRY: Is this duplicated? → No, continue
↓
Build the feature (artifact)
↓
Rams: Does this earn existence? → Yes, continue
↓
Test with users (system)
↓
Heidegger: Does this serve the workflow?
↓
Wait—users are confused by the flow!
↓
BACK TO RAMS: The boundaries are confusing
↓
Simplify the feature set
↓
Continue the spiral...
\`\`\`

## Mastery

You've mastered the triad when:

1. **The questions are unconscious** — You ask them without thinking about asking
2. **You catch issues early** — Problems surface during design, not after testing
3. **You spiral naturally** — Moving between levels feels fluid, not forced

---

## The Journey Ahead

You've learned the philosophy. Now it's time to apply it.

**Next: The Capstone Project**

You'll design, build, and deploy your own site—applying the Triad to every decision. When you ship it, you'll be ready to graduate.

---

## Resources

### The Triad Sources

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Hunt & Thomas
- **Rams**: [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) — Rams Foundation
- **Heidegger**: [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/heidegger/)

### For Developers

The Triad applies to any technical decision:
- Feature requests → Does this earn its existence?
- Code review → Have I seen this pattern duplicated?
- Architecture → Does this serve the whole system?
`,
	'capstone-intro': `
## Your Graduation Project

You've learned to see. Now prove it.

**The Capstone**: Design, build, and deploy a personal site that you own. Apply the Subtractive Triad to every decision.

## What You'll Create

A personal site with:
- **Your name and what you do** (nothing more)
- **A way to contact you** (email, form, or link)
- **Deployed to Cloudflare Pages** (free tier)
- **On a domain you control** (optional but recommended)

## What You Won't Create

- No blog (unless you'll actually write)
- No portfolio grid (unless you have work to show)
- No "services" page (unless you're selling)
- No animations (unless they serve purpose)

**The Triad applies**: If it doesn't earn its existence, it doesn't ship.

## The Tools

| Tool | Purpose | Cost |
|------|---------|------|
| [Google AI Studio](https://aistudio.google.com/) | Design generation | Free |
| Gemini CLI | Code assistance | Free |
| Cloudflare Pages | Hosting | Free |
| Domain (optional) | Your address | ~$10/year |

## The Process

1. **Design** — Generate layouts and content with AI Studio
2. **Build** — Turn designs into code with Gemini CLI
3. **Deploy** — Ship to Cloudflare Pages
4. **Graduate** — Submit your URL

## Why This Project?

This isn't busy work. You're building:

**Ownership** — Your site, your domain, your infrastructure. Not someone else's platform.

**Skill** — CLI workflows, cloud deployment, AI-assisted development. Real skills for real work.

**Proof** — A tangible demonstration that you can ship.

---

## Ready?

The next lesson walks you through designing in AI Studio.
`,
	'capstone-design': `
## Design with AI Studio

You're going to generate your site's design using [Google AI Studio](https://aistudio.google.com/).

## Step 1: Open AI Studio

Go to [aistudio.google.com](https://aistudio.google.com/) and sign in with your Google account.

## Step 2: Describe Your Site

Start a new chat and describe what you need:

\`\`\`
I'm building a minimal personal website. I need:
- My name as the headline
- A one-sentence description of what I do
- A contact email or link
- Nothing else

Generate the HTML and CSS for a single-page site with:
- Dark background (#000000)
- White text (#ffffff)
- Centered content
- Mobile-responsive
- No JavaScript needed
\`\`\`

## Step 3: Apply the Triad

Before accepting the design, audit it:

### DRY Check
- Is there repeated CSS? (Consolidate)
- Are there redundant wrapper divs? (Remove)

### Rams Check
- Does every element earn its place?
- Is there decorative content that doesn't serve purpose?
- Could anything be removed while keeping function?

### Heidegger Check
- Does this serve your goal (professional presence)?
- Does the structure fit how the site will be used?

## Step 4: Iterate

Ask AI Studio to simplify:

\`\`\`
This is good, but apply "less, but better":
- Remove any decorative elements
- Reduce to the minimum that still works
- Show me the simplest possible version
\`\`\`

## Step 5: Save Your Design

Copy the final HTML/CSS. You'll use this in the next step.

---

## Starter Template

If you want a starting point, here's the minimal structure:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Name</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      color: #fff;
      font-family: system-ui, sans-serif;
    }
    main { text-align: center; padding: 2rem; }
    h1 { font-size: 2rem; font-weight: 400; margin-bottom: 0.5rem; }
    p { color: #888; margin-bottom: 1rem; }
    a { color: #fff; }
  </style>
</head>
<body>
  <main>
    <h1>Your Name</h1>
    <p>What you do, in one sentence.</p>
    <a href="mailto:you@example.com">Contact</a>
  </main>
</body>
</html>
\`\`\`

**This is the baseline.** Everything you add must earn its place.

---

## What You Have Now

- A design generated or refined with AI Studio
- HTML/CSS ready to deploy
- Every element justified through the Triad

**Next**: Build it out with Gemini CLI.
`,
	'capstone-build': `
## Build with Gemini CLI

You have a design. Now let's build it—using your AI agent as a coding partner.

**The skill we're building**: Having a conversation with your agent to write code. You'll describe what you want, evaluate the output, and iterate until it's right.

---

## Part 1: Set Up Your Project

### Ask Your Agent

Open Gemini CLI and prompt:

\`\`\`
I need to create a project folder for a static HTML website.
What's the minimal folder structure I need?
Show me the terminal commands to set it up.
\`\`\`

**Read the response.** Your agent will give you commands like:

\`\`\`bash
mkdir my-site
cd my-site
touch index.html
\`\`\`

**Execute them.** You now have an empty project folder.

---

## Part 2: Generate Your Code

### Ask Your Agent

Take the design concept from AI Studio and turn it into a prompt:

\`\`\`
Create a minimal personal website with:
- Name: [Your Name]
- Role: [What you do]
- Contact: [Your email or link]

Requirements:
- Single HTML file with embedded CSS
- Dark background (#000), white text (#fff)
- Centered content
- Mobile responsive
- No JavaScript
- Apply "less, but better" - nothing decorative

Show me the complete HTML file.
\`\`\`

**Read the response carefully.** Look for:
- Is the structure clean?
- Is there anything you didn't ask for?
- Does it match your vision?

### Evaluate the Output

Before copying the code, ask yourself:

| Triad Question | Check |
|----------------|-------|
| **DRY** | Is there repeated CSS that could be consolidated? |
| **Rams** | Is there anything decorative that doesn't earn its place? |
| **Heidegger** | Does this serve the goal of professional presence? |

If something doesn't pass, tell your agent:

\`\`\`
The code looks good, but:
- Remove [specific element that doesn't earn its place]
- Consolidate [repeated CSS]
- Simplify [overly complex section]

Show me the updated version.
\`\`\`

**This is the pattern**: Generate → Evaluate → Iterate

---

## Part 3: Refine Through Conversation

### Add Only What Earns Its Place

Ask your agent:

\`\`\`
What meta tags should I add for:
- Search engine visibility
- Social media sharing (Open Graph)

Only include what's truly necessary. Explain why each tag earns its place.
\`\`\`

**Read the explanation.** Understand *why* each tag is needed before adding it.

### Ask for a Triad Audit

\`\`\`
Apply the Subtractive Triad to this HTML:

1. DRY: Is anything repeated that could be unified?
2. RAMS: Does every element earn its existence?
3. HEIDEGGER: Does the structure serve the whole purpose?

Be specific about what to remove or change.
\`\`\`

Your agent becomes your code reviewer.

---

## Part 4: Create Your File

Ask your agent how to save the code:

\`\`\`
How do I create and edit a file called index.html from the terminal?
What are my options on [macOS/Windows/Linux]?
\`\`\`

Common methods your agent might suggest:
- \`nano index.html\` (simple terminal editor)
- \`code index.html\` (VS Code)
- Copy/paste into your preferred editor

Paste the final HTML into your \`index.html\` file.

---

## Part 5: Test Locally

### Ask Your Agent

\`\`\`
How do I preview a static HTML file locally in my browser?
I want to see it before deploying.
Show me the simplest method for [macOS/Windows/Linux].
\`\`\`

**Read the options.** Common methods:

\`\`\`bash
# Python (usually pre-installed on Mac/Linux)
python -m http.server 8000

# Or use npx (no install needed)
npx serve .
\`\`\`

Open \`http://localhost:8000\` in your browser.

### Verify

- Does it look right?
- Resize your browser—does it work on mobile widths?
- Is the text readable?

If something's wrong, describe the issue to your agent:

\`\`\`
The site looks good on desktop but [describe problem] on mobile.
How do I fix this?
\`\`\`

---

## Part 6: Final Review

### Your File Structure

\`\`\`
my-site/
└── index.html
\`\`\`

That's it. One file. If you added images:

\`\`\`
my-site/
├── index.html
└── images/
    └── photo.jpg
\`\`\`

But only if the images earn their place.

### The Pattern You Learned

Throughout this lesson, you:
1. **Asked** your agent for guidance
2. **Read** and understood its output
3. **Evaluated** against the Triad
4. **Iterated** until satisfied
5. **Created** the final file

**This is agentic development.** You're not copying code blindly. You're having a conversation, understanding the outputs, and making decisions.

---

## What You Have Now

- A working site on your local machine
- Code you understand (because you evaluated every piece)
- A pattern for working with AI agents
- Ready for deployment

**Next**: Deploy to Cloudflare Pages.
`,
	'capstone-deploy': `
## Deploy to Cloudflare Pages

Your site is ready. Now let's put it on the internet—using your AI agent to guide you through each step.

**The skill we're building**: Learning to work *with* an AI agent. You'll prompt Gemini CLI, read its outputs, and understand what it's doing. This is how modern development works.

---

## Part 1: Create Your Cloudflare Account

### Ask Your Agent

Open Gemini CLI and prompt:

\`\`\`
I need to create a Cloudflare account to host a static website. 
Walk me through the account creation process step by step.
What information will I need? What should I watch out for?
\`\`\`

**Read the response carefully.** Your agent will explain:
- What Cloudflare is
- What the free tier includes
- What information you'll need (email, password)
- Any gotchas to avoid

### Do It

1. Go to [cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Enter your email and create a password
3. Verify your email (check spam folder)
4. You'll land on the dashboard

**Reference**: [Cloudflare Account Setup Docs](https://developers.cloudflare.com/fundamentals/setup/account/)

> **Why Cloudflare?** Free tier, global CDN, no credit card required, owns the infrastructure you'll use professionally. This isn't a toy—it's production infrastructure.

---

## Part 2: Install and Authenticate Wrangler

### Ask Your Agent

\`\`\`
How do I install Cloudflare's Wrangler CLI tool?
I'm on [macOS/Windows/Linux]. Show me the commands.
\`\`\`

**Read the response.** Note:
- The installation command
- Any prerequisites (Node.js version, etc.)
- What the tool does

### Do It

\`\`\`bash
npm install -g wrangler
\`\`\`

Verify it installed:

\`\`\`bash
wrangler --version
\`\`\`

### Authenticate

Ask your agent:

\`\`\`
How do I authenticate Wrangler with my Cloudflare account?
What happens when I run wrangler login?
\`\`\`

Then do it:

\`\`\`bash
wrangler login
\`\`\`

This opens your browser. Authorize the connection. Return to your terminal.

**Reference**: [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

---

## Part 3: Deploy Your Site

### Ask Your Agent

\`\`\`
I have a folder with an index.html file. 
How do I deploy it to Cloudflare Pages using Wrangler?
Show me the exact command.
\`\`\`

**Read the response.** Understand:
- What \`wrangler pages deploy\` does
- What the \`--project-name\` flag means
- What URL you'll get

### Do It

From your project folder:

\`\`\`bash
wrangler pages deploy . --project-name=my-site
\`\`\`

**First time?** Wrangler creates the project automatically. Answer "yes" when prompted.

You'll see:

\`\`\`
✨ Deployment complete!
https://my-site.pages.dev
\`\`\`

**Open that URL.** Your site is live.

---

## Part 4: Connect a Custom Domain (Optional)

### Ask Your Agent

\`\`\`
I want to connect a custom domain to my Cloudflare Pages site.
I [have a domain / need to buy one].
What are my options and what are the steps?
\`\`\`

**Read the response.** Your agent will explain:
- How to buy a domain through Cloudflare Registrar
- How to transfer an existing domain
- How to configure DNS

### If Buying a Domain

Ask:

\`\`\`
How do I buy a domain through Cloudflare Registrar?
What's the process and typical cost?
\`\`\`

Then:
1. In Cloudflare dashboard → **Domain Registration** → **Register Domain**
2. Search for your desired domain
3. Cloudflare charges at-cost (no markup), typically $10-15/year for .com
4. Complete purchase

### Connect to Your Site

Ask:

\`\`\`
My Cloudflare Pages project is called "my-site".
My domain is "example.com".
How do I connect them using the Cloudflare dashboard or CLI?
\`\`\`

**Reference**: [Custom Domains for Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/)

---

## Part 5: Verify Everything Works

### Ask Your Agent

\`\`\`
How do I verify my Cloudflare Pages deployment is working correctly?
What should I check?
\`\`\`

**Your checklist:**

| Check | How |
|-------|-----|
| Site loads | Visit your \`.pages.dev\` URL |
| Mobile works | Resize browser or use phone |
| HTTPS active | Look for lock icon in browser |
| Custom domain (if set) | Visit your domain |

---

## What You Just Learned

This wasn't just about deploying a website. You learned:

| Skill | Why It Matters |
|-------|----------------|
| **Prompting an agent** | You asked Gemini CLI for help at each step |
| **Reading agent output** | You understood what it told you before acting |
| **CLI-first workflow** | \`wrangler\` instead of clicking through dashboards |
| **Infrastructure ownership** | Your Cloudflare account, your domain, your control |

**This is the agentic development pattern:**
1. Describe what you want to do
2. Ask the agent for guidance
3. Read and understand the response
4. Execute the commands
5. Verify the results

---

## Troubleshooting via Agent

When something breaks, ask your agent:

\`\`\`
I ran [command] and got this error:
[paste error]

What does this mean and how do I fix it?
\`\`\`

The agent can often diagnose and solve issues faster than searching documentation.

---

## What You Have Now

- A Cloudflare account (infrastructure ownership)
- Wrangler CLI installed and authenticated
- A live site at \`your-project.pages.dev\`
- (Optional) A custom domain
- **The pattern**: Ask agent → Read output → Execute → Verify

**Next**: Submit your URL and graduate.
`,
	'capstone-graduate': `
## Graduate

You've built and deployed your site. Time to submit and move forward.

## Submit Your Site

Enter your deployed URL below:

<div class="graduation-form">
  <input type="url" placeholder="https://your-site.pages.dev" id="site-url" />
  <button onclick="submitGraduation()">Submit & Graduate</button>
</div>

<script>
function submitGraduation() {
  const url = document.getElementById('site-url').value;
  if (url && url.startsWith('http')) {
    // Store completion
    localStorage.setItem('seeing-graduated', 'true');
    localStorage.setItem('seeing-site-url', url);
    alert('Congratulations! You have graduated from Seeing.');
    window.location.href = '/seeing';
  }
}
</script>

---

## What You've Accomplished

- **Philosophy**: Learned the Subtractive Triad
- **Tools**: Gemini CLI, AI Studio, Cloudflare
- **Ownership**: Your site, your domain, your infrastructure
- **Proof**: A live URL demonstrating your work

## What Comes Next

### Dwelling (CREATE SOMETHING)

You've learned to see. Now learn to dwell.

Dwelling teaches deep tool mastery with Claude Code:
- WezTerm with Canon configuration
- Advanced CLI workflows
- System architecture
- Automated quality gates

**Requirement**: Claude Max subscription (~$100/month)

[Learn about Dwelling →](/paths)

### WORKWAY

Your site is static. WORKWAY makes it dynamic.

- Contact forms that route to your inbox
- Booking that syncs to your calendar
- Updates that post to social
- Automations that run while you sleep

**Coming soon**: [learn.workway.co](https://learn.workway.co)

---

## The Graduation Path

\`\`\`
Seeing (Free)     → Perception
    ↓
Dwelling ($100/mo) → Execution  
    ↓
WORKWAY           → Automation
\`\`\`

You've completed step one. The philosophy is yours now.

---

> "You've learned to see. Now learn to dwell."
`
};

export const load: PageServerLoad = async ({ params }) => {
	const lessonId = params.lesson as LessonId;
	const lessonIndex = SEEING_LESSONS.findIndex((l) => l.id === lessonId);

	if (lessonIndex === -1) {
		throw error(404, 'Lesson not found');
	}

	const lesson = SEEING_LESSONS[lessonIndex];
	const markdownContent = LESSON_CONTENT[lessonId];

	if (!markdownContent) {
		throw error(404, 'Lesson content not found');
	}

	// Parse markdown to HTML
	const content = await marked(markdownContent);

	// Get prev/next lessons
	const prev = lessonIndex > 0 ? SEEING_LESSONS[lessonIndex - 1] : null;
	const next = lessonIndex < SEEING_LESSONS.length - 1 ? SEEING_LESSONS[lessonIndex + 1] : null;

	return {
		lesson,
		content,
		prev,
		next,
		lessonIndex,
		totalLessons: SEEING_LESSONS.length
	};
};
