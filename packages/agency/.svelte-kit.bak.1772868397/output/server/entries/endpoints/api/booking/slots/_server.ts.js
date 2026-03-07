import { error, json } from "@sveltejs/kit";
import { g as getLinkId, S as SAVVYCAL_API_BASE } from "../../../../../chunks/savvycal.js";
import { c as createLogger } from "../../../../../chunks/logger.js";
const logger = createLogger("BookingSlotsAPI");
const GET = async ({ url, platform }) => {
  const apiKey = platform?.env?.SAVVYCAL_API_KEY;
  if (!apiKey) {
    logger.error("SAVVYCAL_API_KEY not configured");
    throw error(500, "Booking service temporarily unavailable");
  }
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const timezone = url.searchParams.get("timezone") || "America/Los_Angeles";
  if (!startDate || !endDate) {
    throw error(400, "start_date and end_date are required");
  }
  try {
    const linkId = await getLinkId(apiKey);
    if (!linkId) {
      logger.warn("Could not find SavvyCal link, returning empty slots");
      return json({ slots: [], timezone });
    }
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      timezone
    });
    const apiUrl = `${SAVVYCAL_API_BASE}/links/${linkId}/slots?${params}`;
    logger.debug("Fetching SavvyCal slots", { startDate, endDate, timezone });
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("SavvyCal API error", { status: response.status, error: errorText });
      if (response.status === 404) {
        return json({ slots: [], timezone });
      }
      throw error(response.status, "Failed to fetch available slots");
    }
    const rawData = await response.json();
    let slotsArray = [];
    if (Array.isArray(rawData)) {
      slotsArray = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      slotsArray = rawData.data;
    } else if (rawData.slots && Array.isArray(rawData.slots)) {
      slotsArray = rawData.slots;
    }
    const slots = slotsArray.map((slot) => ({
      start_at: slot.start_at,
      end_at: slot.end_at,
      duration_minutes: Math.round(
        (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / 6e4
      )
    }));
    logger.info("Slots fetched", { count: slots.length, startDate, endDate });
    return json({
      slots,
      timezone
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }
    logger.error("Error fetching slots", { error: err });
    throw error(500, "Failed to fetch available slots");
  }
};
export {
  GET
};
