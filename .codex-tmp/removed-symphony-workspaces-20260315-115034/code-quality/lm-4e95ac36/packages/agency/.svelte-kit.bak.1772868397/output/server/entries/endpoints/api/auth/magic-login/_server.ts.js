import { json } from "@sveltejs/kit";
import { c as createLogger } from "../../../../../chunks/logger.js";
import { g as generateCorrelationId, l as log } from "../../../../../chunks/errors.js";
import { p as parseBody, m as magicLinkSchema } from "../../../../../chunks/schemas.js";
import { i as identityClient, g as getIdentityErrorMessage } from "../../../../../chunks/identity-client.js";
class ApiError extends Error {
  status;
  code;
  constructor(message, status = 500, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}
function handleApiError(context, err, options = {}) {
  const { defaultStatus = 500, mapError } = options;
  const correlationId = generateCorrelationId();
  let status = defaultStatus;
  let message = "An unexpected error occurred";
  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
  } else if (mapError) {
    const mapped = mapError(err);
    status = mapped.status;
    message = mapped.message;
  } else if (err instanceof Error) {
    message = err.message;
    if ("status" in err && typeof err.status === "number") {
      status = err.status;
    }
  }
  log.error(`[${context}] ${message}`, {
    correlationId,
    error: err,
    context
  });
  const response = {
    success: false,
    error: message,
    correlationId
  };
  return json(response, { status });
}
function catchApiError(context, handler, options = {}) {
  return async (event) => {
    try {
      return await handler(event);
    } catch (err) {
      if (err instanceof Response) {
        throw err;
      }
      if (err && typeof err === "object" && "status" in err && "body" in err && typeof err.status === "number") {
        throw err;
      }
      return handleApiError(context, err, options);
    }
  };
}
const logger = createLogger("MagicLoginAPI");
const POST = catchApiError("MagicLogin", async ({ request }) => {
  const parseResult = await parseBody(request, magicLinkSchema);
  if (!parseResult.success) {
    return json({ success: false, error: parseResult.error }, { status: 400 });
  }
  const { email } = parseResult.data;
  logger.info("Magic login request", { email });
  const result = await identityClient.magicLogin({ email, source: "agency" });
  if (!result.success) {
    logger.warn("Magic login failed", { email, error: result.error });
    return json(
      { error: getIdentityErrorMessage(result, "Failed to send magic link") },
      { status: result.status }
    );
  }
  logger.info("Magic link sent", { email });
  return json({ success: true });
});
export {
  POST
};
