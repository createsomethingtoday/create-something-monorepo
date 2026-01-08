/**
 * EPP (Expanded Partner Program) Enrollment Automation
 *
 * Creates Expert/Partner profiles from EPP Lead Capture form submissions.
 *
 * TRIGGER: When webhook received (Marketo form submission)
 *
 * INPUT VARIABLES:
 * - workspaceSlug: Workspace slug from webhook/form (required)
 * - recordId: Airtable record ID (from action 1 - create record)
 *
 * WORKFLOW:
 * 1. Validate workspace slug format
 * 2. Build API payload from form data
 * 3. Call Mongo API (POST /api/v1/marketplace/profile)
 * 4. Update "Mongo Enrollment API Response" field with result
 * 5. Set Status to "Success" or "Failed"
 */

// ========================
// CONSTANTS
// ========================

const API_KEY = 'Bearer z5PRD8X6TkEMrOmfLhQdz4wbT1VPEH4UfUINlFtqptQ';
const API_URL = 'https://webflow.com/api/v1/marketplace/profile';
const SUBMISSIONS_TABLE = 'tblhpf95EWJPhbbYk';

// Airtable Field IDs and Names
const FIELDS = {
  // Output fields
  STATUS: 'fld3wMN6RsJHkJ2r1',
  API_RESPONSE: 'fldhkHXSOK6OS4Xy7',
  // Input fields
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

const config = input.config();
const submissions = base.getTable(SUBMISSIONS_TABLE);
const eppRecord = await submissions.selectRecordAsync(config.recordId);

// ========================
// EXTRACT & VALIDATE DATA
// ========================

const workspaceSlug = config.workspaceSlug;
const email = eppRecord.getCellValueAsString(FIELDS.EMAIL);
const firstName = eppRecord.getCellValueAsString(FIELDS.FIRST_NAME);
const lastName = eppRecord.getCellValueAsString(FIELDS.LAST_NAME);
const fullName = eppRecord.getCellValueAsString(FIELDS.FULL_NAME);
const companyName = eppRecord.getCellValueAsString(FIELDS.COMPANY_NAME);
const websiteUrl = eppRecord.getCellValueAsString(FIELDS.WEBSITE_URL);
const buildingOnWebflow = eppRecord.getCellValueAsString(FIELDS.BUILDING_ON_WEBFLOW);
const employees = eppRecord.getCellValue(FIELDS.EMPLOYEES);
const typicalProjectSize = eppRecord.getCellValueAsString(FIELDS.TYPICAL_PROJECT_SIZE);
const minProjectSize = eppRecord.getCellValueAsString(FIELDS.MIN_PROJECT_SIZE);
const primaryCountry = eppRecord.getCellValueAsString(FIELDS.PRIMARY_COUNTRY);

const validation = validateWorkspaceSlug(workspaceSlug);
if (!validation.valid) {
  await submissions.updateRecordAsync(config.recordId, {
    [FIELDS.STATUS]: 'Failed',
    [FIELDS.API_RESPONSE]: JSON.stringify({ error: validation.error })
  });
  return;
}

// ========================
// BUILD API PAYLOAD
// ========================

const payload = {
  workspaceId: validation.slug,
  name: companyName || fullName || `${firstName} ${lastName}`.trim(),
  expertsMetadata: {
    airtableId: config.recordId,
    expertSince: new Date().toISOString(),
    partnerType: 'EXPANDED_PARTNER_PROGRAM',
    status: 'ACTIVE',
    enrollmentSource: 'epp_lead_capture',
    contactInfo: { firstName, lastName, fullName }
  }
};

if (websiteUrl) payload.websiteUrl = websiteUrl;
if (email) payload.inquiryEmailAddress = email;
if (primaryCountry) payload.country = primaryCountry;
if (employees) payload.expertsMetadata.teamSize = employees;
if (buildingOnWebflow) payload.expertsMetadata.serviceStatus = buildingOnWebflow;

const minProjectValue = parseCurrency(minProjectSize);
if (minProjectValue) {
  payload.expertsMetadata.projectMinimum = { value: minProjectValue, unit: 'USD' };
}

const typicalProjectValue = parseCurrency(typicalProjectSize);
if (typicalProjectValue) {
  payload.expertsMetadata.typicalProjectSize = { value: typicalProjectValue, unit: 'USD' };
}

// ========================
// CALL MONGO API
// ========================

try {
  const apiResponse = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': API_KEY
    },
    body: JSON.stringify(payload)
  });

  let response;
  try {
    response = await apiResponse.json();
  } catch {
    response = { error: 'Non-JSON response', status: apiResponse.status };
  }

  const isSuccess = apiResponse.ok && !response.error && !response.code;

  await submissions.updateRecordAsync(config.recordId, {
    [FIELDS.STATUS]: isSuccess ? 'Success' : 'Failed',
    [FIELDS.API_RESPONSE]: JSON.stringify(response, null, 2)
  });

} catch (error) {
  await submissions.updateRecordAsync(config.recordId, {
    [FIELDS.STATUS]: 'Failed',
    [FIELDS.API_RESPONSE]: JSON.stringify({ error: error.message || 'Network error' })
  });
}
