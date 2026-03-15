import { c as createLogger } from "./logger.js";
const logger = createLogger("SavvyCal");
const SAVVYCAL_API_BASE = "https://api.savvycal.com/v1";
const TARGET_LINK_SLUG = "together";
let cachedLinkId = null;
async function getLinkId(apiKey) {
  if (cachedLinkId) return cachedLinkId;
  const response = await fetch(`${SAVVYCAL_API_BASE}/links`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    logger.error("Failed to fetch SavvyCal links", { status: response.status });
    return null;
  }
  const data = await response.json();
  const links = data.entries || [];
  const targetLink = links.find((link) => link.slug === TARGET_LINK_SLUG);
  if (targetLink) {
    cachedLinkId = targetLink.id;
    logger.debug("Found SavvyCal link", { linkId: cachedLinkId, slug: TARGET_LINK_SLUG });
    return cachedLinkId;
  }
  logger.error("SavvyCal link not found", { slug: TARGET_LINK_SLUG });
  return null;
}
export {
  SAVVYCAL_API_BASE as S,
  getLinkId as g
};
