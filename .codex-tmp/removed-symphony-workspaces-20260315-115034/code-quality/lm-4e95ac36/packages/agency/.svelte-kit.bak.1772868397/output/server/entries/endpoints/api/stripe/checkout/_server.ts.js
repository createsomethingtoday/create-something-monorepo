import { error, json } from "@sveltejs/kit";
import { h as hasStripePricing, c as createStripeClient, g as getStripePrice } from "../../../../../chunks/stripe.js";
import { g as getOfferingBySlug } from "../../../../../chunks/services.js";
const POST = async ({ request, platform, url }) => {
  const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw error(500, "Stripe is not configured");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }
  const { productId, successUrl, cancelUrl, customerEmail } = body;
  const product = getOfferingBySlug(productId);
  if (!product) {
    throw error(404, "Product not found");
  }
  if (product.pricing === "Free") {
    throw error(400, "This product is free and does not require checkout");
  }
  const priceConfig = getStripePrice(productId);
  if (!priceConfig) {
    throw error(400, "No pricing configured for this product");
  }
  if (!hasStripePricing(productId)) {
    throw error(503, "Payment system is being configured. Please contact us directly.");
  }
  const stripe = createStripeClient(stripeSecretKey);
  const baseUrl = url.origin;
  const defaultSuccessUrl = `${baseUrl}/products/${productId}?success=true&session_id={CHECKOUT_SESSION_ID}`;
  const defaultCancelUrl = `${baseUrl}/products/${productId}?canceled=true`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: priceConfig.mode,
      line_items: [
        {
          price: priceConfig.priceId,
          quantity: 1
        }
      ],
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      customer_email: customerEmail,
      metadata: {
        product_id: productId
      },
      // For subscriptions, allow promotion codes
      ...priceConfig.mode === "subscription" && {
        allow_promotion_codes: true
      },
      // Collect billing address for tax purposes
      billing_address_collection: "required"
    });
    return json({
      sessionId: session.id,
      url: session.url
    });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    throw error(500, "Failed to create checkout session");
  }
};
export {
  POST
};
