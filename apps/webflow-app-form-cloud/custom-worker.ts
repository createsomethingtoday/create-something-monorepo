import { db } from "./lib/db";
import { uploadPublicFile, deletePublicFile } from "./lib/blobStore";
import { trackEvent } from "./lib/analytics";
import { buildSubmissionWebhookData, sendSubmissionWebhook, getFieldValue } from "./lib/submissionPayload";
import { handleRuntimeSubmit } from "./lib/submitFormRuntime";

const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_FILENAME_LENGTH = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CRON_ROUTE_BY_EXPRESSION: Record<string, string> = {
  "*/15 * * * *": "/api/cron/retry-failed",
  "0 */6 * * *": "/api/cron/cleanup-blobs"
};

type OpenNextHandler = {
  fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response>;
};

let openNextHandlerPromise: Promise<OpenNextHandler> | null = null;
let patchedProcessChdir = false;

function patchProcessChdir() {
  if (patchedProcessChdir || typeof process === "undefined" || typeof process.chdir !== "function") {
    return;
  }

  const originalChdir = process.chdir.bind(process);
  process.chdir = ((dir: string) => {
    if (!dir) {
      return;
    }

    return originalChdir(dir);
  }) as typeof process.chdir;
  patchedProcessChdir = true;
}

async function getOpenNextHandler() {
  if (!openNextHandlerPromise) {
    patchProcessChdir();
    openNextHandlerPromise = import("./.open-next/worker.js").then(
      (mod) => mod.default as OpenNextHandler
    );
  }

  return openNextHandlerPromise;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function appendFieldValue(target: Record<string, string | string[]>, key: string, value: string) {
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

async function parseSubmissionRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fields: Record<string, string | string[]> = {};
    const files: Record<string, File[]> = {};

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

  if (contentType.includes("application/json")) {
    const fields = await request.json() as Record<string, unknown>;
    return {
      fields: fields as Record<string, string | string[]>,
      files: {}
    };
  }

  throw new Error("Unsupported content type");
}

async function uploadWorkerFiles(files: Record<string, File[]>, env: unknown) {
  const blobUrls: string[] = [];

  for (const [fieldName, fileList] of Object.entries(files)) {
    for (const file of fileList) {
      if (!file || !file.name) {
        continue;
      }

      if (file.name.length > MAX_FILENAME_LENGTH) {
        throw new Error(`Filename too long for ${fieldName}: ${file.name}`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File exceeds 10MB limit: ${file.name}`);
      }

      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadPublicFile({
        filename: file.name,
        contentType: file.type,
        buffer: arrayBuffer
      }, { env });

      blobUrls.push(uploaded.url);
    }
  }

  return blobUrls;
}

async function handleCloudflareSubmit(request: Request, env: unknown) {
  let blobUrls: string[] = [];
  let submissionRecord: any = null;

  try {
    const { fields, files } = await parseSubmissionRequest(request);

    if (fields.longDescription && fields.appDetailDescription === undefined) {
      fields.appDetailDescription = getFieldValue(fields.longDescription as string | string[]);
    }

    const clientId = getFieldValue(fields.clientId);
    const submissionType = getFieldValue(fields.submissionType);

    if (clientId && !CLIENT_ID_PATTERN.test(clientId)) {
      return jsonResponse({
        success: false,
        message: "Invalid Client ID format",
        error: "Client ID must be a 64-character hexadecimal string."
      }, 400);
    }

    if (clientId) {
      const existingSubmission = await db.findRecentDuplicate(clientId, submissionType, 60, { env });
      if (existingSubmission) {
        return jsonResponse({
          success: true,
          message: "Form already submitted",
          submissionId: existingSubmission.id,
          airtableSubmissionId: existingSubmission.airtable_submission_id,
          duplicate: true,
          originalSubmittedAt: existingSubmission.created_at
        });
      }
    }

    submissionRecord = await db.createSubmission({
      submissionType: getFieldValue(fields.submissionType) || "Unknown",
      appName: getFieldValue(fields.appName) || "Unknown",
      clientId: clientId || null,
      creatorEmail: getFieldValue(fields.creatorContactEmail) || null,
      formData: fields,
      blobUrls: [],
      status: "processing"
    }, { env });

    blobUrls = await uploadWorkerFiles(files, env);

    submissionRecord = await db.updateSubmission(submissionRecord.id, {
      blobUrls,
      status: "pending"
    }, { env });

    const { airtableSubmissionId, webhookData } = buildSubmissionWebhookData({
      fields,
      blobUrls,
      submissionId: submissionRecord.id,
      submittedAt: new Date().toISOString()
    });

    try {
      const webhookResponse = await sendSubmissionWebhook(webhookData, { env });

      await db.updateSubmission(submissionRecord.id, {
        status: "webhook_success",
        airtableSubmissionId,
        webhookResponse,
        webhookSentAt: new Date().toISOString()
      }, { env });

      await trackEvent("Webhook Delivered", {
        submissionType: getFieldValue(fields.submissionType) || "unknown",
        filesCount: Object.keys(files).length,
        submissionId: submissionRecord.id
      });

      return jsonResponse({
        success: true,
        message: "Form submitted successfully",
        submissionId: submissionRecord.id,
        airtableSubmissionId,
        filesUploaded: Object.keys(files).length
      });
    } catch (webhookError: any) {
      await db.updateSubmission(submissionRecord.id, {
        status: "webhook_failed",
        errorMessage: webhookError.message,
        webhookSentAt: new Date().toISOString(),
        retryCount: 0
      }, { env });

      await trackEvent("Webhook Failed", {
        submissionType: getFieldValue(fields.submissionType) || "unknown",
        error: webhookError.message,
        submissionId: submissionRecord.id
      });

      return jsonResponse({
        success: false,
        message: "Form received but webhook delivery failed",
        submissionId: submissionRecord.id,
        error: "Unable to deliver to Airtable. Your submission has been saved and will be retried automatically.",
        retryInfo: "The support team has been notified and will review your submission."
      }, 500);
    }
  } catch (error: any) {
    console.error("Cloudflare form submission error:", error);

    if (submissionRecord) {
      await db.updateSubmission(submissionRecord.id, {
        status: "webhook_failed",
        errorMessage: `Processing error: ${error.message}`,
        retryCount: 0
      }, { env }).catch((dbError: any) => console.error("Failed to update DB on error:", dbError));
    }

    if (blobUrls.length > 0) {
      await Promise.all(
        blobUrls.map((url) => deletePublicFile(url, { env }).catch((cleanupError) => {
          console.error("Blob cleanup error:", cleanupError);
        }))
      );
    }

    return jsonResponse({
      success: false,
      message: "Form submission failed",
      submissionId: submissionRecord ? submissionRecord.id : null,
      error: error.message
    }, 500);
  }
}

async function dispatchScheduledRoute(path: string, env: any, ctx: ExecutionContext) {
  if (!env?.CRON_SECRET) {
    console.error("CRON_SECRET is not configured for scheduled execution");
    return;
  }

  const openNextHandler = await getOpenNextHandler();
  const response = await openNextHandler.fetch(new Request(`https://internal.cloudflare${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`
    }
  }), env, ctx);

  if (!response.ok) {
    const body = await response.text();
    console.error(`Scheduled route ${path} failed`, response.status, body);
  }
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit-form" && request.method === "POST") {
      return handleRuntimeSubmit(request, { env });
    }

    const openNextHandler = await getOpenNextHandler();
    return openNextHandler.fetch(request, env, ctx);
  },

  scheduled(event: ScheduledController, env: any, ctx: ExecutionContext) {
    const path = CRON_ROUTE_BY_EXPRESSION[event.cron];

    if (!path) {
      console.warn(`Unhandled cron expression: ${event.cron}`);
      return;
    }

    ctx.waitUntil(dispatchScheduledRoute(path, env, ctx));
  }
};
