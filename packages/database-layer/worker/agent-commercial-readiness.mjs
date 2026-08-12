const RECEIPT_TABLE = 'agent_commercial_authorization_receipts';
const READINESS_PATH = '/api/agent-commercial/readiness';

const CONTROLS = Object.freeze({
  charging: 'disabled',
  maxPaidRequestsPerMinute: 0,
  maxPerRequestUsd: '0',
  maxDailySpendUsd: '0',
  automaticRetry: false
});

function jsonResponse(body, status, method = 'GET', extraHeaders = {}) {
  return new Response(method === 'HEAD' ? null : JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

async function receiptTableIsReady(database) {
  if (!database) return false;

  const row = await database
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?")
    .bind(RECEIPT_TABLE)
    .first();
  return row?.name === RECEIPT_TABLE;
}

export async function handleAgentCommercialReadiness(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== READINESS_PATH) return null;

  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return jsonResponse({ error: 'method_not_allowed', controls: CONTROLS }, 405, method, {
      allow: 'GET, HEAD'
    });
  }

  let ready = false;
  try {
    ready = await receiptTableIsReady(env?.COMMERCIAL_RECEIPTS);
  } catch {
    ready = false;
  }

  return jsonResponse(
    {
      contractId: 'create-something.agent-commercial.v1',
      environment: 'production',
      receiptSink: {
        adapterId: 'cloudflare.d1.commercial-receipts',
        status: ready ? 'ready' : 'unavailable'
      },
      payment: {
        adapterId: 'cloudflare.agents.x402',
        policyId: 'x402.agent-readiness-audit.v1',
        status: 'approval_required',
        price: { state: 'unset', amount: null }
      },
      controls: CONTROLS,
      nextGate: 'approved_price_and_public_copy'
    },
    ready ? 200 : 503,
    method
  );
}
