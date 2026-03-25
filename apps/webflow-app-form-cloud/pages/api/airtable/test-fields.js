import { requireAdminApiToken } from '../../../lib/apiAuth';
import { getEnvValue } from '../../../lib/cloudflareRuntime';

/**
 * Test Airtable Fields
 * GET /api/airtable/test-fields
 * GET /api/airtable/test-fields?searchClientId=xxx
 *
 * Returns sample records to inspect field names
 * If searchClientId is provided, searches all records for that value
 */
export default async function handler(req, res) {
  if (!await requireAdminApiToken(req, res)) {
    return;
  }

  try {
    const AIRTABLE_API_KEY = await getEnvValue('AIRTABLE_API_KEY');
    const BASE_ID = 'appMoIgXMTTTNIc3p';
    const TABLE_ID = 'tblRwzpWoLgE9MrUm';

    if (!AIRTABLE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Airtable API key not configured'
      });
    }

    const { searchClientId } = req.query;

    // If searching for a specific Client ID
    if (searchClientId) {
      // Get more records to search through
      const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?maxRecords=100`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      // Search for the Client ID in all fields
      const matches = [];

      data.records?.forEach(record => {
        const fields = record.fields;
        const matchingFields = [];

        // Check each field for the Client ID
        Object.entries(fields).forEach(([fieldName, fieldValue]) => {
          if (typeof fieldValue === 'string' && fieldValue.includes(searchClientId)) {
            matchingFields.push({
              fieldName,
              fieldValue
            });
          }
        });

        if (matchingFields.length > 0) {
          matches.push({
            recordId: record.id,
            matchingFields,
            allFields: fields
          });
        }
      });

      return res.status(200).json({
        success: true,
        searchClientId,
        totalRecordsSearched: data.records?.length || 0,
        matchesFound: matches.length,
        matches,
        // Also return a sample record to see all available fields
        sampleFieldNames: data.records?.[0] ? Object.keys(data.records[0].fields) : []
      });
    }

    // Default behavior: Get first few records without filter
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?maxRecords=3`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    res.status(200).json({
      success: true,
      recordCount: data.records?.length || 0,
      sampleRecord: data.records?.[0] ? {
        id: data.records[0].id,
        fieldNames: Object.keys(data.records[0].fields),
        fields: data.records[0].fields
      } : null,
      allRecords: data.records?.map(r => ({
        id: r.id,
        clientId: r.fields['ℹ️Client ID (🖥️ only)'] || r.fields['Client ID'] || 'NOT FOUND',
        appName: r.fields['App Name']
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
