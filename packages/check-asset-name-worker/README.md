# Check Asset Name Worker

Cloudflare Worker replacement for the legacy `check-asset-name.vercel.app` validation helper used by Webflow Marketplace forms.

## Endpoints

- `POST /api/checkTemplatename`
- `POST /api/checkTemplateuser`
- `POST /api/checkTemplateemail`
- `POST /api/checkLibraryname`
- `POST /api/checkLibraryuser`
- `POST /api/checkLibraryemail`

Template endpoints preserve the existing template submission contract. Library endpoints provide migration support for the archived `webflow.com/libraries/submit` flow, but they are not a complete Library submission app.

## Library Configuration

Library name checks query the Airtable Assets table and scope matches to the configured Library asset type, defaulting to `Library📚`.

Optional Library user overrides:

- `AIRTABLE_LIBRARY_USERS_TABLE_ID`
- `AIRTABLE_LIBRARY_USERS_VIEW_ID`
- `AIRTABLE_LIBRARY_USER_EMAIL_FIELDS`
- `AIRTABLE_LIBRARY_PERMISSION_TABLE_ID`
- `AIRTABLE_LIBRARY_PERMISSION_VIEW_ID`
- `AIRTABLE_LIBRARY_PERMISSION_EMAIL_FIELDS`
- `AIRTABLE_LIBRARY_PERMISSION_FIELD`
- `AIRTABLE_LIBRARY_PERMISSION_ALLOWED_VALUES`
- `AIRTABLE_LIBRARY_ASSET_TYPE`

Confirm the production Airtable Library user table/view and permission field before routing public `/api/checkLibraryuser` traffic here.

## Validation

```bash
corepack pnpm --filter @create-something/check-asset-name-worker test
```
