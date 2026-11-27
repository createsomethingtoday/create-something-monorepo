import express from 'express';

export const router = express.Router();

type TenantConfig = {
  vendorBase: string;
  vendorApiKey: string;
  badgeText: string;
};

const configs = new Map<string, TenantConfig>([
  [
    'site-demo-1',
    {
      vendorBase: 'https://api.vendor.example.com',
      vendorApiKey: 'formlight-demo-vendor-key-not-real',
      badgeText: 'Thanks, we got it!',
    },
  ],
]);

export function saveConfig(siteId: string, config: TenantConfig) {
  configs.set(siteId, config);
}

router.get('/app-config', (req, res) => {
  const siteId = String(req.query.siteId ?? '');
  const config = configs.get(siteId);
  res.set('Access-Control-Allow-Origin', '*');
  if (!config) {
    return res.status(404).json({ error: 'No config for this site' });
  }
  res.json(config);
});
