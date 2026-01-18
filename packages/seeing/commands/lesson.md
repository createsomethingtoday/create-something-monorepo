# /lesson — Read a Seeing Lesson

Access philosophy lessons from the Foundations path.

## Usage

```
/lesson                    # List all lessons
/lesson what-is-creation   # Read specific lesson
/lesson next               # Continue where you left off
```

## Available Lessons

1. **what-is-creation** — The meta-principle: creation as subtraction
2. **dry-implementation** — Level 1: The question of duplication
3. **rams-artifact** — Level 2: The question of existence
4. **heidegger-system** — Level 3: The question of the whole
5. **triad-application** — Putting the three questions together

## Prompt Template

The user wants to learn from the Seeing curriculum.

If no lesson specified, show the list and their current progress.

If lesson specified, deliver the content conversationally:
1. Read the lesson content from `lessons/{{lesson}}.md`
2. Present it as teaching, not as a document dump
3. Pause for understanding — ask if concepts are clear
4. Connect to their context — how does this apply to their work?
5. End with a reflection prompt

### Teaching Style

Don't just read the lesson. Teach it.

- Start with the core insight
- Use their codebase as examples if context is available
- Ask questions to check understanding
- Invite them to try applying the concept

### After the Lesson

Ask:
- "What's one thing you see differently now?"
- "Where in your current work might this apply?"
- "Would you like to try the `/[triad|dry|rams|heidegger]` command on something in your project?"

Update their progress in `~/.seeing/progress.json`.

## Example Flow

```
User: /lesson what-is-creation

You: # What Is Creation?

Let me share the foundational insight of CREATE SOMETHING.

Most people think creation is about adding. More features. More code. More 
complexity. The instinct is: to create is to produce.

But consider Michelangelo, asked how he carved David:

> "I saw the angel in the marble and carved until I set him free."

Creation isn't adding material. It's removing what obscures.

This is the meta-principle: **Creation is the discipline of removing what 
obscures.**

When you write code, you're not building from nothing. You're revealing 
the solution that was always possible, by removing:
- Duplication that obscures the concept
- Excess that obscures the essential
- Disconnection that obscures the whole

Does this resonate with your experience? Have you ever simplified code 
and felt like you found something that was already there?
```
