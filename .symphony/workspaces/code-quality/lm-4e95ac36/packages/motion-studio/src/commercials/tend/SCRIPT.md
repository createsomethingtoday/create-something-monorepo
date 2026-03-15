# SCRIPT.md — TEND COMMERCIAL

## Visual Narrative (No Voiceover)

**Duration**: 60 seconds
**Style**: Wireframe → Styled transitions (unconcealment)
**Product**: TEND - createsomething.agency/tend

---

## The Story Without Words

The commercial tells a story through visual transformation alone. Each component emerges from abstract wireframe placeholders into meaningful, styled UI. This mirrors how understanding emerges from confusion.

**The Arc**:
1. **Fragmentation** → 2. **Unity** → 3. **Automation** → 4. **Human Focus** → 5. **Payoff** → 6. **Brand**

---

## Scene Breakdown

### Scene 1: Sources Grid (0-12s)

**Story beat**: "Here are your scattered systems"

**Visual**:
- 2x4 grid of source cards
- Cards enter as wireframe placeholders (gray rectangles)
- One by one, wireframes resolve into styled cards with icons
- All show "disconnected" status (gray badges)
- Subtle pulse on badges suggests incompleteness

**Timing**:
- 0-60: Wireframe cards cascade in
- 60-180: Embodiment cascade (wireframe → styled)
- 180-360: Hold, showing fragmented state

**Emotional tone**: Overwhelm, fragmentation

---

### Scene 2: Connection (12-21s)

**Story beat**: "Now they're unified"

**Visual**:
- Same grid of sources
- Status badges animate: gray → amber glow → green checkmark
- First 4 sources connect slowly (individual attention)
- Last 4 connect in rapid cascade (momentum building)
- Subtle synchronized pulse when all connected

**Timing**:
- 0-135: Slow connection cascade
- 135-200: Rapid connection cascade
- 200-270: All connected, breathing together

**Emotional tone**: Resolution, unity

---

### Scene 3: Activity Feed (21-33s)

**Story beat**: "Automation is working"

**Visual**:
- Split layout: partial inbox (left), activity feed (right)
- Feed panel slides in
- Activity items appear as wireframe lines
- Lines resolve into styled entries one by one
- Counter in corner: "89 today" incrementing

**Activity examples**:
- "Verified insurance for Johnson, M."
- "Sent confirmation reminder"
- "Processed incoming call"
- "Recall text delivered"

**Timing**:
- 0-45: Feed panel slides in
- 45-300: Activity items cascade (wireframe → styled)
- 300-360: Counter reveals

**Emotional tone**: Busy, productive, hands-off

---

### Scene 4: Inbox Triage (33-48s)

**Story beat**: "Here's what needs you"

**Visual**:
- Full inbox table
- Table enters as wireframe (gray rectangles)
- Resolves into styled rows with icons, scores, titles
- Focus ring appears on first item
- Keyboard hints appear at bottom

**Keyboard sequence**:
- `j` pressed → focus moves down
- `j` pressed → focus moves again
- `a` pressed → item slides out with green flash (approved)
- `d` pressed → item fades out (dismissed)
- `s` pressed → item slides with amber (snoozed)

**Final state**: Empty inbox with "Nothing urgent. Automations handled the rest."

**Timing**:
- 0-120: Table embodiment (wireframe → styled)
- 120-150: First focus
- 150-330: Key sequence
- 330-450: Empty state reveal

**Emotional tone**: Control, efficiency, calm

---

### Scene 5: Metrics (48-54s)

**Story beat**: "This is the result"

**Visual**:
- 3 metric cards centered
- Cards enter as wireframe placeholders
- Resolve into styled cards with large numbers
- Numbers count up from 0

**Metrics**:
1. **89** — Automations handled (green tint)
2. **12** — Items for you (white)
3. **94%** — On time today (green tint)

**Timing**:
- 0-30: Wireframe cards spring in
- 30-60: Embodiment cascade
- 60-150: Counter animations
- 150-180: Hold

**Emotional tone**: Satisfaction, payoff

---

### Scene 6: Close (54-60s)

**Story beat**: "TEND"

**Visual**:
- Centered composition
- Wireframe blocks fade in
- Logo block resolves to "TEND" text
- Tagline line resolves to "Tend to what matters."
- URL fades in below

**Content**:
- Logo: "TEND" (JetBrains Mono, 64px)
- Tagline: "Tend to what matters."
- URL: createsomething.agency/tend

**Timing**:
- 0-30: Wireframe entrance
- 30-75: Logo embodiment
- 75-120: Tagline embodiment
- 120-180: Hold with URL

**Emotional tone**: Confidence, simplicity

---

## Visual Principles

### Wireframe Aesthetic
- Gray fill: `rgba(255, 255, 255, 0.15)`
- No icons, just shapes
- Rounded rectangles for cards
- Horizontal bars for text
- Circles for badges/icons

### Embodiment Transition
- Duration: 45 frames (~1.5s)
- Interpolation: Linear with ease
- Icons fade in first (0-0.6)
- Text fades in later (0.3-0.8)
- Background gains opacity throughout

### Pacing
- Slower transitions for important moments
- Faster cascades for "automation happening"
- Holds for contemplation
- No rush — calm is the message

---

## Technical Notes

- **FPS**: 30
- **Duration**: 1800 frames (60s)
- **Resolution**: 1920x1080
- **Vox Treatment**: Posterize 15fps, grain 0.04, vignette 0.2
- **Colors**: Canon monochrome (black bg, white text, green/amber accents)
- **Fonts**: System sans + JetBrains Mono

---

## Key Message

The interface reveals its meaning through use. The wireframe → styled transition IS the story of understanding emerging. By the end, the viewer understands not just what TEND does, but how it feels to use it: calm, in control, tending to what matters.
