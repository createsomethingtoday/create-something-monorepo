import { getEnvValue } from './cloudflareRuntime';
const FORM_METADATA = {
  name: 'Marketplace App Submission',
  siteId: '686294e263eb7e215bd232f7',
  formId: '68bf29b1ab2ee84f31d219e2',
  formElementId: '2b311005-014a-989e-d711-f88519dfe7f6',
  pageId: '689f34529de1c269790e888c',
  publishedPath: '/developers/submit',
  pageUrl: 'https://developers.webflow.com/submit'
};

export function getFieldValue(field) {
  return Array.isArray(field) ? field[0] : field;
}

export function createAirtableSubmissionId(existingId) {
  if (existingId) {
    return existingId;
  }

  return `68dbffcba545b75803b43a99${Math.random().toString(36).slice(2, 11)}`;
}

export function buildSubmissionWebhookData({
  fields,
  blobUrls = [],
  submissionId,
  airtableSubmissionId,
  submittedAt = new Date().toISOString(),
  retryAttempt,
  automaticRetry = false,
}) {
  const paymentTypes = fields.paymentType || [];
  const checkboxFree = Array.isArray(paymentTypes) ? paymentTypes.includes('Free') : paymentTypes === 'Free';
  const checkboxPaid = Array.isArray(paymentTypes) ? paymentTypes.includes('Paid') : paymentTypes === 'Paid';
  const selectedPaymentType = Array.isArray(paymentTypes) ? paymentTypes.join(', ') : (paymentTypes || '');

  const visibility = getFieldValue(fields.visibility);
  const checkboxPublic = visibility === 'Public';
  const checkboxPrivate = visibility === 'Private';

  const resolvedAirtableSubmissionId = createAirtableSubmissionId(airtableSubmissionId);
  const isUpdate = getFieldValue(fields.submissionType) === 'Update';

  const includeField = (fieldValue, defaultValue = '') => {
    if (!isUpdate) {
      return fieldValue !== undefined ? fieldValue : defaultValue;
    }
    return fieldValue !== undefined ? fieldValue : undefined;
  };

  const rawData = {
    'Submission Type': getFieldValue(fields.submissionType) || '',
    'App Name': includeField(getFieldValue(fields.appName), ''),
    'Field 3': getFieldValue(fields.submissionType) === 'Update' ? 'Name updates must be requested via Support' : '',
    'Client Id': getFieldValue(fields.clientId) || '',
    'Is Client ID Validated?': getFieldValue(fields.clientIdVerified) === 'true' || false,
    'App Capabilities': includeField(getFieldValue(fields.appCapabilities), ''),
    'App Install URL': includeField(getFieldValue(fields.appInstallUrl), ''),
    'all-selected-scopes': fields.appScopes !== undefined ? JSON.stringify(fields.appScopes || []) : (isUpdate ? undefined : '[]'),
    'Scope-Justification': includeField(getFieldValue(fields['Scope-Justification']), ''),
    'App Avatar Alt Text': includeField(getFieldValue(fields.appAvatarAltText), ''),
    'Checkbox Free': fields.paymentType !== undefined ? checkboxFree : (isUpdate ? undefined : false),
    'Checkbox Paid': fields.paymentType !== undefined ? checkboxPaid : (isUpdate ? undefined : false),
    'Is Payment type set?': fields.paymentType !== undefined ? paymentTypes.length > 0 : (isUpdate ? undefined : false),
    'Selected Payment Type': fields.paymentType !== undefined ? selectedPaymentType : (isUpdate ? undefined : ''),
    'Checkbox Public': fields.visibility !== undefined ? checkboxPublic : (isUpdate ? undefined : false),
    'Checkbox Private': fields.visibility !== undefined ? checkboxPrivate : (isUpdate ? undefined : false),
    'Is Marketplace visibility set?': fields.visibility !== undefined ? Boolean(visibility) : (isUpdate ? undefined : false),
    'Selected Visibility Type': includeField(visibility, ''),
    'Creator Name': includeField(getFieldValue(fields.creatorName), ''),
    'WF Account Email': includeField(getFieldValue(fields.creatorWebsite), ''),
    'Creator Email Address': includeField(getFieldValue(fields.creatorContactEmail), ''),
    'App Category': fields.appCategory !== undefined ? (Array.isArray(fields.appCategory) ? fields.appCategory.join(', ') : (fields.appCategory || '')) : (isUpdate ? undefined : ''),
    'Short Description': includeField(getFieldValue(fields.appPreviewDescription), ''),
    'Field 25': '',
    'Field 26': '',
    'Long-Description': includeField(getFieldValue(fields.appDetailDescription), ''),
    'Promo Video URL': includeField(getFieldValue(fields.appVideoUrl), ''),
    'Alt Text Screenshot 1': includeField(getFieldValue(fields.screenshotAltText0), ''),
    'Alt Text Screenshot 2': includeField(getFieldValue(fields.screenshotAltText1), ''),
    'Alt Text Screenshot 3': includeField(getFieldValue(fields.screenshotAltText2), ''),
    'Alt Text Screenshot 4': includeField(getFieldValue(fields.screenshotAltText3), ''),
    'Alt Text Screenshot 5': includeField(getFieldValue(fields.screenshotAltText4), ''),
    'consolidated-screenshot-alt-texts': includeField(getFieldValue(fields.consolidatedScreenshotAltTexts), ''),
    'Features Overview': includeField(getFieldValue(fields.appFeaturesOverview), ''),
    'Website URL': includeField(getFieldValue(fields.appWebsiteUrl), ''),
    'Developer Notes': includeField(getFieldValue(fields.appDeveloperNotes), ''),
    'App Access Credentials': includeField(getFieldValue(fields.appAccessCredentials), ''),
    'Credentials Tier Confirmation': fields.credentialsTierConfirmation !== undefined ? (getFieldValue(fields.credentialsTierConfirmation) === 'true' || false) : (isUpdate ? undefined : false),
    'Demo Video URL': includeField(getFieldValue(fields.appDemoVideoUrl), ''),
    'Privacy Policy URL': includeField(getFieldValue(fields.appPrivacyPolicyUrl), ''),
    'Support Email': includeField(getFieldValue(fields.appSupportEmail), ''),
    'Support URL': includeField(getFieldValue(fields.appSupportUrl), ''),
    'Terms and Conditions URL': includeField(getFieldValue(fields.appTermsUrl), ''),
    'Checkbox Agree To Webflow Policies And Terms': fields.agreementAccepted !== undefined ? (getFieldValue(fields.agreementAccepted) === 'true' || false) : (isUpdate ? undefined : false),
    'App Avatar Image': blobUrls[0] || (isUpdate ? undefined : ''),
    'App Screenshot 1': blobUrls[1] || (isUpdate ? undefined : ''),
    'App Screenshot 2': blobUrls[2] || (isUpdate ? undefined : ''),
    'App Screenshot 3': blobUrls[3] || (isUpdate ? undefined : ''),
    'App Screenshot 4': blobUrls[4] || (isUpdate ? undefined : ''),
    'App Screenshot 5': blobUrls[5] || (isUpdate ? undefined : ''),
    submittedAt,
    id: resolvedAirtableSubmissionId,
    dbSubmissionId: submissionId,
    formId: FORM_METADATA.formId,
    formElementId: FORM_METADATA.formElementId,
    pageId: FORM_METADATA.pageId,
    publishedPath: FORM_METADATA.publishedPath,
    pageUrl: FORM_METADATA.pageUrl
  };

  if (retryAttempt !== undefined) {
    rawData.retryAttempt = retryAttempt;
  }

  if (automaticRetry) {
    rawData.automaticRetry = true;
  }

  const data = Object.fromEntries(
    Object.entries(rawData).filter(([_, value]) => value !== undefined)
  );

  return {
    airtableSubmissionId: resolvedAirtableSubmissionId,
    webhookData: {
      payload: {
        name: FORM_METADATA.name,
        siteId: FORM_METADATA.siteId,
        data
      }
    }
  };
}

export async function sendSubmissionWebhook(webhookData, runtime = {}) {
  const webhookUrl = await getEnvValue('WEBHOOK_URL', runtime);
  if (!webhookUrl) {
    throw new Error('WEBHOOK_URL is not configured');
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(webhookData)
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }

  return response.json().catch(() => ({}));
}
