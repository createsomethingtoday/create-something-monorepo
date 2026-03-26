import { createAutofillToken } from '../../lib/autofillToken';
import { getEnvValue } from '../../lib/cloudflareRuntime';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Valid client IDs are 64-character hexadecimal strings (SHA-256 hashes)
  const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;

  try {
    const { clientId, submissionType } = req.body;

    if (!clientId) {
      return res.status(400).json({
        clientIdExists: false,
        error: 'Client ID is required'
      });
    }

    // Validate client ID format before checking existence
    if (!CLIENT_ID_PATTERN.test(clientId)) {
      return res.status(400).json({
        clientIdExists: false,
        error: 'Invalid Client ID format. Client ID must be a 64-character hexadecimal string.'
      });
    }

    if (!submissionType) {
      return res.status(400).json({
        clientIdExists: false,
        error: 'Submission type is required'
      });
    }

    // Call the actual Webflow verification API that the original form uses
    try {
      const response = await fetch('https://check-asset-name.vercel.app/api/checkAppclientid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      });

      const data = await response.json();

      const clientIdExists = data.clientIdExists || false;
      const autofillToken = clientIdExists && submissionType === 'Update'
        ? await createAutofillToken({ clientId })
        : null;

      res.status(200).json({
        clientIdExists,
        autofillToken,
        message: data.message || 'Client ID check completed'
      });

    } catch (apiError) {
      console.error('External API error:', apiError);

      // Fallback logic if the external API is unavailable
      const validClientIds = (await getEnvValue('VALID_CLIENT_IDS'))?.split(',') || [];
      const clientIdExists = validClientIds.includes(clientId);
      const autofillToken = clientIdExists && submissionType === 'Update'
        ? await createAutofillToken({ clientId })
        : null;

      res.status(200).json({
        clientIdExists,
        autofillToken,
        message: 'Client ID check completed (fallback)'
      });
    }

  } catch (error) {
    console.error('Client ID verification error:', error);
    res.status(500).json({
      clientIdExists: false,
      error: 'Verification service unavailable'
    });
  }
}
