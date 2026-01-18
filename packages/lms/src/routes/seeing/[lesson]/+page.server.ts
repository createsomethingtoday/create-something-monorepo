import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

// Import interactive lesson data
import whatIsCreationJson from '$lib/content/lessons/seeing/what-is-creation.json';

// Interactive lessons registry
const INTERACTIVE_LESSONS: Record<string, unknown> = {
	'what-is-creation': whatIsCreationJson
};

// Lesson metadata - matches the seeing package
const SEEING_LESSONS = [
	{
		id: 'what-is-creation',
		title: 'What Is Creation?',
		description: 'The meta-principle: creation as the discipline of removing what obscures.',
		duration: '10 min',
		interactive: true
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
	}
] as const;

type LessonId = (typeof SEEING_LESSONS)[number]['id'];

// Lesson content - embedded for now, could be moved to @createsomething/seeing package
const LESSON_CONTENT: Record<LessonId, string> = {
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

You've completed the Seeing curriculum.

**What comes next?**

Keep seeing. Use the triad on real work. Let the questions become instinct.

When the questions are automatic, you're ready for Dwelling.

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
	
	// Check for interactive lesson data
	const interactiveData = INTERACTIVE_LESSONS[lessonId];
	const isInteractive = !!interactiveData;
	
	let content = '';
	if (!isInteractive) {
		// Fall back to markdown content
		const markdownContent = LESSON_CONTENT[lessonId];
		if (!markdownContent) {
			throw error(404, 'Lesson content not found');
		}
		content = await marked(markdownContent);
	}

	// Get prev/next lessons
	const prev = lessonIndex > 0 ? SEEING_LESSONS[lessonIndex - 1] : null;
	const next = lessonIndex < SEEING_LESSONS.length - 1 ? SEEING_LESSONS[lessonIndex + 1] : null;

	return {
		lesson,
		content,
		prev,
		next,
		lessonIndex,
		totalLessons: SEEING_LESSONS.length,
		interactive: isInteractive,
		interactiveData: interactiveData ?? null
	};
};
