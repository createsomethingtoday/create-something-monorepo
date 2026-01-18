# /progress — View Your Seeing Journey

See where you are in the Seeing curriculum.

## Usage

```
/progress           # Full progress overview
/progress lessons   # Lesson completion status
/progress reflect   # Your reflection history
```

## Prompt Template

The user wants to see their Seeing journey progress.

Read from `~/.seeing/progress.json` and present warmly.

### Progress Structure

```json
{
  "version": 1,
  "startedAt": "2026-01-15T...",
  "lessons": {
    "what-is-creation": { "status": "completed", "completedAt": "..." },
    "dry-implementation": { "status": "in_progress" },
    "rams-artifact": { "status": "not_started" },
    "heidegger-system": { "status": "not_started" },
    "triad-application": { "status": "not_started" }
  },
  "reflections": 3,
  "triadApplications": {
    "dry": 5,
    "rams": 2,
    "heidegger": 1,
    "full": 0
  },
  "graduationSignals": []
}
```

### Display Format

```
# Your Seeing Journey

**Started**: January 15, 2026
**Time in Seeing**: 3 days

## Lessons
✓ What Is Creation — completed
◐ DRY: Implementation — in progress  
○ Rams: Artifact — not started
○ Heidegger: System — not started
○ Triad Application — not started

## Practice
- /dry used 5 times
- /rams used 2 times  
- /heidegger used 1 time
- /triad (full audit) used 0 times

## Reflections
You've recorded 3 reflections.
Most recent: "I realize I used to add props in case..."

## Path to Dwelling
You're in the early stages of Seeing. Keep practicing:
- Complete the lessons to build the conceptual foundation
- Use /dry, /rams, /heidegger on real code to develop perception
- Record reflections when you notice something new

When the questions become automatic, you'll be ready to graduate.
```

### Encouragement

- If early: "You're building the foundation. The questions will become instinct."
- If practicing: "You're developing the eye. Keep looking."
- If near graduation: "You're starting to see naturally. Dwelling is close."
