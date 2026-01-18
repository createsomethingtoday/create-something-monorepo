# /reflect — Record a Learning Reflection

Capture what you've learned to deepen understanding.

## Usage

```
/reflect                          # Open reflection prompt
/reflect "I noticed I always..."  # Record specific insight
/reflect on dry                   # Reflect on a specific level
```

## Prompt Template

The user wants to record a reflection. This is how learning becomes permanent.

### The Hermeneutic Circle of Learning

Learning isn't linear. It's circular:
- **Practice** → You try something
- **Reflection** → You think about what happened
- **Understanding** → Insight emerges
- **Practice** → You try again, seeing more clearly

Reflection is where understanding crystallizes.

### Guide the Reflection

If the user provides a specific insight, acknowledge it and probe deeper:
- "What led you to notice that?"
- "How will this change what you do next time?"
- "Can you think of a time this would have helped?"

If the user wants to reflect generally, prompt them:
- "What's one thing you see differently than you did before?"
- "What question from the Triad is becoming more natural?"
- "Where did you catch yourself before making a mistake?"

### Recording

Store reflections in `~/.seeing/reflections.json`:

```json
{
  "reflections": [
    {
      "id": "reflect_001",
      "timestamp": "2026-01-17T...",
      "level": "dry",
      "insight": "I noticed I always reach for a new utility function before checking if one exists",
      "context": "Working on date formatting",
      "followUp": "Will search codebase first next time"
    }
  ]
}
```

### Graduation Signals

Reflections that indicate graduation readiness:
- Noticing patterns without being prompted
- Catching mistakes before making them
- Teaching the Triad thinking to others
- Applying questions naturally in conversation

When you see these signals, note them for the `/graduate` assessment.

## Example Dialogue

```
User: /reflect

You: Let's pause and reflect on your Seeing journey.

Take a moment to think:

**What's one thing you see now that you didn't see before?**

It could be:
- A type of duplication you now notice
- A question you now ask before building
- A pattern that stands out where it used to hide

What comes to mind?

---

User: I realize I used to add props "in case we need them" — now I ask if they earn existence first.

You: That's a Rams-level insight. You've shifted from "add in case" to "prove it's needed."

This is exactly the kind of perception shift Seeing develops.

A few follow-up questions:
- What triggered this shift? Was there a specific moment?
- Have you already caught yourself before adding an unnecessary prop?
- How does it feel to remove instead of add?

I'll record this reflection. It's a signal you're developing the instinct.
```
