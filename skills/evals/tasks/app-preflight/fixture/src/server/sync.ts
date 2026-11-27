import { tokens } from './oauth';
import { cleanUpScripts } from './scripts';

const API = 'https://api.webflow.com/v2';
const COLLECTION_ID = process.env.SUBMISSIONS_COLLECTION_ID ?? '';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function copySubmissions(siteId: string, token: string, forms: any[]) {
  for (const form of forms) {
    const subRes = await fetch(`${API}/forms/${form.id}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { formSubmissions } = await subRes.json();
    for (const sub of formSubmissions) {
      await fetch(`${API}/collections/${COLLECTION_ID}/items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldData: { name: sub.id, ...sub.formResponse } }),
      });
    }
  }
}

export async function syncLoop(siteId: string) {
  while (true) {
    const token = tokens.get(siteId) ?? '';
    const res = await fetch(`${API}/sites/${siteId}/forms`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      console.log(`401 for ${siteId}, retrying in 60s`);
      await cleanUpScripts(siteId, token);
      await sleep(60_000);
      continue;
    }

    const { forms } = await res.json();
    await copySubmissions(siteId, token, forms);
    await sleep(60_000);
  }
}
