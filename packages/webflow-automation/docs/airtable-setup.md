# Airtable Base Setup

Configuration guide for EPP Enrollment and related Airtable bases.

## EPP Enrollment Base

### Tables

#### EPP Lead Capture (Main Table)

**Fields:**

| Field Name | Type | Description | Usage |
|------------|------|-------------|-------|
| Webflow Workspace slug | Single line text | Workspace identifier | INPUT (validated) |
| Email address | Email | Contact email | INPUT |
| First name | Single line text | First name | INPUT |
| Last name | Single line text | Last name | INPUT |
| Full name | Single line text | Full name | INPUT |
| Company/Agency name | Single line text | Company/agency name | INPUT |
| Agency/Portfolio Website URL | URL | Website URL | INPUT (optional) |
| Building websites on behalf of Webflow? | Single select | Service status | INPUT |
| Full-time employees | Number | Team size | INPUT |
| Typical project size | Currency/Text | Typical project value | INPUT |
| Minimum project size | Currency/Text | Min project value | INPUT |
| Primary country/region of operation | Single line text | Country | INPUT |
| Status | Single select | Enrollment result | OUTPUT (Success/Failed) |
| Marketplace Experts | Linked record | Link to Experts table | OUTPUT (optional) |
| Expert Status | Lookup | Status from Experts | OUTPUT (optional) |
| Enroll in Mongo | Checkbox | Trigger enrollment | TRIGGER |
| Mongo Enrollment API Response | Long text | JSON response | OUTPUT |

**Status Options:**
- ✅ Success - Enrollment completed
- ❌ Failed - Enrollment failed (see API Response for details)

### Views

1. **All Enrollments** - Default view, all records
2. **Pending** - Filter: API Status = Pending
3. **Success** - Filter: API Status = Success
4. **Errors** - Filter: API Status contains "Error"
5. **Needs Retry** - Filter: API Status = Error AND Retry Count < 3

### Form

The Webflow form will POST to Airtable using:
- Airtable Form (public link)
- OR Airtable API (via middleware)
- OR Webflow Integration (if available)

**Form Fields:**
- Webflow Workspace slug (required, validated client-side)
- Email address (required)
- First name (required)
- Last name (required)
- Company/Agency name (required)
- Agency/Portfolio Website URL (optional)
- Building websites on behalf of Webflow? (required)
- Full-time employees (optional)
- Typical project size (optional)
- Minimum project size (optional)
- Primary country/region of operation (required)

**Form Validation:**
Add JavaScript validation to form page:

```javascript
// Workspace slug validation
const slugInput = document.querySelector('[name="workspace-slug"]');
slugInput.addEventListener('input', (e) => {
  const slug = e.target.value.trim();
  const isValid = /^[a-z0-9][a-z0-9-_]*[a-z0-9]$/i.test(slug) 
                  && slug.length >= 3 
                  && slug.length <= 63;
  
  if (!isValid && slug.length > 0) {
    // Show error message
    e.target.classList.add('error');
  } else {
    e.target.classList.remove('error');
  }
});
```

### Automations

#### 1. Process Enrollment

**Trigger:** When record created  
**Script:** `epp-enrollment.js`  
**Purpose:** Call Mongo API to enroll workspace

#### 2. Send Error Email

**Trigger:** When API Status = "Error - Invalid Slug"  
**Action:** Send email to submitter  
**Template:**

```
Subject: Action Required: EPP Enrollment Issue

Hi {{Submitter Name}},

We received your Expanded Partner Program enrollment, but there was an issue with your workspace slug.

Workspace Slug Provided: {{Workspace Slug}}
Error: {{Error Message}}

Please resubmit the form with your correct workspace slug. You can find your workspace slug in your Webflow dashboard under Workspace Settings.

Need help? Reply to this email or contact support.

Thanks,
The Webflow Team
```

#### 3. Success Confirmation (Optional)

**Trigger:** When API Status = "Success"  
**Action:** Send confirmation email OR update external system  
**Note:** Marketo handles welcome email, this is for internal tracking

## Experts Base (Existing)

This base already exists. Scripts reference these tables:

### Experts Table

**Table ID:** `tblD1iKe1AN8Scurm`

Key fields used by automation:
- UID: `fldq8yeuXlOxOl6L1`
- Email: Various email fields
- Status: `fldCml9S56mfACk7M`
- Mongo Sync Response: `fld5bOMS6HLpPyvds`
- Mongo Sync Status: `fldsgf3WwTlocnNJx`

### Services Table

**Table ID:** `tblMiwe7q1jV0gwE1`

Linked from Experts table for service offerings.

## Security & Access

### API Keys

Store in Airtable automation secrets:
- `apiKeyAcceptance` - Acceptance environment
- `apiKeyProduction` - Production environment
- Never commit keys to git
- Rotate keys periodically

### Base Permissions

- **Admin:** Full access (for setup/troubleshooting)
- **Editor:** Can view/edit records (for manual fixes)
- **Commenter:** Read-only + comments (for stakeholders)

Automations run with base permissions, not user permissions.

## Monitoring

### Key Metrics

Track in views/reports:
- Total enrollments
- Success rate (success / total)
- Error rate by type
- Average processing time
- Retry success rate

### Alerts

Set up notifications for:
- Error rate > 10%
- Automation failure
- API response time > 5s
- Duplicate enrollments

## Integration Points

### External Systems

1. **Mongo API** - Primary backend
2. **Iterable** - Email marketing / lifecycle
3. **Marketo** - Welcome emails / campaigns
4. **Webflow Form** - Initial data entry

### Data Flow

```
Webflow Form
    ↓
EPP Enrollment (Airtable)
    ↓
Airtable Automation (epp-enrollment.js)
    ↓
Mongo API (/api/v1/marketplace/epp/enroll)
    ↓
Success: Iterable + Marketo
Error: Email to Submitter
```

## Troubleshooting

### Common Issues

**Duplicate submissions:**
- Add unique constraint on Workspace Slug
- Check for duplicates before API call
- Return friendly error to user

**Invalid field IDs:**
- Field IDs change if field deleted
- Always use field ID, not field name
- Test after any schema changes

**Automation doesn't trigger:**
- Check trigger conditions
- Verify view includes record
- Check automation is enabled
- Review run history for errors

### Support Contacts

- **Airtable Schema:** [Team contact]
- **API Endpoints:** Aaron Resnick
- **Mongo Backend:** [Engineering team]
- **Marketing Tools:** [Marketing team]

