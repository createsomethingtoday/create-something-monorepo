---
title: "Breakdown and Repair"
subtitle: "Something broke. Before you fix it, ask: will this break again?
			Fixes restore function. Repairs prevent recurrence."
category: "Pattern"
published: true
publishedAt: "2025-01-08"
---



## When to Use This Pattern
Get it working again. Users need the system up.

Prevent recurrence. Update documentation and patterns.



## How It Works
When something breaks, you notice what was previously invisible. The deployment
				that "just worked" now reveals its assumptions. The config that was obvious
				turns out to have hidden dependencies.

A system that only fixes accumulates the same breakdowns. A system that repairs
				evolves its understanding. The goal isn't just to get it working—it's to make
				this class of failure impossible.

"True repair requires restructuring understanding—not just mechanical correction."


> "True repair requires restructuring understanding—not just mechanical correction."



## Real Examples

| What Broke | The Fix | The Repair |
|---|---|---|
| Route pattern missing /* | Add /* to wrangler.toml | Document in template-deployment-patterns.md |
| Fallback overwrites index | Rename to 200.html | Add to deployment checklist |
| DNS conflicts with worker | Remove wildcard record | Explain why in Canon Reflection section |



## When to Apply
- • Same failure has occurred before
- • Failure reveals unstated assumption
- • Others could hit the same issue
- • Pattern documentation exists
- • The fix was non-obvious

- • Truly one-off environmental issue
- • External dependency failure
- • Repair would be premature (still learning)
- • Cost of repair exceeds likelihood of recurrence



## The Philosophy
Heidegger called this moment—when tools stop working and become visible—Vorhandenheit("present-at-hand"). When everything works, tools recede into use (Zuhandenheit,
				"ready-to-hand"). Breakdowns reveal what was previously invisible.

Gerry Stahl applied this to software: the distinction betweenfixing(mechanical correction) andrepairing(restructuring understanding).
				Understanding moves cyclically: preunderstanding → breakdown → reinterpretation →
				revised understanding.



## Related Patterns
Breakdown interrupts dwelling. Repair enables return to transparent use.

Each breakdown-repair cycle advances understanding through the spiral.



