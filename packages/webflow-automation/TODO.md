# TODOs for EPP Enrollment Implementation

This file tracks what needs to be completed to deploy the EPP enrollment automation.

## 1. Get API Details from Aaron ⏳

- [x] **Actual API endpoint URL** for EPP enrollment
  - ✅ Using: `/api/v1/marketplace/profile` (shared with Experts)
- [x] **API authentication keys**
  - ✅ Using same keys as Experts sync
- [ ] **Request/response schema**
  - Exact field names and types
  - Required vs optional fields
  - Error codes and messages
- [ ] **Rate limits** and retry policies
- [ ] **Workspace slug validation rules** (confirm with backend team)

**Contact:** Aaron Resnick

## 2. Set Up Airtable Base 📋

- [x] ✅ Airtable base exists: "EPP Lead Capture"
- [x] ✅ Fields configured (from CSV)
- [x] ✅ Script uses field names (Airtable handles IDs automatically)
- [ ] Create views:
  - All Enrollments
  - Success (Status = Success)
  - Failed (Status = Failed)
  - Pending Enrollment (Enroll in Mongo = checked, Status = empty)
- [ ] Configure form submission (from Webflow)

**Note:** Script now uses actual field names from CSV

## 3. Configure Marketo → Airtable Integration 🔗

- [x] ✅ Marketo form exists (Form ID: 1835)
- [ ] **CRITICAL:** Verify Marketo → Airtable data flow
  - How do submissions reach Airtable?
  - Webhook? Zapier? Make?
- [ ] Get complete Marketo form field list
- [ ] Map Marketo fields → Airtable columns
- [ ] Test form submission → Airtable record creation
- [ ] Verify all fields populate correctly
- [ ] Check data formatting (currency, numbers, etc.)

**Reference:** `docs/marketo-integration.md` - Complete integration guide

## 4. Deploy Automation Script 🤖

- [ ] Copy `epp-enrollment.js` to Airtable automation
- [ ] Replace all TODO/placeholder values:
  - API endpoint URL
  - API keys (use secrets)
  - Field IDs
  - Status option IDs
  - Iterable API key
  - Marketo integration details
- [ ] Configure input variables
- [ ] Test in acceptance environment
- [ ] Deploy to production

**Reference:** `docs/deployment.md`

## 5. Set Up Integrations 🔗

### Iterable
- [ ] Get Iterable API key
- [ ] Confirm event name: `epp_enrollment_processed`
- [ ] Configure event in Iterable
- [ ] Test event tracking
- [ ] Set up suppression rules (prevent follow-ups on success)

### Marketo
- [ ] Get Marketo integration details (REST API vs webhook)
- [ ] Configure welcome email campaign
- [ ] Set trigger: EPP enrollment success
- [ ] Test email flow
- [ ] Update `epp-enrollment.js` with Marketo logic

**Update in code:** `reportToMarketo()` function in `epp-enrollment.js`

## 6. Set Up Error Email Automation 📧

- [ ] Create Airtable automation: "Send Error Email"
- [ ] Trigger: When API Status = "Error - Invalid Slug"
- [ ] Action: Send email to submitter
- [ ] Use email template from `docs/airtable-setup.md`
- [ ] Test with sample data
- [ ] Configure from address and reply-to

## 7. Testing Checklist ✅

### Acceptance Environment
- [ ] Test successful enrollment (valid slug)
- [ ] Test invalid slug format (should send error email)
- [ ] Test duplicate enrollment
- [ ] Test API timeout/failure
- [ ] Test Iterable event tracking
- [ ] Test Marketo welcome email (if ready)
- [ ] Verify all Airtable fields update correctly
- [ ] Test retry logic

### Production Deployment
- [ ] Switch to production API keys
- [ ] Test with real workspace slug (non-production impact)
- [ ] Monitor first 10 submissions closely
- [ ] Verify email deliverability
- [ ] Check Iterable/Marketo integration

## 8. Documentation & Monitoring 📊

- [ ] Update Aaron on completed setup
- [ ] Share Airtable base link with team
- [ ] Set up monitoring/alerts for:
  - High error rate (>10%)
  - Automation failures
  - Slow API responses
- [ ] Document support contacts in base
- [ ] Create runbook for common issues

## Submission Tracking System ✅

Architecture designed for porting webflow-dashboard submission tracking to SvelteKit.

**Completed:**
- [x] Architecture document: `docs/submission-tracking-architecture.md`
- [x] TypeScript types: `shared/submission-types.ts`
- [x] API route implementation: `shared/submission-api.ts`
- [x] Svelte store: `shared/submission-store.ts`

**Features:**
- Hybrid API integration (external + local fallback)
- 30-day rolling window calculation
- UTC date handling
- Template list with expiry dates
- Next available slot calculations
- CORS handling for development

**Integration:**
Copy files to your SvelteKit app:
- `submission-store.ts` → `src/lib/stores/submission.ts`
- `submission-api.ts` → `src/routes/api/submissions/status/+server.ts` (reference)

---

## 9. Optional Enhancements 🚀

- [ ] Add duplicate slug detection before API call
- [ ] Implement retry logic for failed enrollments
- [ ] Create dashboard view for metrics
- [ ] Add Slack notifications for errors
- [ ] Build admin interface for manual retries
- [ ] Add workspace slug lookup helper

## Quick Reference

**Files to update with real values:**
- `airtable-scripts/epp-enrollment.js` - All TODO comments
- Airtable automation configuration
- Webflow form page

**Key contacts:**
- API details: Aaron Resnick
- Airtable setup: [Team member]
- Marketo: [Marketing team]
- Iterable: [Marketing ops]

## Status Legend

- ⏳ Waiting on external input
- 📋 Airtable configuration
- 🌐 Webflow setup
- 🤖 Automation script
- 🔗 External integrations
- 📧 Email setup
- ✅ Testing
- 📊 Monitoring & docs
- 🚀 Nice-to-have

