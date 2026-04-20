# Abundance Network: System Documentation

**Version:** 1.2.0
**Prepared for:** Half Dozen
**Prepared by:** CREATE SOMETHING Agency
**Date:** April 2026

---

## Executive Summary

Abundance Network is a creative matching platform that connects **Seekers** (clients looking for creative work) with **Talent** (creatives offering services). The system uses intelligent matching based on skills, budget, and availability to suggest optimal pairings.

**Key Features:**

- Phone number-based identity (WhatsApp-ready)
- Intelligent fit scoring algorithm
- [Hermeneutic spiral](/canon/concepts/hermeneutic-circle) design (returning users experience streamlined "delta" intake)
- GPT-ready API via OpenAPI specification
- Real-time availability matching
- Inbound job intake queue with dedupe, operator review, and CSV export

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ABUNDANCE NETWORK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────────────────┐    │
│   │ WhatsApp │────▶│   GPT    │────▶│  Abundance API       │    │
│   │  User    │     │ (Actions)│     │  createsomething.    │    │
│   └──────────┘     └──────────┘     │  agency/api/abundance│    │
│                                      └──────────┬───────────┘    │
│                                                  │               │
│                                      ┌───────────▼───────────┐   │
│                                      │    Cloudflare D1      │   │
│                                      │    (SQLite Edge)      │   │
│                                      └───────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Technology Stack:**

- **Runtime:** Cloudflare Workers (edge-native, <100ms latency)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **API Framework:** SvelteKit
- **Integration:** OpenAPI 3.1 specification for GPT Actions

---

## Core Concepts

### Seekers

People or brands looking for creative services.

| Field                | Type    | Description                                           |
| -------------------- | ------- | ----------------------------------------------------- |
| `id`                 | string  | Unique identifier                                     |
| `phone`              | string  | WhatsApp phone number (unique)                        |
| `name`               | string  | Contact name                                          |
| `email`              | string  | Email address (optional)                              |
| `brand_name`         | string  | Brand or project name                                 |
| `brand_vibe`         | string  | Style tags (e.g., "colorful, spiritual, rave")        |
| `website`            | string  | Brand website                                         |
| `typical_budget_min` | integer | Usual minimum budget (USD)                            |
| `typical_budget_max` | integer | Usual maximum budget (USD)                            |
| `preferred_formats`  | array   | Preferred deliverables (e.g., ["cover_art", "merch"]) |
| `readiness_score`    | integer | 0-100 readiness indicator                             |
| `status`             | string  | "active", "inactive", or "onboarding"                 |

### Talent

Creatives offering services.

| Field             | Type    | Description                                             |
| ----------------- | ------- | ------------------------------------------------------- |
| `id`              | string  | Unique identifier                                       |
| `phone`           | string  | WhatsApp phone number (unique)                          |
| `name`            | string  | Creative's name                                         |
| `email`           | string  | Email address (optional)                                |
| `portfolio_url`   | string  | Portfolio link                                          |
| `instagram`       | string  | Instagram handle                                        |
| `skills`          | array   | Skills offered (e.g., ["illustration", "3d", "motion"]) |
| `styles`          | array   | Aesthetic styles (e.g., ["psychedelic", "minimal"])     |
| `hourly_rate_min` | integer | Minimum hourly rate (USD)                               |
| `hourly_rate_max` | integer | Maximum hourly rate (USD)                               |
| `availability`    | string  | "available", "busy", or "unavailable"                   |
| `timezone`        | string  | Timezone identifier                                     |
| `abundance_index` | integer | 0-100 capability indicator                              |
| `status`          | string  | "active", "inactive", or "onboarding"                   |

### Matches

Suggested pairings between Seekers and Talent for specific jobs.

| Field             | Type    | Description                  |
| ----------------- | ------- | ---------------------------- |
| `id`              | string  | Unique identifier            |
| `seeker_id`       | string  | Reference to Seeker          |
| `talent_id`       | string  | Reference to Talent          |
| `job_title`       | string  | Brief job title              |
| `job_description` | string  | Detailed description         |
| `deliverables`    | array   | Specific deliverables needed |
| `budget`          | integer | Job budget (USD)             |
| `deadline`        | string  | Due date                     |
| `fit_score`       | integer | 0-100 match quality score    |
| `fit_breakdown`   | object  | Score components             |
| `status`          | string  | Match status (see below)     |

**Match Status Flow:**

```
suggested → accepted → in_progress → completed
    │           │
    └→ declined └→ cancelled
```

### Inbound Jobs

Operator-reviewed job records surfaced by agents before they become qualified staffing opportunities.

| Field             | Type          | Description                                                |
| ----------------- | ------------- | ---------------------------------------------------------- |
| `id`              | string        | Unique identifier                                          |
| `source_agent`    | string        | Primary agent that surfaced the job                        |
| `source_agents`   | array         | All agents that have seen the same job                     |
| `source_run_id`   | string        | Optional run or batch ID                                   |
| `source_system`   | string        | Source board or upstream system                            |
| `external_job_id` | string        | Upstream posting ID                                        |
| `job_url`         | string        | Canonical job posting URL                                  |
| `employer`        | string        | Facility or employer name                                  |
| `location`        | string        | Job geography                                              |
| `title`           | string        | Job title                                                  |
| `status`          | string        | `new`, `reviewing`, `qualified`, `rejected`, or `archived` |
| `dedupe_key`      | string        | Stable dedupe fingerprint                                  |
| `raw_payload`     | object/string | Original agent payload                                     |
| `notes`           | string        | Operator notes                                             |
| `seen_count`      | integer       | Number of duplicate sightings                              |
| `ingested_at`     | string        | Initial ingest timestamp                                   |
| `last_seen_at`    | string        | Most recent duplicate sighting                             |
| `reviewed_at`     | string        | First non-`new` review timestamp                           |

---

## Matching Algorithm

The fit score determines how well a Talent matches a job request.

### Formula

```
Fit Score = (Skills × 0.4) + (Budget × 0.3) + (Availability × 0.3)
```

### Components

**Skills Match (40% weight)**

- Compares required skills against Talent's skill set
- Exact matches score 100
- Partial matches scale proportionally
- No matches score 20 (base)

**Budget Match (30% weight)**

- Compares job budget against Talent's rate range
- Within range: 100
- Below range: scaled down
- Above range: slight penalty (Talent may stretch)

**Availability (30% weight)**

- Available: 100
- Busy: 50
- Unavailable: 10

### Example

```json
{
  "fit_score": 88,
  "fit_breakdown": {
    "skills": 100, // Perfect skill match
    "budget": 60, // Budget slightly below rate
    "availability": 100 // Talent available
  }
}
```

---

## API Reference

**Base URL:** `https://createsomething.agency/api/abundance`

### Seekers

#### Create Seeker

```http
POST /seekers
Content-Type: application/json

{
  "phone": "+1234567890",
  "name": "Client Name",
  "brand_name": "Brand Name",
  "brand_vibe": "colorful, electronic, spiritual"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "phone": "+1234567890",
    "name": "Client Name",
    "brand_name": "Brand Name",
    "brand_vibe": "colorful, electronic, spiritual",
    "readiness_score": 50,
    "status": "active",
    "created_at": "2025-12-02T22:34:59Z"
  }
}
```

#### Get Seeker by Phone

```http
GET /seekers?phone=+1234567890
```

#### Update Seeker

```http
PATCH /seekers/{id}
Content-Type: application/json

{
  "brand_vibe": "updated vibe tags",
  "typical_budget_max": 2000
}
```

---

### Talent

#### Create Talent

```http
POST /talent
Content-Type: application/json

{
  "phone": "+0987654321",
  "name": "Creative Name",
  "skills": ["illustration", "cover_art", "motion"],
  "styles": ["psychedelic", "colorful"],
  "hourly_rate_min": 50,
  "hourly_rate_max": 150,
  "availability": "available"
}
```

#### List Available Talent

```http
GET /talent?availability=available&skill=illustration
```

#### Update Talent Availability

```http
PATCH /talent/{id}
Content-Type: application/json

{
  "availability": "busy"
}
```

---

### Matching

#### Find Matches for a Job

```http
POST /match
Content-Type: application/json

{
  "seeker_id": "abc123",
  "job_title": "Album Cover Design",
  "job_description": "Psychedelic cover art for electronic EP",
  "required_skills": ["illustration", "cover_art"],
  "budget": 800,
  "deadline": "2025-01-15"
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "match": {
        "id": "match123",
        "seeker_id": "abc123",
        "talent_id": "xyz789",
        "job_title": "Album Cover Design",
        "fit_score": 88,
        "fit_breakdown": {
          "skills": 100,
          "budget": 60,
          "availability": 100
        },
        "status": "suggested"
      },
      "talent": {
        "id": "xyz789",
        "name": "Creative Name",
        "skills": ["illustration", "cover_art", "motion"],
        "availability": "available"
      }
    }
  ],
  "total": 1
}
```

#### Accept a Match

```http
PATCH /match/{id}
Content-Type: application/json

{
  "status": "accepted"
}
```

#### Complete with Feedback

```http
PATCH /match/{id}
Content-Type: application/json

{
  "status": "completed",
  "seeker_rating": 5,
  "seeker_feedback": "Excellent work, delivered on time!"
}
```

---

### WhatsApp Webhook

#### Webhook Verification (Meta requirement)

```http
GET /whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

#### Receive Messages

```http
POST /whatsapp
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [...]
}
```

The webhook automatically:

1. Identifies users by phone number
2. Creates new users in "onboarding" status if unknown
3. Stores conversation history for context
4. Returns processed message data for GPT handling

---

### User Type Conversion

When a user contacts via WhatsApp, they're automatically created as a Seeker. If the conversation reveals they're actually a Talent, use the convert endpoint.

#### Convert User Type

```http
POST /convert
Content-Type: application/json

{
  "phone": "+1234567890",
  "target_type": "talent",
  "skills": ["illustration", "motion"],
  "styles": ["psychedelic"],
  "hourly_rate_min": 50,
  "hourly_rate_max": 150,
  "availability": "available"
}
```

**Converting to Talent requires:**

- `skills` array (required)
- `styles` array (optional)
- `hourly_rate_min` / `hourly_rate_max` (optional)
- `availability` (optional, defaults to "available")

**Converting to Seeker requires:**

- `brand_name` (optional)
- `brand_vibe` (optional)
- `typical_budget_min` / `typical_budget_max` (optional)
- `preferred_formats` array (optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "xyz789",
    "phone": "+1234567890",
    "name": "Creative Name",
    "skills": ["illustration", "motion"],
    "styles": ["psychedelic"],
    "availability": "available",
    "status": "active"
  },
  "message": "Converted to talent successfully"
}
```

**Use Case:**

1. User messages via WhatsApp → auto-created as Seeker
2. GPT conversation reveals "I'm a designer looking for work"
3. GPT calls `/convert` with `target_type: "talent"` and skill info
4. User is now in the Talent pool for matching

---

### Inbound Jobs Intake

This intake path is designed for agent-farmed staffing opportunities that need operator review before downstream action.

#### Ingest or Dedupe a Job

```http
POST /inbound-jobs
Content-Type: application/json
X-Abundance-Ingest-Key: YOUR_OPTIONAL_INGEST_KEY

{
  "source_agent": "halfdozen-scout-west",
  "source_run_id": "run_2026_04_19_a",
  "source_system": "linkedin",
  "external_job_id": "job-123",
  "job_url": "https://example.com/jobs/icu-rn?utm_source=scout",
  "employer": "Mercy West",
  "location": "Dallas, TX",
  "title": "Travel ICU RN",
  "raw_payload": {
    "salary": "$2,400/week",
    "shift": "nights"
  }
}
```

**Behavior:**

- If `dedupe_key` is omitted, the API derives one from a canonicalized `job_url` or fallback metadata.
- If the job already exists, the row is updated in place, `seen_count` increments, and `source_agents` is merged.
- `POST /inbound-jobs` accepts either an authenticated operator session or `X-Abundance-Ingest-Key` when `ABUNDANCE_INGEST_API_KEY` is configured.
- Rows remain unlinked until an operator hands off a qualified job; after handoff the record includes `funnel_lead_id` and `funnel_handoff_at`.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "abj_m9u7s1_x2a9k3",
    "source_agent": "halfdozen-scout-west",
    "source_agents": ["halfdozen-scout-west"],
    "title": "Travel ICU RN",
    "status": "new",
    "seen_count": 1
  },
  "created": true,
  "duplicate": false
}
```

#### List Jobs for Operator Review

```http
GET /inbound-jobs?status=new&source_agent=halfdozen-scout-west&q=dallas
```

#### Export CSV

```http
GET /inbound-jobs?format=csv&status=reviewing
```

#### Review a Job

```http
PATCH /inbound-jobs/{id}
Content-Type: application/json

{
  "status": "qualified",
  "notes": "Good facility, pay confirmed, ready for recruiter handoff."
}
```

#### Operator UI

- Review queue: `https://createsomething.agency/admin/abundance`
- Operator-only access is controlled by `AGENCY_OPERATOR_EMAILS`
- Qualified jobs can be sent directly into the GTM funnel from `/admin/abundance`
- Created funnel leads are tagged with `source=abundance` and can be reviewed at `https://createsomething.agency/admin/funnel/leads/{id}`

---

## Integration Guide

### GPT Actions Setup

1. **Import OpenAPI Specification**
   - URL: `https://createsomething.agency/openapi-abundance.yaml`

2. **Configure in ChatGPT**
   - Go to: GPT Builder → Actions → Import from URL
   - Paste the OpenAPI URL
   - Test each endpoint

3. **Conversation Design**
   - GPT handles natural language conversation
   - API provides data persistence and matching
   - GPT calls API to create/update profiles and find matches

### Inbound Job Operator Setup

1. **Apply the migration**

   ```bash
   pnpm --filter @create-something/agency db:migrate
   ```

   `db:migrate` applies against the remote Cloudflare D1 database.
   As of the funnel-handoff rollout, this includes `0022_abundance_funnel_handoff.sql`, which extends the funnel `source` enum to include `abundance` and adds durable handoff linkage fields on `inbound_jobs`.

   For local development:

   ```bash
   pnpm --filter @create-something/agency db:migrate:local
   ```

2. **Set operator and ingest auth**

   | Variable                   | Source             | Description                                                                                        |
   | -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
   | `AGENCY_OPERATOR_EMAILS`   | You configure this | Comma-separated operator email allowlist for `/admin/abundance` and protected intake reads/writes. |
   | `ABUNDANCE_INGEST_API_KEY` | You configure this | Optional shared secret for agent `POST /inbound-jobs` calls when no operator session exists.       |

   Recommended production sync path:

   ```bash
   AGENCY_OPERATOR_EMAILS=operator1@example.com,operator2@example.com \
   ABUNDANCE_INGEST_API_KEY=replace-with-random-shared-secret \
   pnpm agency:abundance:seed

   pnpm agency:abundance:sync
   ```

   These commands seed the runtime values into Infisical at `/agency` and then mirror them into the `create-something-agency` Cloudflare Pages project.

3. **Run the operator loop**
   - Agents `POST /api/abundance/inbound-jobs`
   - Operators review at `/admin/abundance`
   - Operators mark viable rows as `qualified`, then use `Send to Funnel` to create a linked funnel lead
   - The resulting lead is visible in `/admin/funnel` and `/admin/funnel/leads/{id}`
   - CSV export is available directly from the operator queue

### WhatsApp Business Setup

1. **Meta Developer Console** (developers.facebook.com)
   - Create a new App → Select "Business" type
   - Add WhatsApp product to your app
   - Go to WhatsApp → API Setup

2. **Get Your Credentials**

   | Variable                   | Source                                              | Description                                                                          |
   | -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
   | `WHATSAPP_VERIFY_TOKEN`    | **You create this**                                 | Any random string you choose (like a password). Used to verify webhook authenticity. |
   | `WHATSAPP_ACCESS_TOKEN`    | Meta Console → API Setup → "Temporary access token" | For production, create a System User token instead.                                  |
   | `WHATSAPP_PHONE_NUMBER_ID` | Meta Console → API Setup → "Phone number ID"        | The ID of your connected WhatsApp Business number.                                   |

3. **Configure Webhook** (Meta Console → WhatsApp → Configuration)
   - Callback URL: `https://createsomething.agency/api/abundance/whatsapp`
   - Verify token: The same value you set for `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`

4. **Set Environment Variables** (Cloudflare Dashboard → Workers & Pages → Settings → Variables)

   ```
   WHATSAPP_VERIFY_TOKEN=your-chosen-random-string
   WHATSAPP_ACCESS_TOKEN=EAAxxxxxx...  (from Meta)
   WHATSAPP_PHONE_NUMBER_ID=123456789  (from Meta)
   AGENCY_OPERATOR_EMAILS=operator1@example.com,operator2@example.com
   ABUNDANCE_INGEST_API_KEY=replace-with-random-shared-secret
   ```

5. **Test the Integration**
   - Send a message to your WhatsApp Business number
   - Check Cloudflare Workers logs to confirm webhook receipt

---

## Hermeneutic Spiral Design

This pattern embodies the [Hermeneutic Circle](/canon/concepts/hermeneutic-circle): understanding deepens through iterative engagement. Each interaction builds on previous context, creating richer profiles over time.

**[Zuhandenheit](/canon/concepts/zuhandenheit)**: The system should recede into conversation. Users don't think "I'm updating my profile"—they're just chatting. The infrastructure disappears.

The system is designed for **returning users**. Instead of repeating full intake each time:

### First Visit (Onboarding)

- Full profile creation
- Brand details captured
- Preferences stored

### Return Visits (Delta Intake)

- System recognizes phone number
- Retrieves stored profile
- Only asks what's changed:
  - "Same brand as last time?"
  - "What's different about this project?"
  - "Budget and deadline?"

### Implementation

```http
GET /seekers?phone=+1234567890
```

If found → Delta intake (ask only new info)
If not found → Full onboarding

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 404 | Not found |
| 500 | Server error |

---

## Rate Limits & Performance

- **Latency:** <100ms (edge deployment)
- **Database:** Cloudflare D1 (SQLite)
- **Limits:** Standard Cloudflare Workers limits apply
- **Uptime:** Cloudflare global network (99.9%+)

---

## Data Privacy

- All data stored on Cloudflare infrastructure (GDPR-compliant regions available)
- Phone numbers used as identifiers, not shared externally
- Conversation history stored for context, can be deleted on request
- No third-party analytics or tracking

---

## Support

**Technical Contact:** CREATE SOMETHING Agency
**API Status:** https://createsomething.agency
**OpenAPI Spec:** https://createsomething.agency/openapi-abundance.yaml

---

## Changelog

### v1.3.0 (April 2026)

- Added qualified-job handoff from `/admin/abundance` into the GTM funnel
- Added durable `funnel_lead_id` and `funnel_handoff_at` linkage on inbound jobs
- Added operator-gated funnel lead detail pages at `/admin/funnel/leads/{id}`
- Added `abundance` as a first-class funnel lead source

### v1.2.0 (April 2026)

- Added inbound job intake storage with dedupe and sighting counts
- Added operator review surface at `/admin/abundance`
- Added CSV export and operator note/status workflow
- Added ingest authentication via `ABUNDANCE_INGEST_API_KEY`

### v1.1.0 (December 2025)

- Added `/convert` endpoint for user type conversion
- Enhanced WhatsApp setup documentation
- Improved GPT conversation flow support

### v1.0.0 (December 2025)

- Initial release
- Seeker and Talent profile management
- Intelligent matching algorithm
- WhatsApp webhook integration
- GPT Actions support via OpenAPI

---

_Built by CREATE SOMETHING Agency for Half Dozen_
