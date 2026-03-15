const RATE_LIMIT_WINDOW = 60 * 60;
const RATE_LIMIT_MAX = 3;
function createNewsletterHandler(options) {
  return async ({ request, platform, getClientAddress }) => {
    const { json } = await import("@sveltejs/kit");
    const body = await request.json();
    console.log(`[NewsletterAPI:${options.property}] Signup`, { email: body.email });
    const { result, status } = await processSubscription(body, platform?.env, getClientAddress(), options.property);
    if (result.success) {
      console.log(`[NewsletterAPI:${options.property}] Signup successful`, { email: body.email });
    } else {
      console.warn(`[NewsletterAPI:${options.property}] Signup failed`, { email: body.email, message: result.message });
    }
    return json(result, { status });
  };
}
function generateConfirmationEmailHtml(confirmUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="margin-bottom: 40px;">
      <div style="font-size: 14px; font-weight: 500; color: #808080; letter-spacing: 0.1em; text-transform: uppercase;">CREATE SOMETHING</div>
    </div>

    <div style="line-height: 1.8;">
      <p style="font-style: italic; color: #ffffff; font-size: 20px; margin: 30px 0;">"Weniger, aber besser."</p>
      <p style="color: #b3b3b3; margin-bottom: 20px;">Less, but better. This guides everything we build.</p>
      <p style="color: #b3b3b3; margin-bottom: 20px;">Please confirm your subscription to receive occasional updates on experiments in AI-native development—what works, what doesn't, why it matters.</p>
      <a href="${confirmUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ffffff; color: #000000; text-decoration: none; font-weight: 500;">Confirm Subscription</a>
      <p style="margin-top: 30px; font-size: 14px; color: #808080;">If you didn't request this subscription, you can safely ignore this email.</p>
    </div>

    <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid #1a1a1a; color: #4d4d4d; font-size: 13px;">
      <p style="margin: 0;">CREATE SOMETHING</p>
    </div>
  </div>
</body>
</html>`;
}
async function processSubscription(body, env, clientIP, property) {
  const { email, website, turnstileToken, source } = body;
  const subscriberSource = source || property;
  if (website) {
    return {
      result: { success: true, message: "Successfully subscribed!" },
      status: 200
    };
  }
  if (!email || !email.trim()) {
    return {
      result: { success: false, message: "Email is required" },
      status: 400
    };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      result: { success: false, message: "Invalid email format" },
      status: 400
    };
  }
  if (!env) {
    return {
      result: { success: false, message: "Platform environment not available" },
      status: 500
    };
  }
  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return {
        result: { success: false, message: "Please complete the verification" },
        status: 400
      };
    }
    const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: clientIP
      })
    });
    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
      console.warn("Turnstile verification failed:", turnstileResult["error-codes"]);
      return {
        result: { success: false, message: "Verification failed. Please try again." },
        status: 400
      };
    }
  }
  if (env.CACHE) {
    const rateLimitKey = `newsletter_rate:${clientIP}`;
    try {
      const currentCount = await env.CACHE.get(rateLimitKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;
      if (count >= RATE_LIMIT_MAX) {
        return {
          result: { success: false, message: "Too many signup attempts. Please try again later." },
          status: 429
        };
      }
      await env.CACHE.put(rateLimitKey, String(count + 1), {
        expirationTtl: RATE_LIMIT_WINDOW
      });
    } catch (kvError) {
      console.warn("Rate limiting unavailable:", kvError);
    }
  }
  const timestamp = Date.now();
  const unsubscribeToken = btoa(`${email}:${timestamp}`);
  const confirmationToken = btoa(`confirm:${email}:${timestamp}:${crypto.randomUUID()}`);
  let existingSubscriber = null;
  try {
    existingSubscriber = await env.DB.prepare(`SELECT email, confirmed_at, unsubscribed_at, status FROM newsletter_subscribers WHERE email = ?`).bind(email).first();
  } catch (dbError) {
    console.warn("Could not check existing subscriber:", dbError);
  }
  if (existingSubscriber?.status === "bounced" || existingSubscriber?.status === "complained") {
    return {
      result: { success: false, message: "This email address cannot receive our newsletters." },
      status: 400
    };
  }
  if (existingSubscriber?.confirmed_at && !existingSubscriber?.unsubscribed_at) {
    return {
      result: { success: true, message: "You are already subscribed!" },
      status: 200
    };
  }
  try {
    if (existingSubscriber) {
      await env.DB.prepare(`UPDATE newsletter_subscribers
				 SET confirmation_token = ?,
				     unsubscribe_token = ?,
				     unsubscribed_at = NULL,
				     confirmed_at = NULL,
				     subscribed_at = datetime('now'),
				     source = ?
				 WHERE email = ?`).bind(confirmationToken, unsubscribeToken, subscriberSource, email).run();
    } else {
      await env.DB.prepare(`INSERT INTO newsletter_subscribers (email, subscribed_at, unsubscribe_token, confirmation_token, confirmed_at, source)
				 VALUES (?, datetime('now'), ?, ?, NULL, ?)`).bind(email, unsubscribeToken, confirmationToken, subscriberSource).run();
    }
  } catch (dbError) {
    console.error("Newsletter subscribers database error:", dbError);
    return {
      result: { success: false, message: "Failed to process subscription" },
      status: 500
    };
  }
  const confirmUrl = `https://createsomething.io/confirm?token=${encodeURIComponent(confirmationToken)}`;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "CREATE SOMETHING <hello@createsomething.io>",
      to: email,
      subject: "Confirm your subscription to CREATE SOMETHING",
      html: generateConfirmationEmailHtml(confirmUrl)
    })
  });
  const resendData = await resendResponse.json();
  if (!resendResponse.ok) {
    console.error("Resend API error:", resendData);
    return {
      result: { success: false, message: "Failed to send confirmation email" },
      status: 500
    };
  }
  return {
    result: {
      success: true,
      message: "Please check your email to confirm your subscription.",
      emailId: resendData.id
    },
    status: 200
  };
}
const POST = createNewsletterHandler({ property: "agency" });
export {
  POST
};
