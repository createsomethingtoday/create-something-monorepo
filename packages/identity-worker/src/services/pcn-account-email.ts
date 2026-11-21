/** PCN presentation only. Challenge eligibility, lifetime and destinations stay with enrollment. */
export function pcnAccountEmail(purpose: 'signup' | 'recovery', link: string) {
  const recovery = purpose === 'recovery';
  const title = recovery ? 'Find your way back.' : 'Make it yours.';
  const action = recovery ? 'Reset your password' : 'Verify your email';
  const message = recovery
    ? 'Use this link to choose a new password for your CREATE SOMETHING Private account.'
    : 'Verify your email address, then choose a password for your CREATE SOMETHING Private account. Network access is managed separately.';
  const notice = recovery
    ? 'If you did not request a password reset, ignore this email. Your password will remain unchanged.'
    : 'If you did not request an account, ignore this email.';
  const escapedLink = link.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return {
    subject: recovery ? 'Reset your CREATE SOMETHING Private password' : 'Verify your CREATE SOMETHING Private email',
    text: `CREATE SOMETHING Private\n\n${title}\n\n${message}\n\n${action}:\n${link}\n\nThis link expires in 15 minutes and can be used once.\n\n${notice}`,
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${action}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0a0a"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff"><tr><td style="padding:32px 24px">
<p style="margin:0 0 36px;font-size:12px;line-height:1.5;letter-spacing:1px;font-weight:bold">CREATE SOMETHING<br><span style="font-weight:normal">Private networks / Account access</span></p>
<h1 style="margin:0 0 24px;padding:24px 16px;background:${recovery ? '#ff8ad8' : '#86e0a9'};font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:normal;line-height:1.15">${title}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${message}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#0a0a0a" style="background:#0a0a0a"><a href="${escapedLink}" style="display:inline-block;border:1px solid #0a0a0a;padding:14px 20px;color:#ffffff;font-size:16px;font-weight:bold;line-height:1.5;text-decoration:underline">${action}</a></td></tr></table>
<p style="margin:24px 0 12px;font-size:14px;line-height:1.6">Or copy and paste this link into your browser:</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere"><a href="${escapedLink}" style="color:#2349ac;text-decoration:underline">${escapedLink}</a></p>
<p style="margin:0 0 32px;font-size:14px;line-height:1.6">This link expires in 15 minutes and can be used once.</p>
<p style="margin:0;border-top:1px solid #d1d1cb;padding-top:24px;font-size:14px;line-height:1.6;color:#545450">${notice}</p>
</td></tr></table></td></tr></table></body></html>`
  };
}
