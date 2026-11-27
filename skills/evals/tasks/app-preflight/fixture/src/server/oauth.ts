import express from 'express';

export const router = express.Router();
export const tokens = new Map<string, string>();

const CLIENT_ID = process.env.WEBFLOW_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.WEBFLOW_CLIENT_SECRET ?? '';

router.get('/oauth/callback', async (req, res) => {
  const code = String(req.query.code ?? '');
  if (!code) {
    return res.status(400).send('Missing code');
  }

  const tokenRes = await fetch('https://api.webflow.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const { access_token } = await tokenRes.json();

  const sitesRes = await fetch('https://api.webflow.com/v2/sites', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const { sites } = await sitesRes.json();
  for (const site of sites) {
    tokens.set(site.id, access_token);
  }

  res.redirect('https://formlight.example.com/connected');
});
