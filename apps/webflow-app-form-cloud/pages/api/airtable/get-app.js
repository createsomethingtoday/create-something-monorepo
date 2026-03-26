import { getEnvValue } from '../../../lib/cloudflareRuntime';
import { verifyAutofillToken } from '../../../lib/autofillToken';

const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;
const CLIENT_ID_FIELD_ID = 'fldtwvVVlTeDRlTYV';
const ALLOWED_FIELD_NAMES = [
  'Name',
  'ℹ️Capabilities (🖥️ only)',
  '🔗Install URL (🖥️ only)',
  'ℹ️Scopes',
  'Scopes',
  'all-selected-scopes',
  'App Avatar Alt Text',
  'ℹ️💲Payment Types',
  'ℹ️Visibility (🖥️ only)',
  'ℹ️🪣Categories (Text)',
  '🎨Creator Name',
  '👀🎨📧 Creator WF Account Email (Override)',
  '🎨📧 Creator Email',
  'ℹ️Description (Short)',
  'ℹ️Description (Long).html',
  '❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)',
  '🔗Website URL',
  'Developer Notes',
  'ℹ️Credentials',
  '🔗Promo Video URL (🖥️ only)',
  '🔗Demo Video URL',
  '🔗Privacy Policy URL',
  '🔗Support Email/URL',
  '🔗Terms & Conditions URL',
  'Alt Text Screenshot 1',
  'Alt Text Screenshot 2',
  'Alt Text Screenshot 3',
  'Alt Text Screenshot 4',
  'Alt Text Screenshot 5',
  '🖼️Thumbnail Image',
  '🖼️Carousel Images'
];

function sanitizeAttachmentList(value) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((attachment) => ({
    url: attachment?.url,
    filename: attachment?.filename,
    thumbnails: attachment?.thumbnails || null
  }));
}

function buildAutofillFields(fields = {}) {
  return ALLOWED_FIELD_NAMES.reduce((result, fieldName) => {
    if (fields[fieldName] === undefined) {
      return result;
    }

    if (fieldName === '🖼️Thumbnail Image' || fieldName === '🖼️Carousel Images') {
      result[fieldName] = sanitizeAttachmentList(fields[fieldName]);
      return result;
    }

    result[fieldName] = fields[fieldName];
    return result;
  }, {});
}

/**
 * Get App Data from Airtable by Client ID
 * GET /api/airtable/get-app?clientId=xxx
 *
 * Queries Airtable for the allowlisted fields needed by the update autofill flow
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { clientId } = req.query;
  const autofillToken = req.headers['x-autofill-token'];

  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'Client ID is required'
    });
  }

  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Client ID format'
    });
  }

  const tokenIsValid = await verifyAutofillToken({
    token: Array.isArray(autofillToken) ? autofillToken[0] : autofillToken,
    clientId
  });

  if (!tokenIsValid) {
    return res.status(401).json({
      success: false,
      message: 'Autofill authorization is missing or expired. Please verify the Client ID again.'
    });
  }

  try {
    // Airtable configuration
    const AIRTABLE_API_KEY = await getEnvValue('AIRTABLE_API_KEY');
    const BASE_ID = 'appMoIgXMTTTNIc3p';
    const TABLE_ID = 'tblRwzpWoLgE9MrUm';

    if (!AIRTABLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Airtable API key not configured'
      });
    }

    const filterFormula = `{${CLIENT_ID_FIELD_ID}} = "${clientId}"`;

    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Airtable query result:', {
      recordCount: data.records?.length || 0,
      clientId
    });

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No app found with this Client ID'
      });
    }

    const record = data.records[0];

    return res.status(200).json({
      success: true,
      app: {
        id: record.id,
        fields: buildAutofillFields(record.fields),
        createdTime: record.createdTime
      }
    });

  } catch (error) {
    console.error('Airtable query error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to query Airtable',
      error: error.message
    });
  }
}
