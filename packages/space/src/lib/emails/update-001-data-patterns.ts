/**
 * UPDATE #001: How CREATE SOMETHING Works (+ First Experiment)
 *
 * Send via: POST /api/newsletter/send
 * Authorization: Bearer {NEWSLETTER_API_KEY}
 */

export const subject = 'How CREATE SOMETHING Works (+ First Experiment)';

export const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#000000;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-size:14px;font-weight:500;color:#808080;letter-spacing:0.1em;text-transform:uppercase;">CREATE SOMETHING</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="line-height:1.8;">
              <p style="color:#b3b3b3;margin:0 0 20px 0;">You received our welcome email about "Weniger, aber besser"—the principle. Now, how does this actually work in practice?</p>

              <h2 style="color:#ffffff;font-size:18px;margin:30px 0 15px 0;font-weight:600;">The Structure</h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="20" border="0" style="background-color:#0d0d0d;margin:20px 0;">
                <tr>
                  <td>
                    <p style="color:#b3b3b3;margin:0 0 8px 0;"><span style="color:#ffffff;font-weight:500;">.io</span> — Research. Tracked experiments with methodology and metrics.</p>
                    <p style="color:#b3b3b3;margin:0 0 8px 0;"><span style="color:#ffffff;font-weight:500;">.space</span> — Practice. Community playground to fork and test ideas.</p>
                    <p style="color:#b3b3b3;margin:0 0 8px 0;"><span style="color:#ffffff;font-weight:500;">.ltd</span> — Philosophy. The canon that guides all decisions.</p>
                    <p style="color:#b3b3b3;margin:0;"><span style="color:#ffffff;font-weight:500;">.agency</span> — Services. Where research meets real client work.</p>
                  </td>
                </tr>
              </table>

              <p style="color:#b3b3b3;margin:0 0 20px 0;">Each feeds the others. A client problem becomes a research question. Research becomes an experiment. Experiments refine the philosophy. The philosophy shapes the next client engagement.</p>

              <h2 style="color:#ffffff;font-size:18px;margin:30px 0 15px 0;font-weight:600;">Featured Experiment</h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:25px 0;">
                <tr>
                  <td style="border-left:2px solid #333333;padding:20px;background-color:#080808;">
                    <p style="color:#ffffff;font-size:16px;font-weight:600;margin:0 0 10px 0;">Revealing Data Patterns</p>
                    <p style="color:#b3b3b3;margin:0 0 15px 0;">This experiment demonstrates <em>agentic visualization</em>—components that encode analytical knowledge so patterns reveal themselves without manual analysis.</p>
                    <p style="color:#b3b3b3;margin:0 0 15px 0;">The insight: a metric labeled "response_time" is semantically understood as "lower is better." The component uses Cloudflare Workers AI to automatically invert color coding—green for decreases, red for increases—without configuration.</p>
                    <p style="font-style:italic;color:#999999;margin:0;">Result: "Database performance degraded +26%" became immediately visible. No spreadsheet required.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
                <tr>
                  <td style="background-color:#ffffff;padding:12px 24px;">
                    <a href="https://createsomething.io/experiments/data-patterns" style="color:#000000;text-decoration:none;font-weight:500;">View the Experiment →</a>
                  </td>
                </tr>
              </table>

              <h2 style="color:#ffffff;font-size:18px;margin:30px 0 15px 0;font-weight:600;">What's Next</h2>

              <p style="color:#b3b3b3;margin:0 0 20px 0;">More experiments are in progress. Each one tests a specific question about AI-native development—what works, what doesn't, and why it matters.</p>

              <p style="color:#808080;margin:30px 0 0 0;">Less, but better.<br>—Micah</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:60px;border-top:1px solid #1a1a1a;margin-top:60px;">
              <p style="color:#4d4d4d;font-size:13px;margin:0 0 10px 0;">CREATE SOMETHING</p>
              <p style="margin:0;"><a href="{{UNSUBSCRIBE_URL}}" style="color:#666666;font-size:13px;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const preview = 'The structure behind CREATE SOMETHING: .io for research, .space for practice, .ltd for philosophy, .agency for services. Plus our first featured experiment.';
