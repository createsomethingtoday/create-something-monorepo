/**
 * EPP (Expanded Partner Program) Enrollment Automation
 * 
 * Creates Expert/Partner profiles from EPP Lead Capture form submissions.
 * Checks for existing profile first to avoid duplicate API calls.
 * 
 * TRIGGER: When webhook received (Marketo form submission)
 * ENVIRONMENT: Production or Acceptance (via input variable)
 * 
 * INPUT VARIABLES:
 * - workspaceSlug: Workspace slug from webhook/form (required)
 * - recordId: Airtable record ID (from action 1 - create record)
 * - environment: 'production' | 'acceptance' (optional, defaults to production)
 * 
 * WORKFLOW:
 * 1. Check if profile already exists in Marketplace Experts
 *    - If YES: Link to existing profile, mark "Success", EXIT
 *    - If NO: Continue...
 * 2. Validate workspace slug format
 * 3. Build API payload from form data
 * 4. Call Mongo API (POST /api/v1/marketplace/profile)
 * 5. Update "Mongo Enrollment API Response" field with result
 * 6. Set Status to "Success" or "Failed"
 * 
 * AIRTABLE FIELDS (from EPP Lead Capture):
 * - Webflow Workspace slug
 * - Email address
 * - First name / Last name / Full name
 * - Company/Agency name
 * - Agency/Portfolio Website URL
 * - Building websites on behalf of Webflow?
 * - Full-time employees
 * - Typical project size
 * - Minimum project size
 * - Primary country/region of operation
 * - Status (Success/Failed) - written by this script
 * - Mongo Enrollment API Response - written by this script
 * 
 * API ENDPOINT: /api/v1/marketplace/profile (shared with Experts sync)
 * METHOD: POST (always create new profile)
 */

// ========================
// CONSTANTS & CONFIGURATION
// ========================

let apiKey = `Bearer`;

// API Keys (shared with Experts sync)
const apiKeyAcceptance = 'S128Pt7AVFxjnCNySxAoH7iSK2rHu_PnXqcAzI1C93Q';
const apiKeyProduction = 'z5PRD8X6TkEMrOmfLhQdz4wbT1VPEH4UfUINlFtqptQ';

// Base URLs
const baseURLAcceptance = 'https://webflowtest.com';
const baseURLProduction = 'https://webflow.com';

// Shared endpoint with Experts profile API
const endpoint = '/api/v1/marketplace/profile';

// Airtable Table IDs (from your existing automation)
const TABLES = {
  SUBMISSIONS: 'tblhpf95EWJPhbbYk', // EPP Lead Capture
  PROFILES: 'tblws6bifnpRXnbjb'     // Marketplace Experts
};

// Airtable Field IDs and Names
const FIELDS = {
  // Output fields (use field IDs - these are confirmed correct)
  STATUS: 'fld3wMN6RsJHkJ2r1',              // Status (Success/Failed)
  LINKED_PROFILE: 'fldl8mDUg6Yk3Qgad',      // Marketplace Experts (Link to another record)
  API_RESPONSE: 'fldhkHXSOK6OS4Xy7',        // Mongo Enrollment API Response (Long text)
  
  // Input fields (use field names - more reliable across tables)
  WORKSPACE_SLUG: 'Webflow Workspace slug',
  EMAIL: 'Email address',
  FIRST_NAME: 'First name',
  LAST_NAME: 'Last name',
  FULL_NAME: 'Full name',
  COMPANY_NAME: 'Company/Agency name',
  WEBSITE_URL: 'Agency/Portfolio Website URL',
  BUILDING_ON_WEBFLOW: 'Building websites on behalf of Webflow?',
  EMPLOYEES: 'Full-time employees',
  MIN_PROJECT_SIZE: 'Minimum project size',
  TYPICAL_PROJECT_SIZE: 'Typical project size',
  PRIMARY_COUNTRY: 'Primary country/region of operation'
};

// Marketplace Experts table field
const PROFILE_FIELDS = {
  MONGO_SLUG: '🥭Mongo Profile Slug'
};

// ========================
// VALIDATION FUNCTIONS
// ========================

/**
 * Validates workspace slug format
 * Format: alphanumeric, hyphens, underscores, 3-63 characters
 */
function validateWorkspaceSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Workspace slug is required' };
  }

  const trimmedSlug = slug.trim();

  // Check length
  if (trimmedSlug.length < 3 || trimmedSlug.length > 63) {
    return { valid: false, error: 'Workspace slug must be between 3 and 63 characters' };
  }

  // Check format: alphanumeric, hyphens, underscores
  const slugRegex = /^[a-z0-9][a-z0-9-_]*[a-z0-9]$/i;
  if (!slugRegex.test(trimmedSlug)) {
    return { valid: false, error: 'Workspace slug can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true, slug: trimmedSlug };
}

/**
 * Parse currency string to number
 * Handles: "$20000", "$20,000", "20000", etc.
 */
function parseCurrency(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  
  // Remove $, commas, and parse
  const cleaned = String(value).replace(/[$,]/g, '');
  const parsed = parseInt(cleaned, 10);
  
  return isNaN(parsed) ? null : parsed;
}

// ========================
// INITIALIZATION
// ========================

console.log('Starting EPP enrollment workflow...');

const config = input.config();
let requestURL = '';

// Default to production if not specified
const environment = config.environment || 'production';

console.log('Environment:', environment);
console.log('Record ID:', config.recordId);
console.log('Workspace Slug:', config.workspaceSlug);

// Set environment-specific configuration
if (environment === 'production') {
  apiKey = `${apiKey} ${apiKeyProduction}`;
  requestURL = `${baseURLProduction}${endpoint}`;
} else {
  apiKey = `${apiKey} ${apiKeyAcceptance}`;
  requestURL = `${baseURLAcceptance}${endpoint}`;
}

// Get tables
const submissions = base.getTable(TABLES.SUBMISSIONS); // EPP Lead Capture
const profiles = base.getTable(TABLES.PROFILES);       // Marketplace Experts

// Get the submission record
const eppRecord = await submissions.selectRecordAsync(config.recordId);

console.log('Fetched EPP record');

// ========================
// CHECK IF PROFILE EXISTS
// ========================

// First, check if a profile already exists in Airtable with this workspace slug
// This avoids unnecessary API calls and handles the case where profile was created previously
console.log('Checking for existing profile with slug:', config.workspaceSlug);

const existingProfileQuery = await profiles.selectRecordsAsync({
  fields: [PROFILE_FIELDS.MONGO_SLUG]
});

const existingProfile = existingProfileQuery.records.find(r => 
  r.getCellValueAsString(PROFILE_FIELDS.MONGO_SLUG) === config.workspaceSlug
);

if (existingProfile) {
  console.log('✅ Profile already exists in Airtable!', existingProfile.id);
  
  // Link to existing profile and mark success (no API call needed)
  await submissions.updateRecordAsync(config.recordId, {
    [FIELDS.STATUS]: 'Success',
    [FIELDS.LINKED_PROFILE]: [{ id: existingProfile.id }],
    [FIELDS.API_RESPONSE]: JSON.stringify({
      status: 'already_exists',
      message: 'Profile already exists for this workspace. Linked to existing profile.',
      linkedProfileId: existingProfile.id,
      profileSlug: config.workspaceSlug,
      timestamp: new Date().toISOString()
    }, null, 2)
  });
  
  console.log('Linked to existing profile. No API call needed. Workflow complete.');
  return; // Exit - profile already exists
}

console.log('No existing profile found. Proceeding to create new profile via API...');

// ========================
// EXTRACT & VALIDATE DATA
// ========================

// Extract data from record (using actual field IDs)
const workspaceSlug = config.workspaceSlug;
const email = eppRecord.getCellValueAsString(FIELDS.EMAIL);
const firstName = eppRecord.getCellValueAsString(FIELDS.FIRST_NAME);
const lastName = eppRecord.getCellValueAsString(FIELDS.LAST_NAME);
const fullName = eppRecord.getCellValueAsString(FIELDS.FULL_NAME); // Formula field
const companyName = eppRecord.getCellValueAsString(FIELDS.COMPANY_NAME);
const websiteUrl = eppRecord.getCellValueAsString(FIELDS.WEBSITE_URL);
const buildingOnWebflow = eppRecord.getCellValueAsString(FIELDS.BUILDING_ON_WEBFLOW);
const employees = eppRecord.getCellValue(FIELDS.EMPLOYEES); // Single select
const typicalProjectSize = eppRecord.getCellValueAsString(FIELDS.TYPICAL_PROJECT_SIZE);
const minProjectSize = eppRecord.getCellValueAsString(FIELDS.MIN_PROJECT_SIZE);
const primaryCountry = eppRecord.getCellValueAsString(FIELDS.PRIMARY_COUNTRY);

console.log('Workspace Slug:', workspaceSlug);
console.log('Email:', email);
console.log('Company:', companyName);

// Step 1: Validate workspace slug
const validation = validateWorkspaceSlug(workspaceSlug);
if (!validation.valid) {
  console.error('Validation failed:', validation.error);
  
  // Update record with error (using field IDs)
  await submissions.updateRecordAsync(config.recordId, {
    [FIELDS.STATUS]: 'Failed',
    [FIELDS.API_RESPONSE]: JSON.stringify({ 
      error: validation.error,
      timestamp: new Date().toISOString()
    }, null, 2)
  });
  
  console.log('Validation error recorded. Exiting.');
  return; // Exit script
}

console.log('✅ Workspace slug validated');

// ========================
// BUILD API PAYLOAD
// ========================

// Build payload similar to Experts sync
let payloadForEndpoint = {
  workspaceId: validation.slug,
  name: companyName || fullName || `${firstName} ${lastName}`.trim(),
  expertsMetadata: {
    airtableId: config.recordId,
    expertSince: new Date().toISOString(),
    partnerType: 'EXPANDED_PARTNER_PROGRAM', // EPP identifier
    status: 'ACTIVE', // New EPP enrollments start active
    enrollmentSource: 'epp_lead_capture'
  }
};

// Add optional fields if they exist
if (websiteUrl) {
  payloadForEndpoint.websiteUrl = websiteUrl;
}

if (email) {
  payloadForEndpoint.inquiryEmailAddress = email;
}

if (primaryCountry) {
  payloadForEndpoint.country = primaryCountry;
}

// Add project size information
const minProjectValue = parseCurrency(minProjectSize);
if (minProjectValue) {
  payloadForEndpoint.expertsMetadata.projectMinimum = {
    value: minProjectValue,
    unit: 'USD'
  };
}

const typicalProjectValue = parseCurrency(typicalProjectSize);
if (typicalProjectValue) {
  payloadForEndpoint.expertsMetadata.typicalProjectSize = {
    value: typicalProjectValue,
    unit: 'USD'
  };
}

// Add additional metadata
if (employees) {
  payloadForEndpoint.expertsMetadata.teamSize = employees;
}

if (buildingOnWebflow) {
  payloadForEndpoint.expertsMetadata.serviceStatus = buildingOnWebflow;
}

// Add contact information to metadata
payloadForEndpoint.expertsMetadata.contactInfo = {
  email: email,
  firstName: firstName,
  lastName: lastName,
  fullName: fullName
};

console.log('Payload prepared:', JSON.stringify(payloadForEndpoint, null, 2));

// ========================
// CALL MONGO API
// ========================

console.log('Calling Mongo API...');

try {
  const apiResponse = await fetch(requestURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': apiKey
    },
    body: JSON.stringify(payloadForEndpoint)
  });

  console.log('API response status:', apiResponse.status);

  // Parse response
  let response;
  try {
    response = await apiResponse.json();
  } catch (parseError) {
    console.error('Error parsing JSON response:', parseError);
    response = {
      error: `Non-JSON response: ${await apiResponse.text()}`,
      status: apiResponse.status
    };
  }

  console.log('API Response:', response);

  // Determine success/failure
  const isSuccess = apiResponse.ok && !response.hasOwnProperty('error') && !response.hasOwnProperty('code');
  
  // Prepare record update (using field IDs)
  let recordUpdate = {
    [FIELDS.API_RESPONSE]: JSON.stringify(response, null, 2)
  };

  if (isSuccess) {
    // Success path - profile created in Mongo
    recordUpdate[FIELDS.STATUS] = 'Success';
    console.log('✅ Enrollment successful! Profile created in Mongo.');
    console.log('Profile ID:', response.id);
    console.log('Profile Slug:', response.slug);
    
    // Note: The profile will eventually sync back to Airtable Marketplace Experts table
    // The link can be established later when that happens
  } else {
    // Error path
    recordUpdate[FIELDS.STATUS] = 'Failed';
    const errorMessage = response.message || response.error || 'Unknown API error';
    console.error('❌ Enrollment failed:', errorMessage);
    
    // Common errors:
    // - Invalid slug format (should be caught by validation)
    // - Duplicate workspace (if Mongo detects it exists)
    // - Missing required fields
    // - API/network errors
  }

  // Update Airtable record
  await submissions.updateRecordAsync(config.recordId, recordUpdate);
  console.log('Record updated successfully');

} catch (error) {
  // Handle network/fetch errors
  console.error('Fetch error:', error);
  
  await submissions.updateRecordAsync(config.recordId, {
    [FIELDS.STATUS]: 'Failed',
    [FIELDS.API_RESPONSE]: JSON.stringify({ 
      error: 'Network error',
      message: error.message || 'Failed to connect to API',
      timestamp: new Date().toISOString()
    }, null, 2)
  });
}

console.log('EPP enrollment workflow complete');
