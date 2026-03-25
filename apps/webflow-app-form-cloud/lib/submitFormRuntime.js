import { db } from './db';
import { uploadPublicFile, deletePublicFile } from './blobStore';
import { trackEvent } from './analytics';
import { buildSubmissionWebhookData, sendSubmissionWebhook, getFieldValue } from './submissionPayload';

const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_FILENAME_LENGTH = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function appendFieldValue(target, key, value) {
  const existingValue = target[key];

  if (existingValue === undefined) {
    target[key] = value;
    return;
  }

  if (Array.isArray(existingValue)) {
    existingValue.push(value);
    return;
  }

  target[key] = [existingValue, value];
}

async function parseSubmissionRequest(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const fields = {};
    const files = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files[key] = files[key] || [];
        files[key].push(value);
        continue;
      }

      appendFieldValue(fields, key, value);
    }

    return { fields, files };
  }

  if (contentType.includes('application/json')) {
    const fields = await request.json();

    return {
      fields,
      files: {}
    };
  }

  throw new Error('Unsupported content type');
}

async function uploadSubmissionFiles(files, runtime = {}) {
  const blobUrls = [];
  const processedFiles = {};

  for (const [fieldName, fileList] of Object.entries(files)) {
    const uploadedFiles = [];

    for (const file of fileList) {
      if (!file || !file.name) {
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadPublicFile({
        filename: file.name,
        contentType: file.type,
        buffer: arrayBuffer
      }, runtime);

      blobUrls.push(uploaded.url);
      uploadedFiles.push({
        originalFilename: file.name,
        mimetype: file.type,
        size: file.size,
        url: uploaded.url,
        dataUrl: uploaded.url
      });
    }

    if (uploadedFiles.length === 1) {
      processedFiles[fieldName] = uploadedFiles[0];
    } else if (uploadedFiles.length > 1) {
      processedFiles[fieldName] = uploadedFiles;
    }
  }

  return { blobUrls, processedFiles };
}

function validateSubmissionFiles(files) {
  const invalidNames = [];
  const oversizedFiles = [];

  for (const [fieldName, fileList] of Object.entries(files)) {
    for (const file of fileList) {
      if (!file || !file.name) {
        continue;
      }

      if (file.name.length > MAX_FILENAME_LENGTH) {
        invalidNames.push({
          field: fieldName,
          filename: file.name,
          length: file.name.length
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push({
          field: fieldName,
          filename: file.name,
          size: file.size
        });
      }
    }
  }

  if (invalidNames.length > 0) {
    return jsonResponse({
      success: false,
      message: 'Filename too long',
      error: `One or more files have filenames exceeding ${MAX_FILENAME_LENGTH} characters. Please rename the files and try again.`,
      details: invalidNames
    }, 400);
  }

  if (oversizedFiles.length > 0) {
    return jsonResponse({
      success: false,
      message: 'File too large',
      error: `One or more files exceed the ${MAX_FILE_SIZE / (1024 * 1024)}MB upload limit.`,
      details: oversizedFiles
    }, 400);
  }

  return null;
}

export async function handleRuntimeSubmit(request, runtime = {}) {
  if (request.method !== 'POST') {
    return jsonResponse({ message: 'Method not allowed' }, 405);
  }

  let blobUrls = [];
  let submissionRecord = null;

  try {
    const { fields, files } = await parseSubmissionRequest(request);
    const validationError = validateSubmissionFiles(files);

    if (validationError) {
      return validationError;
    }

    if (fields.longDescription && fields.appDetailDescription === undefined) {
      fields.appDetailDescription = getFieldValue(fields.longDescription);
    }

    const clientId = getFieldValue(fields.clientId);
    const submissionType = getFieldValue(fields.submissionType);

    if (clientId && !CLIENT_ID_PATTERN.test(clientId)) {
      return jsonResponse({
        success: false,
        message: 'Invalid Client ID format',
        error: 'Client ID must be a 64-character hexadecimal string.'
      }, 400);
    }

    if (clientId) {
      const existingSubmission = await db.findRecentDuplicate(clientId, submissionType, 60, runtime);

      if (existingSubmission) {
        return jsonResponse({
          success: true,
          message: 'Form already submitted',
          submissionId: existingSubmission.id,
          airtableSubmissionId: existingSubmission.airtable_submission_id,
          duplicate: true,
          originalSubmittedAt: existingSubmission.created_at
        });
      }
    }

    submissionRecord = await db.createSubmission({
      submissionType: getFieldValue(fields.submissionType) || 'Unknown',
      appName: getFieldValue(fields.appName) || 'Unknown',
      clientId: clientId || null,
      creatorEmail: getFieldValue(fields.creatorContactEmail) || null,
      formData: fields,
      blobUrls: [],
      status: 'processing'
    }, runtime);

    const uploadResult = await uploadSubmissionFiles(files, runtime);
    blobUrls = uploadResult.blobUrls;
    const processedFiles = uploadResult.processedFiles;

    submissionRecord = await db.updateSubmission(submissionRecord.id, {
      blobUrls,
      status: 'pending'
    }, runtime);

    const { airtableSubmissionId, webhookData } = buildSubmissionWebhookData({
      fields,
      blobUrls,
      submissionId: submissionRecord.id,
      submittedAt: new Date().toISOString()
    });

    try {
      const webhookResponse = await sendSubmissionWebhook(webhookData, runtime);

      await db.updateSubmission(submissionRecord.id, {
        status: 'webhook_success',
        airtableSubmissionId,
        webhookResponse,
        webhookSentAt: new Date().toISOString()
      }, runtime);

      await trackEvent('Webhook Delivered', {
        submissionType: getFieldValue(fields.submissionType) || 'unknown',
        filesCount: Object.keys(processedFiles).length,
        submissionId: submissionRecord.id
      });

      return jsonResponse({
        success: true,
        message: 'Form submitted successfully',
        submissionId: submissionRecord.id,
        airtableSubmissionId,
        filesUploaded: Object.keys(processedFiles).length
      });
    } catch (webhookError) {
      await db.updateSubmission(submissionRecord.id, {
        status: 'webhook_failed',
        errorMessage: webhookError.message,
        webhookSentAt: new Date().toISOString(),
        retryCount: 0
      }, runtime);

      await trackEvent('Webhook Failed', {
        submissionType: getFieldValue(fields.submissionType) || 'unknown',
        error: webhookError.message,
        submissionId: submissionRecord.id
      });

      return jsonResponse({
        success: false,
        message: 'Form received but webhook delivery failed',
        submissionId: submissionRecord.id,
        error: 'Unable to deliver to Airtable. Your submission has been saved and will be retried automatically.',
        retryInfo: 'The support team has been notified and will review your submission.'
      }, 500);
    }
  } catch (error) {
    console.error('Form submission error:', error);

    if (submissionRecord) {
      await db.updateSubmission(submissionRecord.id, {
        status: 'webhook_failed',
        errorMessage: `Processing error: ${error.message}`,
        retryCount: 0
      }, runtime).catch((dbError) => console.error('Failed to update DB on error:', dbError));
    }

    if (blobUrls.length > 0) {
      await Promise.all(
        blobUrls.map((url) => deletePublicFile(url, runtime).catch((cleanupError) => {
          console.error('Blob cleanup error:', cleanupError);
        }))
      );
    }

    return jsonResponse({
      success: false,
      message: 'Form submission failed',
      submissionId: submissionRecord ? submissionRecord.id : null,
      error: error.message
    }, 500);
  }
}
