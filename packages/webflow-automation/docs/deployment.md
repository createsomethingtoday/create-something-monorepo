# Deployment Guide

How to deploy automation scripts to Airtable.

## Prerequisites

1. Access to the Airtable base
2. Permissions to create/edit automations
3. API keys and endpoints from Aaron/engineering team

## Deploying a Script

### 1. Create the Automation

1. Open Airtable base
2. Click **Automations** tab
3. Click **Create automation**
4. Name it descriptively (e.g., "EPP Enrollment - Sync to Mongo")

### 2. Set the Trigger

**For EPP Enrollment:**
- Trigger: "When record created"
- Table: EPP Enrollment
- View: All records (or specific view)

**For Experts Sync:**
- Trigger: "When record updated"  
- Table: Experts
- View: All experts (or filtered view)
- Fields: Watch specific fields that should trigger sync

### 3. Add Script Action

1. Click **+ Add advanced logic or action**
2. Select **Run script**
3. Configure input variables (see below)
4. Copy/paste script from `airtable-scripts/` folder
5. Review script - update any TODOs or placeholders

### 4. Configure Input Variables

Click **+ Add variable** for each input the script needs.

**EPP Enrollment Inputs:**
```javascript
environment: 'production' // or 'acceptance' for testing
recordID: [Record ID from trigger]
workspaceSlug: [Workspace Slug field from record]
```

**Experts Sync Inputs:**
```javascript
environment: 'production' // or 'acceptance'
recordID: [Record ID from trigger]
workspaceID: [Workspace ID field from record]
createdOn: [Created Date field from record]
useNewSystem: true // or false based on partner type system
```

### 5. Update Field IDs

Scripts reference Airtable field IDs (e.g., `fldWorkspaceSlug`). Update these based on your actual base:

1. In Airtable, open the base
2. Right-click field header → Copy field ID
3. Replace placeholder IDs in script with actual IDs

**Fields to update in EPP script:**
- `FIELDS.WORKSPACE_SLUG`
- `FIELDS.SUBMITTER_EMAIL`
- `FIELDS.API_STATUS`
- `FIELDS.API_RESPONSE`
- etc.

### 6. Add API Keys as Secrets

1. In script editor, find the "secrets" section
2. Click **+ Add secret**
3. Add:
   - `apiKeyAcceptance`
   - `apiKeyProduction`
4. Paste actual keys (get from Aaron/team)

### 7. Test the Automation

1. Click **Test** button
2. Select a test record
3. Review console output
4. Check if record updates correctly
5. Verify API calls in logs

**Testing checklist:**
- [ ] Script runs without errors
- [ ] API call succeeds
- [ ] Record updates with response
- [ ] Error handling works (test with invalid data)
- [ ] Notifications sent (Iterable/Marketo)

### 8. Activate

1. Review all settings
2. Test one more time with production data
3. Click **Turn on automation**
4. Monitor first few runs closely

## Monitoring & Maintenance

### Check Automation Runs

1. Automations tab → Click automation name
2. View **Run history**
3. Review errors and success rate

### Common Issues

**Script timeout:**
- Reduce number of API calls
- Move heavy processing to external service
- Split into multiple automations

**Rate limiting:**
- Add delays between API calls
- Batch requests where possible
- Implement exponential backoff

**Field ID errors:**
- Double-check field IDs match your base
- Use `console.log(table.fields)` to debug
- Field IDs change if field is deleted/recreated

### Updating Scripts

1. Turn off automation
2. Edit script in Airtable
3. Test thoroughly
4. Turn back on
5. Monitor runs

**OR** for major changes:
1. Duplicate automation
2. Update duplicated version
3. Test new version
4. Disable old, enable new
5. Delete old after confirming

## Environment Management

### Acceptance Testing

1. Create separate automation for acceptance
2. Use acceptance API keys
3. Point to `webflowtest.com`
4. Test with staging data
5. Verify before promoting to production

### Production Deployment

1. Ensure acceptance version works
2. Update to production keys/URLs
3. Deploy during low-traffic window
4. Monitor closely for first hour
5. Have rollback plan ready

## Rollback Plan

If automation causes issues:

1. **Immediate:** Turn off automation in Airtable
2. **Short-term:** Revert to previous version of script
3. **Long-term:** Fix issue, test in acceptance, redeploy

Keep previous working version in git history for easy rollback.

