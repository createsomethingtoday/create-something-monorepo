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
## What You'll Need

- A terminal (any terminal works—we'll refine this in Dwelling)
- A Google account (for Gemini CLI authentication)
- 5 minutes

## Step 1: Install Gemini CLI

Gemini CLI is Google's AI coding agent. It runs in your terminal and provides a conversational interface for building and learning.

Visit [Google AI Studio](https://aistudio.google.com/) and follow the setup instructions to enable Gemini in your terminal. The installation typically involves:

1. Signing in with your Google account
2. Installing the CLI tool (method varies by platform)
3. Authenticating via browser

**What you're installing**: An AI assistant that helps you write code, answer questions, and practice the Subtractive Triad on real projects.

## Step 2: Authenticate

\`\`\`bash
gemini auth login
\`\`\`

This opens a browser window. Sign in with your Google account.

## Step 3: Install the Seeing Extension

The Seeing extension gives Gemini CLI context about the Subtractive Triad and provides practice commands.

\`\`\`bash
gemini extension install @createsomething/seeing
\`\`\`

## Step 4: Verify

Start a new Gemini CLI session and run:

\`\`\`bash
/lesson what-is-creation
\`\`\`

If you see the lesson content, you're ready.

---

## What's Different About This

Most tutorials have you configure everything perfectly before starting. We're doing the opposite.

**Seeing uses the terminal you already have.** Any terminal works. The philosophy doesn't require a specific environment.

When you graduate to Dwelling, we'll refine your setup—WezTerm with Canon colors, keyboard-driven workflows, tools that disappear into use. But that comes later.

For now: a working Gemini CLI is enough.

---

## Troubleshooting

**"Command not found"** — Make sure npm's global bin directory is in your PATH.

**Authentication fails** — Try \`gemini auth logout\` then \`gemini auth login\` again.

**Extension not found** — The extension may not be published yet. You can still read the lessons here on the web and practice the concepts manually.

---

## Ready

You have a terminal. You have Gemini CLI. You have the Seeing extension.

Now let's learn what creation actually is.
`,
	'what-is-creation': `
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

---

## Reflection

Before moving on, sit with this:

**What's one thing in your current codebase that's obscured by duplication, excess, or disconnection?**

Don't fix it yet. Just see it.

Seeing comes before doing. That's why we're here.
`,
	'dry-implementation': `
## Level 1 of the Subtractive Triad

**Question**: "Have I built this before?"  
**Action**: Unify

This is the first question because it's the fastest filter. Either the code exists or it doesn't. Either you're duplicating or you're not.

## What DRY Really Means

DRY stands for "Don't Repeat Yourself." But it's commonly misunderstood.

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

This is wrong. These aren't duplicated knowledge. They're three different concepts that happen to have the same value.

### Good DRY

\`\`\`typescript
// The design system defines blue:
const colors = { blue: { 500: '#3b82f6' } };

// Components use the token:
const buttonStyles = { bg: colors.blue[500] };
const linkStyles = { color: colors.blue[500] };
\`\`\`

Now there's one authoritative representation of "blue-500". That's DRY.

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

Not all repetition is duplication. Sometimes similar code serves different purposes.

**The test**: If one changes, must the other change? If yes, unify. If no, leave separate.

---

## Reflection

The DRY question becomes instinct when you ask it before writing, not after.

**What would change if you asked "Have I built this before?" every time you started typing?**
`,
	'rams-artifact': `
## Level 2 of the Subtractive Triad

**Question**: "Does this earn its existence?"  
**Action**: Remove

Named for Dieter Rams, the legendary designer whose principle was:

**Weniger, aber besser** — Less, but better.

## The Rams Standard

Rams designed products for Braun that were revolutionary in their simplicity. Every button, every line, every element had to justify itself. If it didn't serve the essential purpose, it was removed.

This isn't minimalism for aesthetics. It's minimalism for function. Every element that doesn't earn its place actively harms the product by obscuring what matters.

## The Question in Practice

After you've checked for duplication (DRY), ask: **"Does this earn its existence?"**

This applies to:

### Features
Does this feature serve a real need, or an imagined one?
- "Users might want to..." → They haven't asked. Wait.
- "It would be cool if..." → Cool isn't useful. Remove.

### Parameters
Does this parameter justify its complexity?
- Props with defaults that never change → Remove the prop
- Options that are always the same value → Make it a constant

### Code
Does this code earn its lines?
- Abstractions with one implementation → Inline them
- Comments that describe what code already says → Remove them

## The Existence Test

For anything you're about to add, ask:

1. **What happens if I don't add this?**
2. **Who asked for this?**
3. **When was this last needed?**
4. **What's the simplest version?**

---

## Reflection

The Rams question challenges our instinct to add. Building feels productive. Removing feels like giving up.

But removal is creation. Every feature you don't build is time for features that matter.

**What would you remove from your current project if you had to justify every feature's existence?**
`,
	'heidegger-system': `
## Level 3 of the Subtractive Triad

**Question**: "Does this serve the whole?"  
**Action**: Reconnect

This is the deepest level. DRY looks at implementation. Rams looks at artifacts. Heidegger looks at systems.

## The Hermeneutic Circle

Heidegger's key insight: **You understand the parts through the whole, and the whole through the parts.**

Reading a sentence: You understand words through the sentence's meaning, and the sentence's meaning through the words. Neither comes first. Understanding spirals between them.

The same applies to systems. You understand a function through the system it serves, and the system through its functions.

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

## Reflection

The Heidegger question is the hardest because it requires perspective.

**What is the "whole" that your current project serves? Can you articulate it clearly?**
`,
	'triad-application': `
## The Three Questions Together

You've learned the three levels separately. Now you use them together.

**The Subtractive Triad is a decision framework.** For any technical choice, ask three questions in sequence:

1. **DRY** (Implementation) → "Have I built this before?"
2. **Rams** (Artifact) → "Does this earn its existence?"
3. **Heidegger** (System) → "Does this serve the whole?"

## Why This Order?

**DRY is fastest** — You either have the code or you don't.  
**Rams requires judgment** — You must evaluate need vs. excess.  
**Heidegger is deepest** — You must understand the whole system.

Start shallow, spiral deeper.

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

## Mastery

You've mastered the triad when:

1. **The questions are unconscious** — You ask them without thinking
2. **You catch issues early** — Problems surface during design
3. **You spiral naturally** — Moving between levels feels fluid

---

## The Journey Ahead

You've learned the philosophy. Now it's time to apply it.

**Next: The Capstone Project**

You'll design, build, and deploy your own site—applying the Triad to every decision. When you ship it, you'll be ready to graduate.
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

You have a design. Now let's make it real with Gemini CLI assistance.

## Step 1: Create Your Project Folder

Open your terminal:

\`\`\`bash
mkdir my-site
cd my-site
\`\`\`

## Step 2: Create Your Files

Create the HTML file:

\`\`\`bash
touch index.html
\`\`\`

Paste your design from the previous lesson into \`index.html\`.

## Step 3: Use Gemini CLI to Refine

Start Gemini CLI and ask it to review your code:

\`\`\`
Review this HTML for:
1. Duplication (DRY)
2. Excess elements (Rams)
3. Proper structure (Heidegger)

Suggest specific improvements.
\`\`\`

Paste your HTML and let Gemini analyze it.

## Step 4: Add What Earns Its Place

Maybe you want:
- A favicon
- Meta description for SEO
- Open Graph tags for social sharing

Ask Gemini CLI to add only what's necessary:

\`\`\`
Add the minimum meta tags needed for:
- Search engine visibility
- Social media sharing

Nothing decorative. Only functional.
\`\`\`

## Step 5: Test Locally

You can preview your site without any build tools:

\`\`\`bash
# If you have Python
python -m http.server 8000

# Or use npx
npx serve .
\`\`\`

Open \`http://localhost:8000\` in your browser.

## Step 6: Final Triad Audit

Before deploying, one final check:

| Question | Check |
|----------|-------|
| **DRY** | Is anything repeated that could be unified? |
| **Rams** | Does every line of code earn its place? |
| **Heidegger** | Does this serve your goal of professional presence? |

If something doesn't pass, remove it.

---

## Your File Structure

\`\`\`
my-site/
└── index.html
\`\`\`

That's it. One file. If you need images, add an \`images/\` folder. But only if you need images.

---

## What You Have Now

- A working site on your local machine
- Code reviewed through the Triad
- Ready for deployment

**Next**: Deploy to Cloudflare Pages.
`,
	'capstone-deploy': `
## Deploy to Cloudflare Pages

Your site is ready. Let's put it on the internet.

## Step 1: Create a Cloudflare Account

If you don't have one:
1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up (free)
3. Verify your email

## Step 2: Install Wrangler

Wrangler is Cloudflare's CLI tool:

\`\`\`bash
npm install -g wrangler
\`\`\`

Authenticate:

\`\`\`bash
wrangler login
\`\`\`

This opens a browser to connect your Cloudflare account.

## Step 3: Deploy

From your project folder:

\`\`\`bash
wrangler pages deploy . --project-name=my-site
\`\`\`

**First time?** Wrangler will create the project for you.

You'll see output like:

\`\`\`
✨ Deployment complete!
https://my-site.pages.dev
\`\`\`

**Your site is live.**

## Step 4: Verify

Open the URL in your browser. You should see your site.

Test on mobile too—resize your browser or use your phone.

## Step 5: Connect a Domain (Optional)

If you have a domain (or want to buy one):

1. In Cloudflare dashboard, go to **Pages** → **your project** → **Custom domains**
2. Add your domain
3. Cloudflare guides you through DNS setup

If buying a domain:
- Cloudflare Registrar has competitive prices
- No markup, wholesale cost
- Easy DNS integration

## What You Just Learned

| Skill | What You Did |
|-------|--------------|
| **CLI deployment** | \`wrangler pages deploy\` |
| **Cloud hosting** | Cloudflare Pages (free tier) |
| **Domain management** | Custom domain setup |
| **Ownership** | You control the infrastructure |

This is the foundation. Everything else—forms, databases, automations—builds on this.

---

## Troubleshooting

**"Not logged in"** — Run \`wrangler login\` again.

**"Project not found"** — Let wrangler create it, or create manually in Cloudflare dashboard.

**"Build failed"** — For static HTML, no build is needed. Make sure you're deploying from the right folder.

---

## What You Have Now

- A live site at \`your-project.pages.dev\`
- (Optional) A custom domain
- Infrastructure you own and control

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
