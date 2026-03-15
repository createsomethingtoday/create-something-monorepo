import Stripe from "stripe";
const STRIPE_PRICES = {
  // Vertical Templates - Subscription tiers ($29/mo Solo, $79/mo Team)
  // Set STRIPE_PRICE_VERTICAL_SOLO and STRIPE_PRICE_VERTICAL_TEAM in Cloudflare secrets
  "vertical-templates-solo": {
    priceId: process.env.STRIPE_PRICE_VERTICAL_SOLO || "price_1SiduGAzstI6Ecr5scme24uj",
    mode: "subscription",
    name: "Vertical Templates (Solo)"
  },
  "vertical-templates-team": {
    priceId: process.env.STRIPE_PRICE_VERTICAL_TEAM || "price_1SidvJAzstI6Ecr5ZWWsHRD5",
    mode: "subscription",
    name: "Vertical Templates (Team)"
  },
  // One-time payment products
  "automation-patterns": {
    priceId: "price_1SiK3PAzstI6Ecr5y2k8VGsr",
    mode: "payment",
    name: "Automation Patterns Pack"
  },
  // Agent-in-a-Box has multiple tiers
  "agent-in-a-box-solo": {
    priceId: "price_1SioU0AzstI6Ecr5NjnMDBxq",
    mode: "payment",
    name: "Agent-in-a-Box Kit (Solo)"
  },
  "agent-in-a-box-team": {
    priceId: "price_1SioV2AzstI6Ecr5uZ2Qt7Ok",
    mode: "payment",
    name: "Agent-in-a-Box Kit (Team)"
  },
  "agent-in-a-box-org": {
    priceId: "price_1SioW9AzstI6Ecr5fzecFIWO",
    mode: "payment",
    name: "Agent-in-a-Box Kit (Organization)"
  }
};
function getStripePrice(productId) {
  return STRIPE_PRICES[productId];
}
function getProductIdByStripePriceId(priceId) {
  for (const [productId, config] of Object.entries(STRIPE_PRICES)) {
    if (config.priceId === priceId) {
      return productId;
    }
  }
  return null;
}
function hasStripePricing(productId) {
  const config = STRIPE_PRICES[productId];
  return config !== void 0 && !config.priceId.includes("placeholder");
}
function createStripeClient(secretKey) {
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil"
  });
}
export {
  getProductIdByStripePriceId as a,
  createStripeClient as c,
  getStripePrice as g,
  hasStripePricing as h
};
