/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Sources: config/mcp-hub/registry.json, config/dify/inventory.json, config/public-trust/evidence.json
 * Regenerate with: pnpm trust:catalog:generate
 */

export const PUBLIC_TRUST_CATALOG = {
  "mcp": [
    {
      "kind": "mcp",
      "slug": "create-something",
      "name": "CREATE SOMETHING Content",
      "description": "Public read-only content MCP for CREATE SOMETHING papers, patterns, policy language, and framework references.",
      "status": "public",
      "accessModel": "read_only",
      "url": "https://mcp.createsomething.ltd/mcp",
      "transport": "http, sse",
      "authModel": "none",
      "toolCount": 5,
      "riskSummary": "Read-only public knowledge surface. No write tools, private client hubs, raw traces, or credential references are included in the public card.",
      "policyPack": "public-readonly-mcp.v1",
      "evalSuite": "braintrust:eval:mcp:public-trust",
      "evalStatus": "pass",
      "requiredChecks": [
        "auth_not_required",
        "endpoint_reachable",
        "expected_tools_present",
        "grounded_content",
        "latency_budget",
        "no_credential_material",
        "tool_call_ok",
        "tools_listed"
      ],
      "lastVerifiedDate": "2026-05-10",
      "evidenceRef": "mcp/create-something",
      "evidenceSummary": "The public card is limited to read-only content search, relationship traversal, classification, triad analysis, and design audit guidance over owned public CREATE SOMETHING material.",
      "observability": {
        "braintrust": {
          "project": "create-something-mcp",
          "experiment": "create_something_public_trust"
        },
        "langfuse": {
          "project": "create-something-mcp",
          "environment": "production"
        }
      },
      "runtimeObservability": {
        "provider": "langfuse",
        "status": "label_declared",
        "notes": "Runtime evidence is represented as a provider label only. Raw traces are not exposed publicly."
      },
      "externalListings": {
        "glama": "",
        "hugging_face": "",
        "docker": "",
        "github": "",
        "official_registry": ""
      },
      "samples": [
        {
          "title": "Public content search rollup",
          "path": "config/public-trust/samples/mcp-create-something-search.md"
        }
      ],
      "limitations": [
        "Public card exposes only read-only content and analysis tools.",
        "Catalog evidence is sanitized and does not include raw traces or private client hub data.",
        "Runtime behavior must remain inside public CREATE SOMETHING source material."
      ],
      "escalation": "security@createsomething.io",
      "installSnippets": [
        {
          "host": "Codex",
          "language": "toml",
          "value": "[mcp_servers.\"create-something\"]\nurl = \"https://mcp.createsomething.ltd/mcp\""
        },
        {
          "host": "Claude Desktop / Code",
          "language": "json",
          "value": "{\n  \"mcpServers\": {\n    \"create-something\": {\n      \"url\": \"https://mcp.createsomething.ltd/mcp\"\n    }\n  }\n}"
        },
        {
          "host": "Claude Code CLI",
          "language": "shell",
          "value": "claude mcp add --transport http create-something https://mcp.createsomething.ltd/mcp"
        },
        {
          "host": "Cursor",
          "language": "json",
          "value": "{\n  \"mcpServers\": {\n    \"create-something\": {\n      \"url\": \"https://mcp.createsomething.ltd/mcp\"\n    }\n  }\n}"
        }
      ],
      "sourceRefs": [
        "config/mcp-hub/registry.json",
        "config/public-trust/evidence.json"
      ]
    },
    {
      "kind": "mcp",
      "slug": "playbook",
      "name": "Playbook",
      "description": "Public read-only playbook MCP for MCP host setup guidance, workflow playbooks, and install pattern discovery.",
      "status": "public",
      "accessModel": "read_only",
      "url": "https://playbook.mcp.createsomething.ltd/mcp",
      "transport": "http, sse",
      "authModel": "none",
      "toolCount": 14,
      "riskSummary": "Read-only workflow guidance surface. Secret-echoing config generation is excluded from the public guide agent and public snippets are generated without credential values.",
      "policyPack": "public-playbook-mcp.v1",
      "evalSuite": "braintrust:eval:mcp:public-trust",
      "evalStatus": "pass",
      "requiredChecks": [
        "auth_not_required",
        "endpoint_reachable",
        "expected_tools_present",
        "grounded_content",
        "latency_budget",
        "no_credential_material",
        "tool_call_ok",
        "tools_listed"
      ],
      "lastVerifiedDate": "2026-05-10",
      "evidenceRef": "mcp/playbook",
      "evidenceSummary": "The public card covers read-only host playbooks, workflow retrieval, outcome playbooks, MCP discovery, and connection verification guidance.",
      "observability": {
        "braintrust": {
          "project": "playbook-mcp",
          "experiment": "playbook_public_trust"
        },
        "langfuse": {
          "project": "playbook-mcp",
          "environment": "production"
        }
      },
      "runtimeObservability": {
        "provider": "langfuse",
        "status": "label_declared",
        "notes": "Runtime evidence is represented as a provider label only. Raw traces are not exposed publicly."
      },
      "externalListings": {
        "glama": "",
        "hugging_face": "",
        "docker": "",
        "github": "",
        "official_registry": ""
      },
      "samples": [
        {
          "title": "Host playbook rollup",
          "path": "config/public-trust/samples/mcp-playbook-host-guidance.md"
        }
      ],
      "limitations": [
        "Generated setup snippets must never include secrets or bearer values.",
        "Workflow playbooks are templates, not live operational authority.",
        "Public evidence links to redacted samples only; raw traces remain private."
      ],
      "escalation": "security@createsomething.io",
      "installSnippets": [
        {
          "host": "Codex",
          "language": "toml",
          "value": "[mcp_servers.\"playbook\"]\nurl = \"https://playbook.mcp.createsomething.ltd/mcp\""
        },
        {
          "host": "Claude Desktop / Code",
          "language": "json",
          "value": "{\n  \"mcpServers\": {\n    \"playbook\": {\n      \"url\": \"https://playbook.mcp.createsomething.ltd/mcp\"\n    }\n  }\n}"
        },
        {
          "host": "Claude Code CLI",
          "language": "shell",
          "value": "claude mcp add --transport http playbook https://playbook.mcp.createsomething.ltd/mcp"
        },
        {
          "host": "Cursor",
          "language": "json",
          "value": "{\n  \"mcpServers\": {\n    \"playbook\": {\n      \"url\": \"https://playbook.mcp.createsomething.ltd/mcp\"\n    }\n  }\n}"
        }
      ],
      "sourceRefs": [
        "config/mcp-hub/registry.json",
        "config/public-trust/evidence.json"
      ]
    },
    {
      "kind": "mcp",
      "slug": "three-tier-framework",
      "name": "Three-Tier Framework",
      "description": "Public read-only Three-Tier Framework MCP for classifying systems across Database, Automation, and Judgment.",
      "status": "public",
      "accessModel": "read_only",
      "url": "https://framework.mcp.createsomething.agency/mcp",
      "transport": "http, sse",
      "authModel": "none",
      "toolCount": 6,
      "riskSummary": "Read-only advisory framework surface. It returns structured analysis and does not access private tenant state.",
      "policyPack": "public-three-tier-framework.v1",
      "evalSuite": "braintrust:eval:mcp:public-trust",
      "evalStatus": "pass",
      "requiredChecks": [
        "auth_not_required",
        "endpoint_reachable",
        "expected_tools_present",
        "grounded_content",
        "latency_budget",
        "no_credential_material",
        "tool_call_ok",
        "tools_listed"
      ],
      "lastVerifiedDate": "2026-05-10",
      "evidenceRef": "mcp/three-tier-framework",
      "evidenceSummary": "The public card covers read-only framework classification, debugging, MCP analysis, policy artifact identification, metaphor mapping, and architecture comparison.",
      "observability": {
        "braintrust": {
          "project": "three-tier-framework-mcp",
          "experiment": "three_tier_framework_public_trust"
        },
        "langfuse": {
          "project": "three-tier-framework-mcp",
          "environment": "production"
        }
      },
      "runtimeObservability": {
        "provider": "langfuse",
        "status": "label_declared",
        "notes": "Runtime evidence is represented as a provider label only. Raw traces are not exposed publicly."
      },
      "externalListings": {
        "glama": "",
        "hugging_face": "",
        "docker": "",
        "github": "",
        "official_registry": ""
      },
      "samples": [
        {
          "title": "Framework classification rollup",
          "path": "config/public-trust/samples/mcp-three-tier-framework-classification.md"
        }
      ],
      "limitations": [
        "Framework outputs are advisory and must be checked against the actual system being evaluated.",
        "Public evidence summarizes eval outcomes only; raw traces are not exposed.",
        "The server does not grant access to private client policies or tenant data."
      ],
      "escalation": "security@createsomething.io",
      "installSnippets": [
        {
          "host": "Codex",
          "language": "toml",
          "value": "[mcp_servers.\"three-tier-framework\"]\nurl = \"https://framework.mcp.createsomething.agency/mcp\""
        },
        {
          "host": "Claude Desktop / Code",
          "language": "json",
          "value": "{\n  \"mcpServers\": {\n    \"three-tier-framework\": {\n      \"url\": \"https://framework.mcp.createsomething.agency/mcp\"\n    }\n  }\n}"
        },
        {
          "host": "Claude Code CLI",
          "language": "shell",
          "value": "claude mcp add --transport http three-tier-framework https://framework.mcp.createsomething.agency/mcp"
        },
        {
          "host": "Cursor",
          "language": "json",
          "value": "{\n  \"mcpServers\": {\n    \"three-tier-framework\": {\n      \"url\": \"https://framework.mcp.createsomething.agency/mcp\"\n    }\n  }\n}"
        }
      ],
      "sourceRefs": [
        "config/mcp-hub/registry.json",
        "config/public-trust/evidence.json"
      ]
    }
  ],
  "agents": [
    {
      "kind": "agent",
      "slug": "create-something-guide-agent",
      "name": "CREATE SOMETHING Guide Agent",
      "description": "Public read-only Dify guide agent backed only by CREATE SOMETHING, Three-Tier Framework, and Playbook MCPs.",
      "status": "public",
      "accessModel": "read_only",
      "url": "https://udify.app/chat/4uWXtN5tF5KsLg36",
      "transport": "Dify agent over HTTP MCP cards",
      "authModel": "public Dify access",
      "toolCount": 18,
      "riskSummary": "No write-capable tools, private client hubs, broad connector surfaces, or credential-backed MCP cards are enabled.",
      "policyPack": "public-create-something-guide-agent.v1",
      "evalSuite": "braintrust:eval:dify:create-something-guide-agent",
      "evalStatus": "pass",
      "requiredChecks": [
        "api_health",
        "catalog_evidence_binding",
        "expected_tool_use",
        "forbidden_tool_use",
        "grounded_answer",
        "latency_budget",
        "prompt_secret_refusal",
        "public_access_boundary",
        "readonly_tool_surface",
        "secret_refusal",
        "smoke_cases_declared"
      ],
      "lastVerifiedDate": "2026-05-10",
      "evidenceRef": "agent/create-something-guide-agent",
      "evidenceSummary": "The public guide agent is a published read-only Dify agent backed only by the three public read-only MCPs in this catalog.",
      "observability": {
        "braintrust": {
          "project": "create-something-dify-agents",
          "experiment": "create_something_guide_agent"
        },
        "langfuse": {
          "project": "create-something-guide-agent",
          "environment": "public"
        }
      },
      "runtimeObservability": {
        "provider": "langfuse",
        "status": "in_service",
        "notes": "Dify Monitoring shows Langfuse tracing in service for the guide agent. Runtime evidence is represented as a provider label only; raw traces are not exposed publicly."
      },
      "externalListings": {
        "glama": "",
        "hugging_face": "",
        "docker": "",
        "github": "",
        "official_registry": ""
      },
      "samples": [
        {
          "title": "Public guide answer rollup",
          "path": "config/public-trust/samples/agent-create-something-guide.md"
        }
      ],
      "limitations": [
        "Read-only public access only; no writes, deployments, registry mutations, or client actions are available.",
        "No write-capable tools, private client hubs, Composio surfaces, or credential-backed MCP cards are enabled.",
        "Answers must cite public source material or describe uncertainty."
      ],
      "escalation": "security@createsomething.io",
      "installSnippets": [],
      "sourceRefs": [
        "config/dify/inventory.json",
        "config/dify-agents/create-something-guide-agent.json",
        "config/public-trust/evidence.json"
      ]
    }
  ]
} as const;
