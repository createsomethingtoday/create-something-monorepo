# FigJam Export Files

CSVs and PDF for importing into the Marketplace Agentic Architecture FigJam.

**Generated:** January 19, 2026  
**Source:** `specs/webflow-marketplace/OVERVIEW.md`

---

## Full Document (PDF)

| File | Size | Description |
|------|------|-------------|
| `OVERVIEW.pdf` | 86 KB | Complete overview with table of contents |

**Note:** Emojis (✅ 🔮 ⚠️) may not render in PDF. The diagrams and text are intact.

---

## CSV Tables

| # | File | Description | Rows |
|---|------|-------------|------|
| 01 | `01-team.csv` | Joey & Micah roles and skills | 2 |
| 02 | `02-framework-decision-matrix.csv` | When to use agents vs rules/automation | 6 |
| 03 | `03-volume-december-2025.csv` | Asset submission metrics | 7 |
| 04 | `04-existing-systems.csv` | Current systems with owners | 8 |
| 05 | `05-existing-agents.csv` | Agents currently running | 2 |
| 06 | `06-agent-opportunities.csv` | P1/P2/P3 opportunities | 9 |
| 07 | `07-technology-stack.csv` | Confirmed tech stack | 6 |
| 08 | `08-implementation-phases.csv` | 4-phase rollout plan | 4 |
| 09 | `09-research-insights.csv` | Key findings from Perplexity | 7 |
| 10 | `10-tooling-options.csv` | Zapier vs repo-based options | 4 |
| 11 | `11-action-items.csv` | All tasks with status | 15 |
| 12 | `12-success-metrics.csv` | KPIs with targets | 4 |
| 13 | `13-dev-environment-tools.csv` | Claude Code, Cursor, etc. | 6 |
| 14 | `14-hosting-options.csv` | Modal, CF Workers, etc. | 4 |
| 15 | `15-alternative-systems.csv` | Joey's framework: alternatives to agents | 8 |

---

## How to Import into FigJam

1. Open FigJam
2. Drag and drop a CSV file onto the canvas
3. FigJam will create a table automatically
4. Resize/style as needed
5. Repeat for each CSV

---

## Suggested FigJam Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                  │
│  01-team.csv                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│      CURRENT STATE          │  │      FRAMEWORK              │
│  03-volume-december-2025    │  │  02-framework-decision      │
│  04-existing-systems        │  │  10-tooling-options         │
│  05-existing-agents         │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│      OPPORTUNITIES          │  │      TECH STACK             │
│  06-agent-opportunities     │  │  07-technology-stack        │
│  09-research-insights       │  │  13-dev-environment-tools   │
│                             │  │  14-hosting-options         │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      IMPLEMENTATION                             │
│  08-implementation-phases                                       │
│  11-action-items                                                │
│  12-success-metrics                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Re-generating

To regenerate these CSVs after updating `OVERVIEW.md`, ask the agent to export tables again.
