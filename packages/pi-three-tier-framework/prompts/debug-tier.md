---
description: Debug a system failure using the Three-Tier causality heuristic
argument-hint: "<failure description>"
---

Load the three-tier-framework skill, then apply the debugging heuristic to this failure:

**Failure**: $@

Check tiers in order. Lower-tier failures cascade upward.

```
## Three-Tier Debug: [failure]

### 1. Database (check first)
- Is the data there?
- Is it correct and fresh?
- Can it be queried successfully?
- **Finding**: [pass/fail with evidence]

### 2. Automation (check second)
- Did the tool/function execute?
- Was the right tool selected?
- Did execution complete without error?
- **Finding**: [pass/fail with evidence]

### 3. Judgment (check last)
- Was the correct policy applied?
- Were approval gates properly configured?
- Was escalation triggered when needed?
- **Finding**: [pass/fail with evidence]

### Root Cause
Tier: [Database|Automation|Judgment]
Description: ...
Fix: ...
```
