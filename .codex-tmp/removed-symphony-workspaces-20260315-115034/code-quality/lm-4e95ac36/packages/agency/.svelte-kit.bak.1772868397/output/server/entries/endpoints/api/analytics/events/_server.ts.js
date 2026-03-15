import { json } from "@sveltejs/kit";
import { c as createLogger } from "../../../../../chunks/logger.js";
import { p as processEventBatch } from "../../../../../chunks/server.js";
const logger = createLogger("AnalyticsEventsAPI");
const POST = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    return json({ success: false, error: "Database not available" }, { status: 500 });
  }
  try {
    const batch = await request.json();
    if (!batch || !Array.isArray(batch.events)) {
      return json({ success: false, error: "Invalid batch format" }, { status: 400 });
    }
    const context = {
      userAgent: request.headers.get("user-agent") || void 0,
      ipCountry: request.headers.get("cf-ipcountry") || void 0
    };
    const result = await processEventBatch(db, batch, context);
    return json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    logger.error("Failed to process analytics events", { error });
    return json({ success: false, received: 0 }, { status: 200 });
  }
};
const GET = async () => {
  return json({ status: "ok", endpoint: "unified-analytics" });
};
export {
  GET,
  POST
};
