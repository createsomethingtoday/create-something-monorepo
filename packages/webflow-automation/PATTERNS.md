# Automation Patterns

Common patterns used in Airtable → Mongo API automations.

## Pattern 1: Sync Existing Record (Experts)

**Use case:** Update an existing resource that may or may not exist in Mongo yet.

**Key characteristics:**
- Triggered by record **update** in Airtable
- Uses both POST (create) and PUT (update) methods
- Decision based on presence of `createdOn` field
- Extensive payload (50+ fields)
- Writes back Mongo IDs and timestamps

**Flow:**

```
User edits Expert record in Airtable
    ↓
Automation triggers on record update
    ↓
Check if createdOn exists
    ↓
├─ NO → POST (create new profile)
│   ↓
│   Write back: id, slug, createdOn, updatedOn
│
└─ YES → PUT (update existing profile)
    ↓
    Write back: updatedOn
    ↓
Log response and status in Airtable
```

**Key code patterns:**

```javascript
// Determine method based on existing data
if (!inputConfig.createdOn) {
  requestMethod = 'POST';
  // Minimal payload
} else {
  requestMethod = 'PUT';
  // Full payload with all fields
}

// Write back different fields based on method
if (requestMethod === 'POST') {
  payloadForRecord['fldK5cr2ZG6JcQkPf'] = response.id;
  payloadForRecord['fldtyyo0RoVD4AgJ0'] = response.slug;
  payloadForRecord['fldr8LY63os8wo0OQ'] = response.createdOn;
}
payloadForRecord['fldeRHn8R3nUqmXLb'] = response.updatedOn;
```

## Pattern 2: Process New Submission (EPP)

**Use case:** Process a form submission, validate, call API, handle errors.

**Key characteristics:**
- Triggered by record **creation** (new form submission)
- Always POST (one-time enrollment)
- Validation before API call
- Error handling with user notification
- Integration with external services (Iterable, Marketo)

**Flow:**

```
User submits form → New record in Airtable
    ↓
Automation triggers on record creation
    ↓
Validate input (workspace slug)
    ↓
├─ INVALID → Send error email to user
│              Update record with error
│              Exit
│
└─ VALID → Call Mongo API
    ↓
    ├─ SUCCESS → Update record (enrolled date)
    │            Report to Iterable (prevent follow-ups)
    │            Report to Marketo (welcome email)
    │
    └─ ERROR → Check error type
        ↓
        ├─ Invalid slug → Send error email
        │
        └─ Other error → Log, flag for manual review
```

**Key code patterns:**

```javascript
// Pre-flight validation
const validation = validateWorkspaceSlug(workspaceSlug);
if (!validation.valid) {
  // Update record and exit early
  await enrollmentTable.updateRecordAsync(recordID, {
    [FIELDS.API_STATUS]: { id: STATUS.ERROR_INVALID_SLUG },
    [FIELDS.ERROR_MESSAGE]: validation.error
  });
  return; // Early exit
}

// Post-processing integrations
if (isSuccess) {
  await reportToIterable(email, 'success', workspaceSlug);
  await reportToMarketo(email, 'success', workspaceSlug);
}
```

## Pattern 3: Error Handling

Both scripts use similar error handling patterns:

### Try-Catch for Network Errors

```javascript
try {
  const response = await fetch(url, options);
  // ... handle response
} catch (error) {
  // Network error (timeout, connection failed, etc.)
  console.error('Fetch error:', error);
  await table.updateRecordAsync(recordID, {
    [FIELDS.ERROR]: error.message
  });
}
```

### Response Parsing with Fallback

```javascript
let response;
try {
  response = await r.json();
} catch (parseError) {
  // Non-JSON response (server error, HTML error page, etc.)
  console.error('Error parsing JSON:', parseError);
  response = {
    error: `Non-JSON response: ${await r.text()}`,
    status: r.status
  };
}
```

### Status-Based Error Detection

```javascript
// Check multiple error indicators
const isSuccess = 
  apiResponse.ok &&                      // HTTP 200-299
  !response.hasOwnProperty('error') &&   // No error field
  !response.hasOwnProperty('code');      // No error code

if (isSuccess) {
  // Success path
} else {
  // Error path
  const errorMessage = 
    response.message || 
    response.error || 
    'Unknown error';
}
```

## Pattern 4: Environment Configuration

Both scripts support acceptance/production environments:

```javascript
// Constants for both environments
const apiKeyAcceptance = 'ACCEPTANCE_KEY';
const apiKeyProduction = 'PRODUCTION_KEY';
const baseURLAcceptance = 'https://webflowtest.com';
const baseURLProduction = 'https://webflow.com';

// Set based on input variable
let apiKey = 'Bearer ';
let requestURL = '';

if (inputConfig.environment === 'production') {
  apiKey = `${apiKey} ${apiKeyProduction}`;
  requestURL = `${baseURLProduction}${endpoint}`;
} else {
  apiKey = `${apiKey} ${apiKeyAcceptance}`;
  requestURL = `${baseURLAcceptance}${endpoint}`;
}
```

**Best practice:** Always test in acceptance first, then deploy to production.

## Pattern 5: Field Mapping

Airtable uses field IDs (not names) for reliability:

```javascript
// Define constants at top of script
const FIELDS = {
  WORKSPACE_SLUG: 'fldWorkspaceSlug',      // Get from Airtable
  API_STATUS: 'fldAPIStatus',
  API_RESPONSE: 'fldAPIResponse'
};

// Use in code
const slug = record.getCellValueAsString(FIELDS.WORKSPACE_SLUG);

await table.updateRecordAsync(recordID, {
  [FIELDS.API_STATUS]: { id: 'selSuccess' },  // Select field needs { id: ... }
  [FIELDS.API_RESPONSE]: JSON.stringify(response)  // Text field takes string
});
```

**Why field IDs?** Field names can change, but IDs are permanent. Using IDs prevents automation breakage.

## Pattern 6: Status Tracking

Track status with single-select field + response JSON:

```javascript
// Define status options
const STATUS = {
  PENDING: 'selPending',
  SUCCESS: 'selSuccess',
  ERROR: 'selError'
};

// Update status + detailed response
await table.updateRecordAsync(recordID, {
  [FIELDS.API_STATUS]: { id: STATUS.SUCCESS },      // Visual status
  [FIELDS.API_RESPONSE]: JSON.stringify(response),  // Full details
  [FIELDS.ERROR_MESSAGE]: null                      // Clear previous errors
});
```

This pattern gives you:
- **Quick visual status** (colored select field)
- **Full details** for debugging (JSON response)
- **Filterable views** (show only errors, etc.)

## Pattern 7: Conditional Field Mapping

Only send fields that have values:

```javascript
// Build payload dynamically
const payload = { /* required fields */ };

// Add optional fields only if they exist
if (record.getCellValueAsString(FIELDS.BIO)) {
  payload.bio = record.getCellValueAsString(FIELDS.BIO);
}

if (record.getCellValue(FIELDS.AVATAR)?.length > 0) {
  payload.avatar = {
    url: record.getCellValue(FIELDS.AVATAR)[0].url,
    filename: record.getCellValue(FIELDS.AVATAR)[0].filename
  };
}
```

**Why?** Avoids sending `null` or empty values that might overwrite data in Mongo.

## Pattern 8: Array Field Handling

Convert comma-separated strings to arrays:

```javascript
// Languages: "English, Spanish, French"
const languagesString = record.getCellValueAsString(FIELDS.LANGUAGES);
if (languagesString) {
  payload.languages = languagesString.split(', ');
  // Result: ["English", "Spanish", "French"]
}
```

Handle linked records (many-to-many relationships):

```javascript
// Get linked records
const servicesField = record.getCellValue(FIELDS.SERVICES); // Array of {id, name}
const services = [];

for (let service of servicesField) {
  const serviceRecord = servicesTable.getRecord(service.id);
  services.push({
    name: service.name,
    type: serviceRecord.getCellValueAsString(FIELDS.SERVICE_TYPE)
  });
}

payload.services = services;
```

## Pattern 9: External Service Integration

### Fire-and-forget notifications

```javascript
// Don't wait for response, don't block on failure
reportToIterable(email, status).catch(err => {
  console.error('Iterable error (non-blocking):', err);
});

// Continue with main flow
await table.updateRecordAsync(...);
```

### Critical integrations

```javascript
// Wait for response, track success
const iterableSynced = await reportToIterable(email, status);

// Store sync status
await table.updateRecordAsync(recordID, {
  [FIELDS.ITERABLE_SYNCED]: iterableSynced
});

// Can retry later if failed
if (!iterableSynced) {
  // Flag for manual retry
}
```

## Pattern 10: Debugging & Logging

Always log key steps for troubleshooting:

```javascript
console.log('Starting automation...');
console.log('Environment:', inputConfig.environment);
console.log('Record ID:', inputConfig.recordID);

// Log payload before sending (helps debug API errors)
console.log('API Payload:', JSON.stringify(payload, null, 2));

// Log response
console.log('API Response:', response);

// Log before record update
console.log('Updating record with:', payloadForRecord);
```

View logs in Airtable automation run history.

## Decision Matrix: Which Pattern to Use?

| Scenario | Pattern | Example |
|----------|---------|---------|
| Sync existing resource | Update trigger + POST/PUT | Experts sync |
| Process form submission | Create trigger + validation | EPP enrollment |
| One-way data push | POST only | Event tracking |
| Two-way sync | GET + PUT | Profile updates |
| Bulk processing | Scheduled trigger | Daily reports |
| External webhook | Use middleware API | Payment webhooks |

## Common Pitfalls

❌ **Don't:** Use field names instead of IDs
```javascript
record.getCellValue('Email') // Breaks if field renamed
```

✅ **Do:** Use field IDs
```javascript
record.getCellValue('fldEmailAddress123') // Permanent
```

---

❌ **Don't:** Forget to handle JSON parse errors
```javascript
const response = await r.json(); // Throws on non-JSON
```

✅ **Do:** Wrap in try-catch
```javascript
try {
  response = await r.json();
} catch (e) {
  response = { error: await r.text() };
}
```

---

❌ **Don't:** Hard-code environment
```javascript
const apiKey = 'PRODUCTION_KEY'; // Dangerous!
```

✅ **Do:** Use input variables
```javascript
const apiKey = inputConfig.environment === 'production' 
  ? apiKeyProduction 
  : apiKeyAcceptance;
```

---

❌ **Don't:** Let errors fail silently
```javascript
await fetch(url).catch(() => {}); // No way to debug
```

✅ **Do:** Log and store errors
```javascript
try {
  await fetch(url);
} catch (error) {
  console.error('Error:', error);
  await table.updateRecordAsync(recordID, {
    [FIELDS.ERROR]: error.message
  });
}
```

