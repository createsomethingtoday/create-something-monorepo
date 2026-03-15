import { error } from "@sveltejs/kit";
import { c as createStripeClient } from "../../../../../../chunks/stripe.js";
import { g as getOfferingBySlug } from "../../../../../../chunks/services.js";
const PRODUCT_FILES = {
  "automation-patterns": {
    path: "products/automation-patterns-v1.0.0.zip",
    filename: "automation-patterns-pack-v1.0.0.zip",
    contentType: "application/zip"
  }
  // Add more products as needed
};
const GET = async ({ params, url, platform }) => {
  const { productId } = params;
  const sessionId = url.searchParams.get("session_id");
  const token = url.searchParams.get("token");
  const product = getOfferingBySlug(productId);
  if (!product) {
    throw error(404, "Product not found");
  }
  const fileInfo = PRODUCT_FILES[productId];
  if (!fileInfo) {
    throw error(404, "No download available for this product");
  }
  if (sessionId) {
    const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw error(500, "Payment verification unavailable");
    }
    const stripe = createStripeClient(stripeSecretKey);
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        throw error(403, "Payment not completed");
      }
      if (session.metadata?.product_id !== productId) {
        throw error(403, "Session does not match product");
      }
      return await serveFile(platform, fileInfo);
    } catch (err) {
      if (err && typeof err === "object" && "status" in err) {
        throw err;
      }
      console.error("Session verification error:", err);
      throw error(403, "Invalid or expired session");
    }
  }
  if (token) {
    const cache = platform?.env?.CACHE;
    if (cache) {
      const tokenData = await cache.get(`download:${token}`);
      if (tokenData) {
        const data = JSON.parse(tokenData);
        if (data.productId === productId && data.expiresAt > Date.now()) {
          return await serveFile(platform, fileInfo);
        }
      }
    }
    throw error(403, "Invalid or expired download link");
  }
  throw error(403, "Valid session or download token required");
};
async function serveFile(platform, fileInfo) {
  const bucket = platform?.env?.STORAGE;
  if (!bucket) {
    throw error(500, "Storage unavailable");
  }
  const object = await bucket.get(fileInfo.path);
  if (!object) {
    throw error(404, "File not found");
  }
  const headers = new Headers();
  headers.set("Content-Type", fileInfo.contentType);
  headers.set("Content-Disposition", `attachment; filename="${fileInfo.filename}"`);
  headers.set("Content-Length", object.size.toString());
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}
export {
  GET
};
