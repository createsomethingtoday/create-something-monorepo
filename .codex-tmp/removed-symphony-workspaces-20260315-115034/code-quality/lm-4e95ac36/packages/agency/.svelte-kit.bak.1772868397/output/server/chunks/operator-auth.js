import { error } from "@sveltejs/kit";
import { r as requireAgencySessionUser } from "./mcp-token.js";
async function requireAgencyOperator(input) {
  const user = await requireAgencySessionUser(input);
  const allowed = parseOperatorEmails(input.platform?.env?.AGENCY_OPERATOR_EMAILS);
  if (!allowed.has(user.email.toLowerCase())) {
    throw error(403, "Operator access required");
  }
  return user;
}
function parseOperatorEmails(raw) {
  return new Set(
    (raw ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  );
}
export {
  requireAgencyOperator as r
};
