---
category: "Canon"
section: "Guidelines"
title: "Content"
description: "Content guidelines for writing clear, consistent copy in the Canon design system."
lead: "Write like you speak. Be direct, be helpful, be human. Every word should earn its place."
publishedAt: "2026-01-08"
published: true
---

## Voice Principles

### Be Direct

Say what you mean. No filler words, no corporate speak.

| Don't | Do |
|-------|-----|
| "In order to" | "To" |
| "At this point in time" | "Now" |
| "Due to the fact that" | "Because" |
| "It is important to note that" | (Just state it) |

### Be Helpful

Guide users toward success. Answer the question they're asking.

| Don't | Do |
|-------|-----|
| "Invalid input" | "Enter a valid email address" |
| "Error occurred" | "Couldn't save. Check your connection." |
| "Access denied" | "You need editor permissions to do this" |

### Be Human

Write like a colleague, not a robot.

| Don't | Do |
|-------|-----|
| "The operation was successful" | "Done!" |
| "Please wait while processing" | "Working on it..." |
| "Terminate session" | "Sign out" |

## Capitalization

### Sentence case

Use for most UI text:
- Button labels
- Form labels
- Menu items
- Tooltips

**Example:** "Save changes" not "Save Changes"

### Title case

Reserve for:
- Page titles
- Section headings
- Product names

## Error Messages

Good error messages have three parts:

1. **What happened** - State the problem clearly
2. **Why it happened** - If helpful, explain the cause
3. **What to do** - Give a clear next step

```
✗ Error 500
✓ Couldn't save your changes. Our servers are having trouble. Try again in a few minutes.
```

## Buttons

Use verbs. Be specific.

| Don't | Do |
|-------|-----|
| "OK" | "Save" |
| "Submit" | "Send message" |
| "Yes" | "Delete account" |
| "Cancel" | "Keep editing" |

## Empty States

Don't just say "nothing here." Help users take action.

```
No projects yet

Projects you create will appear here.
[Create your first project]
```

## Loading States

Tell users what's happening.

| Context | Message |
|---------|---------|
| Saving | "Saving..." |
| Loading data | "Loading your projects..." |
| Processing | "Generating report..." |
| Long wait | "This might take a minute..." |

## Numbers and Dates

- Use numerals: "3 items" not "three items"
- Relative dates when recent: "2 hours ago"
- Absolute dates when older: "Jan 15, 2026"
- Abbreviate large numbers: "1.2K" not "1,234"
