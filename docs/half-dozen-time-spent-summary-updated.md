# Time Spent Summary - Half Dozen Team (Updated)

## Project Checklist
- [ ]  Kickstand -> Venue Intelligence
- [ ]  C3 ->
    - [ ]  Viralytics
    - [ ]  Morgan Web Scraper
    - [ ]  Revivalists Chatbot
    - [ ]  Trello Agent
- [ ]  Cypress -> Outlook Integration
- [ ]  Cora / Future Proof ->
    - [ ]  Cursor Advisory
    - [ ]  General Support
- [ ]  Kosmicki -> BigQuery Project

===

## Method (exact + reproducible)

- Data source: GitHub commit history via `gh api` for scoped repositories.
- Identity filter: commits authored by the same primary identity across target repos.
- Primary identity used: `Create Something` / `micah@createsomething.io` / `createsomethingtoday`.
- Active coding day: UTC day with >=1 commit in the scoped window.
- Session split: new session when commit gap > 90 minutes.
- `session_span_h`: sum of raw in-session commit span (lower-bound coding window).
- `session_plus15_cap5_h`: `session_span_h` + 15 min per session, capped at 5h/day (constrained estimate).

## Kickstand - Venue Intelligence

| Metric | Value |
| --- | --- |
| Repo | `Half-Dozen/kickstand-monitoring` |
| Calendar span (UTC) | 2025-10-27 - 2025-11-14 |
| Active coding days | 11 |
| Total commits | 46 |
| Session span hours | **9.42 h** |
| Session+15m capped hours | **13.67 h** |

Heaviest days (UTC): 2025-11-07 (12 commits), 2025-10-27 (6 commits), 2025-11-05 (6 commits), 2025-10-28 (4 commits), 2025-10-29 (4 commits), 2025-11-04 (4 commits).

---

## C3 - Viralytics (all repos combined)

| Repo | Commits | Active days | Date range (UTC) | Session span hrs | Session+15m capped hrs |
| --- | ---: | ---: | --- | ---: | ---: |
| `createsomethingtoday/v0-viralytics` | 85 | 6 | 2025-05-02 - 2025-05-17 | 12.88 | 16.63 |
| `createsomethingtoday/shadcn_ar_tool` | 219 | 24 | 2025-05-22 - 2025-12-15 | 47.44 | 53.39 |
| `createsomethingtoday/viberate` | 6 | 1 | 2025-07-17 - 2025-07-17 | 0.3 | 0.8 |
| **Total** | **310** | **31** | **2025-05-02 - 2025-12-15** | **60.62** | **70.82** |

Heaviest days (UTC): 2025-05-17 (23 commits), 2025-06-02 (22 commits), 2025-05-22 (21 commits), 2025-06-05 (21 commits), 2025-05-13 (20 commits), 2025-05-23 (18 commits), 2025-05-15 (15 commits), 2025-05-27 (14 commits).

---

## C3 - Morgan Web Scraper

| Metric | Value |
| --- | --- |
| Repo | `createsomethingtoday/tiktok_scraper` |
| Calendar span (UTC) | 2025-05-16 (single day) |
| Total commits | 6 |
| Session span hours | **1.98 h** |
| Session+15m capped hours | **2.23 h** |

---

## C3 - Revivalists Chatbot

| Metric | Value |
| --- | --- |
| Repo | `createsomethingtoday/men-amongst-mountains` |
| Calendar span (UTC) | 2025-04-16 - 2025-05-05 |
| Active coding days | 6 |
| Total commits | 28 |
| Session span hours | **2.71 h** |
| Session+15m capped hours | **4.71 h** |

Heaviest days (UTC): 2025-04-16 (12 commits), 2025-04-24 (12 commits), 2025-04-22 (1 commit), 2025-04-23 (1 commit), 2025-04-29 (1 commit), 2025-05-05 (1 commit).

Deployment mapping: `therevivalists.halfdozen.co` -> Vercel project `men-amongst-mountains` -> GitHub repo `createsomethingtoday/men-amongst-mountains`.

---

## C3 - Trello Agent

| Metric | Value |
| --- | --- |
| Repos | `Half-Dozen/c3-management-trello` + `createsomethingtoday/c3-trello-chat` |
| Calendar span (UTC) | 2025-07-11 - 2025-07-24 |
| Active coding days | 2 |
| Total commits | 4 |
| Session span hours | **0.06 h** |
| Session+15m capped hours | **0.56 h** |

---

## Non-code Projects

- Cypress — Outlook Integration: non-code workflow in this report; no GitHub-time metric applied.
- Cora / Future Proof — Cursor Advisory: non-code workflow in this report; no GitHub-time metric applied.
- Cora / Future Proof — General Support: non-code workflow in this report; no GitHub-time metric applied.
- Kosmicki — BigQuery Project: non-code workflow in this report; no GitHub-time metric applied.

---

## Totals (code-based projects only)

| Project | Commits | Active days | Session span hrs | Session+15m capped hrs |
| --- | ---: | ---: | ---: | ---: |
| Kickstand — Venue Intelligence | 46 | 11 | 9.42 | 13.67 |
| C3 — Viralytics | 310 | 31 | 60.62 | 70.82 |
| C3 — Morgan Web Scraper | 6 | 1 | 1.98 | 2.23 |
| C3 — Revivalists Chatbot | 28 | 6 | 2.71 | 4.71 |
| C3 — Trello Agent | 4 | 2 | 0.06 | 0.56 |
| **Total tracked** | **394** | **51** | **74.79** | **91.99** |

---

## Notes

- These values are exact for the selected repositories and time windows, under a fixed session algorithm.
- GitHub commits cannot capture research/design/client communication/uncommitted local work, so real effort can be higher.
- This report intentionally replaces prior fixed "hours per week" assumptions with timestamp-derived metrics.
- Capacity context remains valid: most work occurred around full-time responsibilities with a practical weekday ceiling.
