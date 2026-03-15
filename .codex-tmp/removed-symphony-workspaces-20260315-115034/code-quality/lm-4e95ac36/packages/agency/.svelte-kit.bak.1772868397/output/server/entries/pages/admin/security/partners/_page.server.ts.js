import { s as listPartnerClients, e as parseJsonObject, b as parseJsonArray, H as HALF_DOZEN_PARTNER_KEY } from "../../../../../chunks/partner-auth.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const load = async ({ cookies, platform }) => {
  await requireAgencyOperator({ cookies, platform });
  const clients = await listPartnerClients(platform.env.DB, HALF_DOZEN_PARTNER_KEY, { limit: 200 });
  return {
    clients: clients.map((client) => ({
      ...client,
      required_toolkits: parseJsonArray(client.required_toolkits_json),
      metadata: parseJsonObject(client.metadata_json)
    }))
  };
};
export {
  load
};
