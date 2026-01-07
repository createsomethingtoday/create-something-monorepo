# Replace Existing EPP Automation Script

## Current Setup (From Screenshot)

You already have an automation running that:
1. ✅ Receives webhook from Marketo
2. ✅ Creates record in EPP Lead Capture
3. ❌ **Runs old script** - only checks if profile exists, doesn't create

## What Needs to Change

**Replace the script in Action 2** with our new enrollment script that actually creates profiles in Mongo.

## Step-by-Step Instructions

### 1. Open Existing Automation

1. Go to Airtable → EPP Lead Capture base
2. Click **Automations** tab
3. Click on **"EPP Lead Capture"** automation (the one that's ON)

### 2. Edit Action 2 (Run a script)

1. Click on **"Run a script"** action (Action 2)
2. You'll see the current script:

```javascript
const config = input.config();
const submissions = base.getTable('tblhpf95EWJPhbbYk');
const profiles = base.getTable('tblws6bifnpRXnbjb');
// ... rest of old script
```

### 3. Update Input Variables

**IMPORTANT:** The input variables need to match what our script expects.

Current inputs (keep these):
- `workspaceSlug` - from webhook body
- `recordId` - from Action 1 (create record)

Add (if not present):
- `environment` - Set to `'acceptance'` for testing, `'production'` for live

**Configuration:**
- `workspaceSlug`: From webhook → `body.workspaceSlug` (or whatever field name Marketo uses)
- `recordId`: From Action 1 → "Airtable record ID"
- `environment`: Static value → `'production'` (or `'acceptance'` for testing)

### 4. Replace Script

1. **Delete** the entire old script
2. **Copy** the entire contents of `airtable-scripts/epp-enrollment.js`
3. **Paste** into the script editor
4. Click **Done**

### 5. Test in Acceptance

**CRITICAL:** Test before going to production!

1. Change `environment` input to `'acceptance'`
2. Submit a test Marketo form with:
   - Unique workspace slug (e.g., `test-epp-jan-2026`)
   - Valid email/name/company
3. Watch automation run
4. Check results in EPP Lead Capture record
5. Verify in acceptance Mongo environment

### 6. Go to Production

Once acceptance test passes:

1. Edit automation → Action 2 (script)
2. Change `environment` input to `'production'`
3. Save
4. Test with ONE real submission
5. Monitor closely

## What the New Script Does

### Flow

```
1. Webhook received → Create record
   ↓
2. Run NEW script:
   ├─ Check if profile exists in Marketplace Experts
   │  ├─ YES → Link to existing, mark "Success", EXIT
   │  └─ NO → Continue to create...
   ├─ Validate workspace slug
   ├─ Build API payload
   ├─ Call Mongo API (POST /api/v1/marketplace/profile)
   └─ Update Status & API Response fields
```

### Key Improvements

**Old script:**
- ❌ Only checked if profile exists
- ❌ Marked as "Failed" if not found
- ❌ Required manual profile creation

**New script:**
- ✅ Checks if profile exists first (avoid duplicates)
- ✅ **Creates profile in Mongo if not found**
- ✅ Validates workspace slug format
- ✅ Handles errors gracefully
- ✅ Logs detailed API responses

## Input Variables Reference

```javascript
// In Airtable automation configuration:
{
  workspaceSlug: body.workspaceSlug,  // From webhook (Marketo)
  recordId: [From Action 1],           // Airtable record ID
  environment: 'production'            // or 'acceptance' for testing
}
```

## Table & Field IDs Used

The script uses these IDs (from your existing script):

```javascript
// Tables
SUBMISSIONS: 'tblhpf95EWJPhbbYk'  // EPP Lead Capture
PROFILES: 'tblws6bifnpRXnbjb'     // Marketplace Experts

// Fields  
STATUS: 'fld3wMN6RsJHkJ2r1'              // Status field
LINKED_PROFILE: 'fldl8mDUg6Yk3Qgad'      // Link to Marketplace Experts
```

These match your existing automation, so no changes needed!

## Testing Checklist

- [ ] Automation edited (Action 2 script replaced)
- [ ] Input variables configured correctly
- [ ] Environment set to 'acceptance'
- [ ] Test form submitted
- [ ] Automation ran successfully
- [ ] Status = "Success" in Airtable
- [ ] API Response shows profile created
- [ ] Verified in acceptance Mongo
- [ ] Changed environment to 'production'
- [ ] Tested 1 real submission in production
- [ ] Monitoring first 10 submissions

## Expected Results

### Test 1: New Workspace (Never Enrolled Before)

**Input:**
- Workspace slug: `test-new-workspace`
- (Doesn't exist in Marketplace Experts)

**Expected:**
- Status = "Success"
- API Response shows new profile created
- Profile ID and slug returned from Mongo

### Test 2: Existing Workspace (Already Has Profile)

**Input:**
- Workspace slug: `andabove` (from your CSV example)
- (Already exists in Marketplace Experts)

**Expected:**
- Status = "Success"
- Linked to existing profile
- API Response shows "already_exists"
- No duplicate created

### Test 3: Invalid Workspace Slug

**Input:**
- Workspace slug: `-invalid-slug-`
- (Invalid format)

**Expected:**
- Status = "Failed"
- API Response shows validation error
- Error message explains format requirements

## Troubleshooting

### Automation Fails Immediately

- Check input variable names match
- Verify `workspaceSlug` is being passed from webhook
- Check console logs in script output

### "Table not found" Error

- Verify table IDs are correct
- Table IDs in script: `tblhpf95EWJPhbbYk`, `tblws6bifnpRXnbjb`
- Match your existing automation

### Profile Created But Not Linked

- The script creates in Mongo, not Airtable
- Linking happens only if profile already exists in Airtable
- This is expected behavior

### Status Not Updating

- Check field ID: `fld3wMN6RsJHkJ2r1`
- Must match your actual Status field ID
- View field properties in Airtable to verify

## Rollback Plan

If something goes wrong:

1. **Immediate:** Turn OFF the automation
2. **Quick fix:** Restore old script from screenshot
3. **Investigate:** Review automation run logs
4. **Test again:** In acceptance before re-enabling

Keep screenshot of old script for easy rollback!

## Support

- **Script issues:** Check console logs in automation run history
- **API errors:** Review API Response field in failed records
- **Field ID errors:** Verify field IDs match your base

---

**Ready to update!** The script is drop-in compatible with your existing automation structure. Just replace the script in Action 2 and test! 🚀

