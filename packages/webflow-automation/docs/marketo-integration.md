# Marketo → Airtable → Mongo Integration

## Overview

The EPP enrollment uses a **Marketo form** that flows data through multiple systems:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Marketo Form (Webflow)                        │
│              Form ID: 1835 (EPP Lead Capture)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ Form submission
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Marketo                                  │
│              Processes submission & enrichment                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ Webhook or Zapier
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Airtable (EPP Lead Capture)                   │
│                    New record created                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ Automation trigger
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Airtable Automation (our script)                    │
│              epp-enrollment.js runs                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ API call
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mongo API (Webflow)                           │
│              Creates Expert/Partner profile                      │
└─────────────────────────────────────────────────────────────────┘
```

## Marketo Form Fields

From the form embed code, the form includes:

### Contact Info Section
- `FirstName` - First name
- `LastName` - Last name  
- `Email` - Email address

### Company Details Section
- `Company` - Company/Agency name
- `Company_Size__c` - Full-time employees (FTE)
- (Additional fields TBD - need full form field list)

### Workspace Info (Assumed)
- `workspaceSlug` or `Workspace_Slug__c` - Webflow workspace slug
- (Other workspace-related fields)

## Field Mapping Requirements

### Marketo → Airtable Mapping

The Marketo webhook/integration must map fields to Airtable columns:

| Marketo Field | Airtable Column | Required |
|---------------|-----------------|----------|
| `FirstName` | `First name` | ✅ Yes |
| `LastName` | `Last name` | ✅ Yes |
| `Email` | `Email address` | ✅ Yes |
| `Company` | `Company/Agency name` | ✅ Yes |
| `Company_Size__c` | `Full-time employees` | No |
| `workspaceSlug` or `Workspace_Slug__c` | `Webflow Workspace slug` | ✅ Yes |
| TBD | `Agency/Portfolio Website URL` | No |
| TBD | `Building websites on behalf of Webflow?` | No |
| TBD | `Typical project size` | No |
| TBD | `Minimum project size` | No |
| TBD | `Primary country/region of operation` | ✅ Yes |

### Missing Field Mappings (TODO)

Need to identify Marketo field names for:
- Agency/Portfolio Website URL
- Building websites on behalf of Webflow?
- Typical project size
- Minimum project size  
- Primary country/region of operation

## Integration Setup

### Option 1: Marketo Webhook (Recommended)

**In Marketo:**
1. Create webhook to Airtable API
2. Endpoint: `https://api.airtable.com/v0/{BASE_ID}/EPP%20Lead%20Capture`
3. Method: POST
4. Headers:
   ```
   Authorization: Bearer {AIRTABLE_API_KEY}
   Content-Type: application/json
   ```
5. Body template:
   ```json
   {
     "fields": {
       "Webflow Workspace slug": "{{lead.Workspace_Slug__c}}",
       "Email address": "{{lead.Email}}",
       "First name": "{{lead.FirstName}}",
       "Last name": "{{lead.LastName}}",
       "Company/Agency name": "{{lead.Company}}",
       "Full-time employees": {{lead.Company_Size__c}},
       "Primary country/region of operation": "{{lead.Country}}",
       ... (map remaining fields)
     }
   }
   ```

**Trigger:**
- When: Form is filled out
- Form: EPP Lead Capture (1835)
- Constraint: None (or add filters)

### Option 2: Zapier/Make Integration

**Trigger:**
- App: Marketo
- Event: New Lead (with form filter: 1835)

**Action:**
- App: Airtable
- Event: Create Record
- Table: EPP Lead Capture
- Field Mapping: (map all fields)

### Option 3: Native Airtable Form (Alternative)

If Marketo form isn't required, could use:
- Airtable Form (simpler integration)
- Embed Airtable form on Webflow page
- Direct submission to Airtable
- No middleware needed

## Airtable Automation Trigger

### Current Setup (From CSV)

The automation should trigger when:
- New record is created in "EPP Lead Capture" table
- AND "Enroll in Mongo" checkbox is checked

OR (for automatic enrollment):
- New record is created
- Immediately run enrollment script

### Recommended: Manual Review First

**Phase 1 (Initial Rollout):**
- New record created → Does NOT auto-enroll
- Team reviews submission manually
- Team checks "Enroll in Mongo" → Triggers automation
- Allows validation before API call

**Phase 2 (After Testing):**
- New record created → Auto-enrolls immediately  
- No manual review step
- Faster processing
- Monitor error rates closely

## Complete Form Field List Needed

### Action Items

1. **Get full Marketo form field list**
   - Contact: Marketing team
   - Need: All field IDs and labels from form 1835
   - Format: Field ID, Field Label, Data Type

2. **Verify Airtable integration exists**
   - Check if Marketo → Airtable webhook already set up
   - OR if using Zapier/Make
   - Get access to configuration

3. **Test data flow**
   - Submit test form in Marketo
   - Verify record appears in Airtable
   - Verify all fields map correctly
   - Check data formatting

## Form Field Discovery

### How to Find Marketo Field IDs

**Method 1: Inspect Form**
1. Open form page in browser
2. Right-click → Inspect
3. Look at input field IDs
4. Example: `<input id="workspaceSlug" name="workspaceSlug">`

**Method 2: Marketo Admin**
1. Login to Marketo
2. Design Studio → Forms
3. Open form 1835
4. View field list with IDs

**Method 3: Ask Marketing Team**
- They have access to full form schema
- Can export field list
- Includes custom field mappings

## Help Link in Form

The form already includes:
```javascript
const helpLink = createHelpLink('How do I find my workspace slug?', 'https://www.loom.com/share/...');
```

This is good UX! Helps users provide correct slug format.

## Form Validation

### Client-Side (Already Implemented)
The Marketo form should validate workspace slug format:
- 3-63 characters
- Alphanumeric, hyphens, underscores
- Must start/end with alphanumeric

### Server-Side (Our Script)
Our Airtable script also validates, providing backup validation.

## Testing Workflow

### End-to-End Test

1. **Submit Marketo form** (in acceptance/staging)
   - Use test workspace slug
   - Fill all required fields
   
2. **Verify Airtable record created**
   - Check "EPP Lead Capture" table
   - All fields populated correctly
   - No data loss or formatting issues

3. **Trigger enrollment** (check "Enroll in Mongo")
   - Automation runs
   - Status = "Success"
   - API Response populated

4. **Verify in Mongo** (acceptance environment)
   - Profile created
   - All fields synced
   - No errors

## Next Steps

### Immediate
- [ ] Get full Marketo form field list
- [ ] Identify Marketo → Airtable integration method
- [ ] Map all form fields to Airtable columns
- [ ] Update webhook/integration with correct mapping

### Before Launch
- [ ] Test full workflow (Marketo → Airtable → Mongo)
- [ ] Verify all fields map correctly
- [ ] Test error handling
- [ ] Document any field transformations

### Post-Launch
- [ ] Monitor submission → enrollment success rate
- [ ] Track where failures occur (form, Airtable, API)
- [ ] Optimize field mapping if needed

## Troubleshooting

### Record Not Appearing in Airtable
- Check Marketo webhook logs
- Verify Airtable API key valid
- Check field name spelling (case-sensitive)
- Look for Zapier/Make errors

### Missing Fields in Airtable
- Verify Marketo field mapping
- Check if field is null/empty in Marketo
- Ensure field types match (text, number, etc.)

### Enrollment Fails
- Check "Status" and "API Response" fields
- Review Airtable automation logs
- Verify workspace slug format
- Test in acceptance first

## Contact

- **Marketo Form:** Marketing team
- **Airtable Integration:** [Integration owner]
- **Automation Script:** Micah
- **API Issues:** Aaron Resnick

