#!/usr/bin/env node

const ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';
const RULE_DESCRIPTION = 'CRE-946 Phase 1 block scanner probes on non-MCP hosts';
const PHASE = 'http_request_firewall_custom';

const zones = [
  {
    name: 'createsomething.agency',
    id: '6fdaff20a7e856e3accef35d006fc61d'
  },
  {
    name: 'createsomething.io',
    id: '411bda42fd6e9a103f1117c928a3370b'
  },
  {
    name: 'createsomething.ltd',
    id: 'a3377623edefbcca66ac94d64e00b3ba'
  },
  {
    name: 'createsomething.space',
    id: 'ad61fd6e0fee2d32a574d3d4f34ee443'
  }
];

const scannerExpression = `(
  not (http.host contains ".mcp.createsomething.")
  and (
    http.request.uri.path contains "/.env"
    or http.request.uri.path contains "/.git"
    or starts_with(http.request.uri.path, "/wp-")
    or http.request.uri.path contains "/wp-content/"
    or http.request.uri.path contains "/wp-includes/"
    or http.request.uri.path contains "/xmlrpc.php"
    or http.request.uri.path contains "/cgi-bin/"
    or ends_with(http.request.uri.path, ".php")
  )
)`;

const desiredRule = {
  description: RULE_DESCRIPTION,
  expression: scannerExpression,
  action: 'block',
  enabled: true
};

function parseArgs(argv) {
  const options = {
    apply: false,
    zone: 'all'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--zone') {
      options.zone = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function getApiToken() {
  const token = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_WAF_API_TOKEN;
  if (!token) {
    throw new Error('Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_WAF_API_TOKEN.');
  }
  return token;
}

async function request(path, { method = 'GET', body, token }) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));

  return {
    status: response.status,
    ok: response.ok && payload.success !== false,
    payload
  };
}

async function getEntryPoint(zone, token) {
  const response = await request(`/zones/${zone.id}/rulesets/phases/${PHASE}/entrypoint`, {
    token
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `${zone.name}: failed to read ${PHASE}: ${JSON.stringify(response.payload.errors ?? response.payload)}`
    );
  }

  return response.payload.result;
}

async function createEntryPoint(zone, token) {
  const response = await request(`/zones/${zone.id}/rulesets`, {
    method: 'POST',
    token,
    body: {
      name: 'CREATE SOMETHING zone custom firewall rules',
      description: 'Zone-level custom firewall rules managed from create-something-monorepo.',
      kind: 'zone',
      phase: PHASE,
      rules: [desiredRule]
    }
  });

  if (!response.ok) {
    throw new Error(
      `${zone.name}: failed to create ${PHASE}: ${JSON.stringify(response.payload.errors ?? response.payload)}`
    );
  }

  return {
    action: 'created_entrypoint',
    rulesetId: response.payload.result.id,
    ruleId: response.payload.result.rules?.[0]?.id
  };
}

async function createRule(zone, rulesetId, token) {
  const response = await request(`/zones/${zone.id}/rulesets/${rulesetId}/rules`, {
    method: 'POST',
    token,
    body: desiredRule
  });

  if (!response.ok) {
    throw new Error(
      `${zone.name}: failed to create rule: ${JSON.stringify(response.payload.errors ?? response.payload)}`
    );
  }

  return {
    action: 'created_rule',
    rulesetId,
    ruleId: response.payload.result.id
  };
}

async function updateRule(zone, rulesetId, ruleId, token) {
  const response = await request(`/zones/${zone.id}/rulesets/${rulesetId}/rules/${ruleId}`, {
    method: 'PATCH',
    token,
    body: desiredRule
  });

  if (!response.ok) {
    throw new Error(
      `${zone.name}: failed to update rule: ${JSON.stringify(response.payload.errors ?? response.payload)}`
    );
  }

  return {
    action: 'updated_rule',
    rulesetId,
    ruleId
  };
}

async function planZone(zone, token) {
  const entryPoint = await getEntryPoint(zone, token);

  if (!entryPoint) {
    return {
      zone: zone.name,
      status: 'missing_entrypoint',
      plannedAction: 'create_entrypoint_with_rule',
      expression: desiredRule.expression
    };
  }

  const existingRule = (entryPoint.rules ?? []).find(
    (rule) => rule.description === RULE_DESCRIPTION
  );
  if (!existingRule) {
    return {
      zone: zone.name,
      status: 'missing_rule',
      plannedAction: 'create_rule',
      rulesetId: entryPoint.id,
      existingRules: (entryPoint.rules ?? []).map((rule) => ({
        id: rule.id,
        action: rule.action,
        enabled: rule.enabled,
        description: rule.description
      })),
      expression: desiredRule.expression
    };
  }

  const matches =
    existingRule.action === desiredRule.action &&
    existingRule.enabled === desiredRule.enabled &&
    existingRule.expression === desiredRule.expression;

  return {
    zone: zone.name,
    status: matches ? 'up_to_date' : 'needs_update',
    plannedAction: matches ? 'none' : 'update_rule',
    rulesetId: entryPoint.id,
    ruleId: existingRule.id,
    current: {
      action: existingRule.action,
      enabled: existingRule.enabled,
      expression: existingRule.expression
    },
    desired: desiredRule
  };
}

async function applyZone(zone, token) {
  const plan = await planZone(zone, token);

  if (plan.status === 'up_to_date') {
    return {
      zone: zone.name,
      ...plan,
      applied: false
    };
  }

  if (plan.status === 'missing_entrypoint') {
    return {
      zone: zone.name,
      ...plan,
      ...(await createEntryPoint(zone, token)),
      applied: true
    };
  }

  if (plan.status === 'missing_rule') {
    return {
      zone: zone.name,
      ...plan,
      ...(await createRule(zone, plan.rulesetId, token)),
      applied: true
    };
  }

  if (plan.status === 'needs_update') {
    return {
      zone: zone.name,
      ...plan,
      ...(await updateRule(zone, plan.rulesetId, plan.ruleId, token)),
      applied: true
    };
  }

  throw new Error(`${zone.name}: unsupported plan status ${plan.status}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = getApiToken();
  const selectedZones =
    options.zone === 'all'
      ? zones
      : zones.filter((zone) => zone.name === options.zone || zone.id === options.zone);

  if (selectedZones.length === 0) {
    throw new Error(`No zone matched ${options.zone}.`);
  }

  const results = [];
  for (const zone of selectedZones) {
    results.push(options.apply ? await applyZone(zone, token) : await planZone(zone, token));
  }

  console.log(
    JSON.stringify(
      {
        accountId: ACCOUNT_ID,
        phase: PHASE,
        mode: options.apply ? 'apply' : 'plan',
        ruleDescription: RULE_DESCRIPTION,
        results
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
