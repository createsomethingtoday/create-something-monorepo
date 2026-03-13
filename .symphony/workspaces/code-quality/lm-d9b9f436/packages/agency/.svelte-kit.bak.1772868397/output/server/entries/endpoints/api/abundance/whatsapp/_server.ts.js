import { text, json } from "@sveltejs/kit";
import { g as generateId } from "../../../../../chunks/matching.js";
const GET = async ({ url, platform }) => {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = platform?.env?.WHATSAPP_VERIFY_TOKEN || "abundance-network-verify";
  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp webhook verified");
    return text(challenge || "", { status: 200 });
  }
  console.warn("WhatsApp webhook verification failed", { mode, token });
  return json({ error: "Verification failed" }, { status: 403 });
};
const POST = async ({ request, platform }) => {
  try {
    if (!platform?.env?.DB) {
      console.error("Database not available");
      return json({ success: false, error: "Database not available" }, { status: 200 });
    }
    const payload = await request.json();
    if (payload.object !== "whatsapp_business_account") {
      return json({ success: false, error: "Invalid payload" }, { status: 200 });
    }
    const processedMessages = [];
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        if (!value.messages || value.messages.length === 0) {
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log("Message status update:", status.status, status.id);
            }
          }
          continue;
        }
        const contact = value.contacts?.[0];
        const contactName = contact?.profile?.name || "Unknown";
        for (const message of value.messages) {
          const phone = message.from;
          let content = "";
          switch (message.type) {
            case "text":
              content = message.text?.body || "";
              break;
            case "button":
              content = message.button?.payload || message.button?.text || "";
              break;
            case "interactive":
              content = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
              break;
            default:
              content = `[${message.type} message]`;
          }
          const { userId, userType, isNew } = await lookupOrCreateUser(
            platform.env.DB,
            phone,
            contactName
          );
          const processedMessage = {
            phone,
            name: contactName,
            message_id: message.id,
            timestamp: message.timestamp,
            type: message.type,
            content,
            user_type: userType,
            user_id: userId,
            is_new_user: isNew
          };
          processedMessages.push(processedMessage);
          const intakeUserType = userType === "talent" ? "talent" : "seeker";
          await storeIntake(platform.env.DB, {
            user_id: userId,
            user_type: intakeUserType,
            intake_type: isNew ? "onboarding" : "checkin",
            data: {
              message_id: message.id,
              timestamp: message.timestamp,
              type: message.type,
              content,
              source: "whatsapp"
            }
          });
        }
      }
    }
    return json({
      success: true,
      data: processedMessages
    });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error"
    }, { status: 200 });
  }
};
async function lookupOrCreateUser(db, phone, name) {
  const seeker = await db.prepare(
    "SELECT id FROM seekers WHERE phone = ?"
  ).bind(phone).first();
  if (seeker) {
    return { userId: seeker.id, userType: "seeker", isNew: false };
  }
  const talent = await db.prepare(
    "SELECT id FROM talent WHERE phone = ?"
  ).bind(phone).first();
  if (talent) {
    return { userId: talent.id, userType: "talent", isNew: false };
  }
  const id = generateId();
  await db.prepare(`
		INSERT INTO seekers (id, phone, name, status)
		VALUES (?, ?, ?, 'onboarding')
	`).bind(id, phone, name).run();
  return { userId: id, userType: "seeker", isNew: true };
}
async function storeIntake(db, input) {
  const id = generateId();
  const previous = await db.prepare(`
		SELECT id FROM intakes
		WHERE user_id = ? AND user_type = ?
		ORDER BY created_at DESC
		LIMIT 1
	`).bind(input.user_id, input.user_type).first();
  await db.prepare(`
		INSERT INTO intakes (id, user_id, user_type, intake_type, data, previous_intake_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`).bind(
    id,
    input.user_id,
    input.user_type,
    input.intake_type,
    JSON.stringify(input.data),
    previous?.id || null
  ).run();
}
export {
  GET,
  POST
};
