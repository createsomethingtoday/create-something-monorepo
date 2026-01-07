# Getting Started with Webflow Automation

Quick start guide for deploying Airtable automations.

## What is this?

This package contains **Airtable automation scripts** that sync data between Airtable bases and Webflow's Mongo backend APIs. The scripts run **inside Airtable** but are version-controlled here for collaboration and documentation.

## Current Scripts

### 1. Experts Sync (`airtable-scripts/experts-sync.js`)

✅ **Status:** Deployed and running in production

**What it does:** Syncs Expert profiles from Airtable to Webflow's Mongo backend when records are updated.

**Base:** Marketplace Services (Experts)  
**Trigger:** Record updated  
**API:** `/api/v1/marketplace/profile`

### 2. EPP Enrollment (`airtable-scripts/epp-enrollment.js`)

🚧 **Status:** Ready for deployment (needs configuration)

**What it does:** Processes Expanded Partner Program enrollment form submissions by:
1. Validating workspace slug
2. Calling Mongo API to enroll workspace
3. Sending error emails if slug is invalid
4. Reporting to Iterable and Marketo

**Base:** EPP Enrollment (needs to be created)  
**Trigger:** Record created  
**API:** TBD (get from Aaron)

## For Aaron: Next Steps

You asked about the EPP enrollment automation. Here's what you need to do:

### Immediate (This Week)

1. **Review the EPP script:** `airtable-scripts/epp-enrollment.js`
2. **Send Micah the API details:**
   - Actual endpoint URL
   - API keys (acceptance + production)
   - Request/response schema
   - Any specific validation rules

3. **Review TODO.md** for complete checklist

### After API Details

1. Set up Airtable base (see `docs/airtable-setup.md`)
2. Configure Webflow form page
3. Deploy automation to Airtable (see `docs/deployment.md`)
4. Test in acceptance environment
5. Deploy to production

### Questions to Answer

- [x] ✅ What's the actual Mongo API endpoint? `/api/v1/marketplace/profile`
- [x] ✅ What are the API keys? Same as Experts sync
- [ ] **CRITICAL:** How does Marketo form data reach Airtable?
- [ ] What are ALL the Marketo form field IDs?
- [ ] How should Iterable/Marketo notification integration work?
- [ ] Should enrollment be automatic or require manual review?

## For Micah: What's Next

### Option A: Wait for Aaron's API Details

Once Aaron provides the endpoint/keys, update:
- `airtable-scripts/epp-enrollment.js` (replace TODO comments)
- Work with Aaron to deploy

### Option B: Build API Middleware Instead

If you want more control, create an API endpoint in `webflow-dashboard`:

```
packages/webflow-dashboard/src/routes/api/epp/enroll/+server.ts
```

This would:
- Receive webhooks from Airtable
- Validate workspace slug
- Call Mongo API
- Return structured response
- Easier to test and maintain

Benefits:
- Better error handling
- Easier testing (no Airtable required)
- Shared validation logic with dashboard
- Can add rate limiting, logging, etc.

**Trade-off:** Extra hop (Airtable → Your API → Mongo)

## File Guide

```
webflow-automation/
├── README.md                   # Package overview
├── GETTING_STARTED.md         # This file
├── TODO.md                    # Complete checklist
├── PATTERNS.md                # Code patterns & best practices
│
├── airtable-scripts/          # Scripts that run IN Airtable
│   ├── experts-sync.js        # ✅ Deployed
│   └── epp-enrollment.js      # 🚧 Ready for deployment
│
├── docs/                      # Documentation
│   ├── deployment.md          # How to deploy to Airtable
│   ├── airtable-setup.md      # Base configuration
│   └── api-endpoints.md       # Mongo API docs
│
└── shared/                    # TypeScript utilities (reference only)
    ├── validators.ts          # Validation helpers
    └── types.ts               # Type definitions
```

## Key Documents to Read

**For deployment:**
1. `TODO.md` - What needs to be done
2. `docs/deployment.md` - Step-by-step deployment guide
3. `docs/airtable-setup.md` - Airtable base configuration

**For understanding:**
1. `PATTERNS.md` - Common patterns and best practices
2. `docs/api-endpoints.md` - API documentation
3. `airtable-scripts/experts-sync.js` - Working example

## Quick Commands

```bash
# Validate TypeScript (reference only)
cd packages/webflow-automation
npm run validate

# View in IDE
cursor packages/webflow-automation/
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Webflow Form                          │
│                  (EPP Enrollment Page)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ Form submission
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Airtable Base                             │
│                  (EPP Enrollment)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Record Created → Automation Trigger                  │  │
│  │  ↓                                                     │  │
│  │  Run Script: epp-enrollment.js                        │  │
│  │  ↓                                                     │  │
│  │  1. Validate workspace slug                           │  │
│  │  2. Call Mongo API                                    │  │
│  │  3. Handle response                                   │  │
│  │  4. Update record fields                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────┬──────────────────────┬────────────────────────────┘
          │                      │
          │                      └──────────────┐
          ▼                                     ▼
┌────────────────────┐              ┌──────────────────────┐
│   Mongo API        │              │  Iterable/Marketo    │
│   (Webflow)        │              │  (Notifications)     │
│                    │              │                      │
│ POST /epp/enroll   │              │ • Success: Welcome   │
│                    │              │ • Error: Suppress    │
└────────────────────┘              └──────────────────────┘
```

## Common Questions

### Q: Why not use the dashboard package?

The scripts run **inside Airtable** because:
- Direct integration with Airtable triggers
- No need to host/maintain separate service
- Simpler for non-technical stakeholders to manage
- Airtable provides UI for monitoring/debugging

However, you *could* build a middleware API if needed.

### Q: How do I test without affecting production?

1. Create automation in acceptance environment
2. Use acceptance API keys
3. Test with staging Airtable base
4. Only deploy to production after thorough testing

### Q: What if the automation fails?

1. Check Airtable automation run history (detailed logs)
2. Review error message in record
3. Fix issue in script
4. Manually retry record (re-trigger automation)
5. For critical failures, turn off automation immediately

### Q: How do I make changes to a live automation?

1. Turn off automation
2. Update script
3. Test thoroughly
4. Turn back on
5. Monitor closely

OR create duplicate, test, swap, delete old.

### Q: Can I test locally?

The scripts use Airtable's runtime (not Node.js). You can:
- Copy validation logic to TypeScript (in `shared/`)
- Test API calls separately
- Use Airtable's test feature for full flow

## Support

**For this package:**
- Maintainer: Micah
- Questions: Check TODO.md, PATTERNS.md, docs/

**For API/integration:**
- Contact: Aaron Resnick
- Endpoint details, keys, schema questions

**For Airtable:**
- Base configuration: [Team member]
- Automation issues: Check run history first

## Next Actions

### For Aaron 📋

1. Read `TODO.md` section 1
2. Provide API endpoint details to Micah
3. Review `airtable-scripts/epp-enrollment.js`
4. Answer questions in TODO.md

### For Micah 💻

1. ~~Create package structure~~ ✅ Done
2. ~~Document existing Experts script~~ ✅ Done
3. ~~Create EPP enrollment script~~ ✅ Done
4. Wait for Aaron's API details
5. Update script with real values
6. Deploy with Aaron's team

### For Both 🤝

1. Review PATTERNS.md together
2. Discuss API endpoint design
3. Plan testing strategy
4. Schedule deployment

