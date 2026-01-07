# EPP Enrollment - Quick Deployment Guide

Step-by-step guide to deploy the EPP enrollment automation.

## Prerequisites

✅ Airtable base "EPP Lead Capture" exists with all fields  
✅ API keys available (same as Experts sync)  
✅ Script ready in `airtable-scripts/epp-enrollment.js`  
⚠️ **IMPORTANT:** Marketo → Airtable integration must be working (see `docs/marketo-integration.md`)

## Step 1: Open Airtable Automation

1. Open the **EPP Lead Capture** base in Airtable
2. Click the **Automations** tab
3. Click **Create automation**
4. Name it: "Enroll in Mongo - EPP"

## Step 2: Configure Trigger

**Trigger Type:** When record matches conditions

**Settings:**
- **Table:** EPP Lead Capture
- **View:** All records (or create "Ready to Enroll" view)
- **Conditions:**
  - When "Enroll in Mongo" **is checked**
  - AND "Status" **is empty** (or not "Success")

This ensures it only runs once per record when you check the enrollment box.

## Step 3: Add Script Action

1. Click **+ Add advanced logic or action**
2. Select **Run script**
3. Click **+ Add variable** to configure inputs:

### Input Variables

| Variable Name | Type | Value |
|---------------|------|-------|
| `environment` | String | `'production'` |
| `recordID` | Record ID | Select from trigger: **Record ID** |

**For testing:** Use `'acceptance'` for environment first!

## Step 4: Copy Script

1. Open `packages/webflow-automation/airtable-scripts/epp-enrollment.js`
2. Copy the **entire script**
3. Paste into Airtable script editor
4. Review - no changes needed!

## Step 5: Test in Acceptance

### Create Test Record

1. In EPP Lead Capture, create a test record:
   - **Workspace slug:** `test-epp-enrollment-jan2026` (unique slug)
   - **Email:** Your email
   - **First/Last name:** Your name
   - **Company:** Test Company
   - **Country:** United States
   - **Min project size:** $5000
   - Leave other fields optional

2. **Check the "Enroll in Mongo" checkbox**

### Watch Automation Run

1. Go to Automations tab
2. Click on "Enroll in Mongo - EPP"
3. Click **Run history**
4. Watch the latest run

### Check Results

**If successful:**
- ✅ Status = "Success"
- ✅ API Response shows profile ID and slug
- ✅ Console logs show each step

**If failed:**
- ❌ Status = "Failed"
- ❌ API Response shows error details
- ❌ Review console logs for issue

## Step 6: Update to Production

Once acceptance testing passes:

1. Edit automation
2. Change `environment` input variable from `'acceptance'` to `'production'`
3. Save
4. Test with ONE real record
5. Monitor closely

## Step 7: Activate

1. Turn on automation
2. Monitor first 5-10 enrollments
3. Check for any errors
4. Review API responses

## Automation Settings

### Recommended Settings

- **Run mode:** Default (sequential)
- **Error handling:** Stop automation on error
- **Notifications:** Email you if automation fails
- **Testing:** Keep test automation separate from production

## Monitoring

### Check Daily

- Any failed enrollments?
- Review "Mongo Enrollment API Response" field
- Look for patterns in errors

### Common Issues

**Invalid workspace slug:**
- Response shows validation error
- User needs to provide correct slug
- Can manually fix and re-trigger

**Duplicate enrollment:**
- Workspace already has profile
- Check Marketplace Experts table
- May need to update instead of create

**API timeout:**
- Network issue or slow response
- Can retry by unchecking then rechecking "Enroll in Mongo"

## Views to Create

### 1. "Pending Enrollment"
Filter:
- "Enroll in Mongo" = Checked
- "Status" = Empty

### 2. "Successfully Enrolled"
Filter:
- "Status" = "Success"

### 3. "Failed Enrollments"
Filter:
- "Status" = "Failed"

### 4. "All Enrollments"
Filter:
- "Enroll in Mongo" = Checked

## Manual Retry Process

If enrollment fails and you want to retry:

1. Review error in "Mongo Enrollment API Response"
2. Fix any issues with the record data
3. **Uncheck** "Enroll in Mongo"
4. **Check** "Enroll in Mongo" again
5. Automation will re-run

## Integration with Webflow Form

### Form Setup

The Webflow form should POST to Airtable (via Airtable form or API):

**Form URL:** [Your Webflow site]/epp-enrollment

**Fields Map:**
- Workspace Slug → `Webflow Workspace slug`
- Email → `Email address`
- First Name → `First name`
- Last Name → `Last name`
- Company → `Company/Agency name`
- Website → `Agency/Portfolio Website URL`
- etc.

**After form submission:**
1. Record created in Airtable
2. Automation can trigger automatically OR
3. Manually review then check "Enroll in Mongo"

### Automatic vs Manual Enrollment

**Option A: Automatic (not recommended initially)**
- Remove "Enroll in Mongo" checkbox condition
- Trigger on any new record creation
- Risk: enrolls bad data automatically

**Option B: Manual Review (recommended)**
- Requires checking "Enroll in Mongo" checkbox
- Allows you to review/validate data first
- Safer for initial rollout

## Support

### If Automation Fails

1. Check run history for error details
2. Review console logs in script output
3. Check "Mongo Enrollment API Response" field
4. Verify API keys haven't expired
5. Test in acceptance environment

### Contact

- **Script issues:** Micah
- **API issues:** Aaron Resnick
- **Airtable setup:** [Team member]

## Checklist

Before going live:

- [ ] Automation created and named
- [ ] Trigger configured correctly
- [ ] Input variables set (environment, recordID)
- [ ] Script copied and pasted
- [ ] Tested in acceptance (3+ test records)
- [ ] All test records enrolled successfully
- [ ] Changed to production environment
- [ ] Tested with 1 real record in production
- [ ] Monitoring set up (views created)
- [ ] Team notified of new process
- [ ] Documentation shared
- [ ] Error handling tested

## Production Launch

**Day 1:**
- Process 5 enrollments manually
- Review each response
- Verify profiles created in Mongo

**Day 2-7:**
- Gradually increase volume
- Monitor error rates
- Collect feedback

**Week 2+:**
- Fully automated
- Weekly review of failed enrollments
- Monthly cleanup/optimization

---

**Ready to deploy!** 🚀

Follow these steps carefully and test thoroughly before production use.

