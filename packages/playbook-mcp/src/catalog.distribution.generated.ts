/**
 * Distribution catalog for Playbook MCP consumers.
 *
 * Generated from `config/distribution/catalog.json`.
 * Regenerate with: pnpm distribution:generate
 */

export const DISTRIBUTION_CATALOG_VERSION = 2 as const;

export const DISTRIBUTION_CATALOG_ENTRIES = [
  {
    "id": "ground-extension",
    "kind": "extension",
    "title": "Ground Extension",
    "description": "Grounded claims for code. Package Ground as a Goose extension, then bundle it with CREATE SOMETHING policies and recipes.",
    "ownerPackage": "packages/ground",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "packages/ground/npm/README.md",
    "policyRefs": [
      "docs/MCP_CATALOG_EXPOSURE_POLICY.md"
    ],
    "telemetryKey": "distribution.ground.extension",
    "packageRefs": [
      "ground-policy-pack",
      "ground-review-recipe",
      "create-something-distro"
    ],
    "artifacts": {
      "npmPackage": "@createsomething/ground-mcp",
      "landingPage": "https://createsomething.agency/products/ground"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_extension",
          "label": "Install in Goose",
          "value": "goose://extension?cmd=npx&arg=-y&arg=%40createsomething%2Fground-mcp&timeout=300&id=ground&name=Ground&description=Grounded%20claims%20for%20code"
        },
        {
          "type": "stdio_command",
          "label": "Local stdio command",
          "command": "npx",
          "args": [
            "@createsomething/ground-mcp"
          ]
        }
      ]
    },
    "compatibility": {
      "hosts": [
        "cursor",
        "claude-code",
        "claude-desktop",
        "windsurf",
        "vscode",
        "codex"
      ],
      "installModes": [
        {
          "type": "cursor_deeplink",
          "host": "cursor",
          "label": "Cursor deeplink",
          "value": "cursor://anysphere.cursor-deeplink/mcp/install?name=ground&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2dyb3VuZC1tY3AiXX0%3D"
        },
        {
          "type": "claude_code_command",
          "host": "claude-code",
          "label": "Claude Code command",
          "value": "claude mcp add --scope user --transport stdio ground -- npx @createsomething/ground-mcp"
        },
        {
          "type": "claude_desktop_config",
          "host": "claude-desktop",
          "label": "Claude Desktop config",
          "value": "{\"mcpServers\":{\"ground\":{\"command\":\"npx\",\"args\":[\"@createsomething/ground-mcp\"]}}}"
        },
        {
          "type": "windsurf_config",
          "host": "windsurf",
          "label": "Windsurf config",
          "value": "{\"mcpServers\":{\"ground\":{\"command\":\"npx\",\"args\":[\"@createsomething/ground-mcp\"]}}}"
        },
        {
          "type": "vscode_extension_hint",
          "host": "vscode",
          "label": "VS Code MCP hint",
          "value": "Open Extensions, filter by \"MCP Server\", then search for \"ground\"."
        },
        {
          "type": "codex_command",
          "host": "codex",
          "label": "Codex CLI command",
          "value": "codex mcp add ground --command \"npx @createsomething/ground-mcp\""
        }
      ]
    },
    "verification": {
      "summary": "Verify the Goose extension is installed, then run one grounded claim workflow.",
      "steps": [
        {
          "label": "Confirm the Goose extension is listed",
          "prompt": "Open the Goose extension list and confirm `ground` is installed.",
          "expected": "Goose lists `ground` as an available extension."
        },
        {
          "label": "Run a Ground verification flow",
          "prompt": "Call `ground_compare` on two known files.",
          "expected": "The extension returns a computed result rather than a heuristic claim."
        }
      ]
    }
  },
  {
    "id": "loom-extension",
    "kind": "extension",
    "title": "Loom Extension",
    "description": "Shared memory and coordination for AI agents, packaged as a Goose extension and paired with CREATE SOMETHING coordination policies.",
    "ownerPackage": "packages/loom",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "packages/loom/npm/README.md",
    "policyRefs": [
      "docs/MCP_CATALOG_EXPOSURE_POLICY.md"
    ],
    "telemetryKey": "distribution.loom.extension",
    "packageRefs": [
      "loom-policy-pack",
      "loom-coordination-recipe",
      "create-something-distro"
    ],
    "artifacts": {
      "npmPackage": "@createsomething/loom-mcp",
      "landingPage": "https://createsomething.agency/products/loom"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_extension",
          "label": "Install in Goose",
          "value": "goose://extension?cmd=npx&arg=-y&arg=%40createsomething%2Floom-mcp&timeout=300&id=loom&name=Loom&description=Memory%20and%20coordination%20for%20AI%20agents"
        },
        {
          "type": "stdio_command",
          "label": "Local stdio command",
          "command": "npx",
          "args": [
            "@createsomething/loom-mcp"
          ]
        }
      ]
    },
    "compatibility": {
      "hosts": [
        "cursor",
        "claude-code",
        "claude-desktop",
        "windsurf",
        "vscode",
        "codex"
      ],
      "installModes": [
        {
          "type": "cursor_deeplink",
          "host": "cursor",
          "label": "Cursor deeplink",
          "value": "cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2xvb20tbWNwIl19"
        },
        {
          "type": "claude_code_command",
          "host": "claude-code",
          "label": "Claude Code command",
          "value": "claude mcp add loom -- npx @createsomething/loom-mcp"
        },
        {
          "type": "claude_desktop_config",
          "host": "claude-desktop",
          "label": "Claude Desktop config",
          "value": "{\"mcpServers\":{\"loom\":{\"command\":\"npx\",\"args\":[\"@createsomething/loom-mcp\"]}}}"
        },
        {
          "type": "windsurf_config",
          "host": "windsurf",
          "label": "Windsurf config",
          "value": "{\"mcpServers\":{\"loom\":{\"command\":\"npx\",\"args\":[\"@createsomething/loom-mcp\"]}}}"
        },
        {
          "type": "vscode_extension_hint",
          "host": "vscode",
          "label": "VS Code MCP hint",
          "value": "Open Extensions, filter by \"MCP Server\", then search for \"loom\"."
        },
        {
          "type": "codex_command",
          "host": "codex",
          "label": "Codex CLI command",
          "value": "codex mcp add loom --command \"npx @createsomething/loom-mcp\""
        }
      ]
    },
    "verification": {
      "summary": "Verify the Goose extension is installed, then query the Loom task surface.",
      "steps": [
        {
          "label": "Confirm the Goose extension is listed",
          "prompt": "Open the Goose extension list and confirm `loom` is installed.",
          "expected": "Goose lists `loom` as an available extension."
        },
        {
          "label": "Run a Loom readiness query",
          "prompt": "Call `loom_ready` or `loom_summary`.",
          "expected": "The extension returns valid task-state data or an empty-but-valid response."
        }
      ]
    }
  },
  {
    "id": "playbook-extension",
    "kind": "extension",
    "title": "Playbook Extension",
    "description": "Remote Playbook MCP packaged for Goose so workflow guidance, host onboarding, and install instructions can travel as a standard extension.",
    "ownerPackage": "packages/playbook-mcp",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "packages/playbook-mcp/README.md",
    "policyRefs": [
      "docs/MCP_CATALOG_EXPOSURE_POLICY.md"
    ],
    "telemetryKey": "distribution.playbook.extension",
    "packageRefs": [
      "create-something-distro"
    ],
    "artifacts": {
      "remoteMcpUrl": "https://playbook.mcp.createsomething.ltd/mcp"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_extension",
          "label": "Install remote extension in Goose",
          "value": "goose://extension?url=https%3A%2F%2Fplaybook.mcp.createsomething.ltd%2Fmcp&type=streamable_http&timeout=300&id=playbook&name=Playbook%20MCP&description=Host%20workflow%20playbooks%20for%20MCP%20onboarding"
        },
        {
          "type": "goose_bundle",
          "label": "Remote MCP URL",
          "value": "https://playbook.mcp.createsomething.ltd/mcp"
        }
      ]
    },
    "compatibility": {
      "hosts": [
        "cursor",
        "claude-code",
        "claude-desktop",
        "windsurf",
        "codex"
      ],
      "installModes": [
        {
          "type": "claude_code_command",
          "host": "claude-code",
          "label": "Claude Code command",
          "value": "claude mcp add playbook --transport http https://playbook.mcp.createsomething.ltd/mcp"
        },
        {
          "type": "claude_desktop_config",
          "host": "claude-desktop",
          "label": "Claude Desktop config",
          "value": "{\"mcpServers\":{\"playbook\":{\"url\":\"https://playbook.mcp.createsomething.ltd/mcp\"}}}"
        },
        {
          "type": "cursor_config",
          "host": "cursor",
          "label": "Cursor config",
          "value": "{\"mcpServers\":{\"playbook\":{\"url\":\"https://playbook.mcp.createsomething.ltd/mcp\"}}}"
        },
        {
          "type": "windsurf_config",
          "host": "windsurf",
          "label": "Windsurf config",
          "value": "{\"mcpServers\":{\"playbook\":{\"url\":\"https://playbook.mcp.createsomething.ltd/mcp\"}}}"
        },
        {
          "type": "codex_config",
          "host": "codex",
          "label": "Codex config",
          "value": "[mcp_servers.\"playbook\"]\nurl = \"https://playbook.mcp.createsomething.ltd/mcp\""
        }
      ]
    },
    "verification": {
      "summary": "Verify the remote extension is reachable, then read one playbook resource.",
      "steps": [
        {
          "label": "Confirm the Goose extension is listed",
          "prompt": "Open the Goose extension list and confirm `playbook` is installed.",
          "expected": "Goose lists `playbook` as an available extension."
        },
        {
          "label": "Read the playbook list",
          "prompt": "Read the `playbooks://list` resource.",
          "expected": "The resource returns the available host playbooks."
        }
      ]
    }
  },
  {
    "id": "create-something-extension",
    "kind": "extension",
    "title": "CREATE SOMETHING Content Extension",
    "description": "Single entry point to CREATE SOMETHING content packaged as a Goose extension for knowledge retrieval and product guidance.",
    "ownerPackage": "packages/create-something-mcp",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "packages/create-something-mcp/README.md",
    "policyRefs": [
      "docs/MCP_CATALOG_EXPOSURE_POLICY.md"
    ],
    "telemetryKey": "distribution.create-something.extension",
    "packageRefs": [
      "create-something-distro"
    ],
    "artifacts": {
      "remoteMcpUrl": "https://mcp.createsomething.ltd/mcp"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_extension",
          "label": "Install remote extension in Goose",
          "value": "goose://extension?url=https%3A%2F%2Fmcp.createsomething.ltd%2Fmcp&type=streamable_http&timeout=300&id=create-something&name=CREATE%20SOMETHING%20Content%20MCP&description=Single%20entry%20point%20to%20CREATE%20SOMETHING%20content"
        },
        {
          "type": "goose_bundle",
          "label": "Remote MCP URL",
          "value": "https://mcp.createsomething.ltd/mcp"
        }
      ]
    },
    "compatibility": {
      "hosts": [
        "cursor",
        "claude-code",
        "claude-desktop",
        "windsurf",
        "codex"
      ],
      "installModes": [
        {
          "type": "claude_code_command",
          "host": "claude-code",
          "label": "Claude Code command",
          "value": "claude mcp add create-something --transport http https://mcp.createsomething.ltd/mcp"
        },
        {
          "type": "claude_desktop_config",
          "host": "claude-desktop",
          "label": "Claude Desktop config",
          "value": "{\"mcpServers\":{\"create-something\":{\"url\":\"https://mcp.createsomething.ltd/mcp\"}}}"
        },
        {
          "type": "cursor_config",
          "host": "cursor",
          "label": "Cursor config",
          "value": "{\"mcpServers\":{\"create-something\":{\"url\":\"https://mcp.createsomething.ltd/mcp\"}}}"
        },
        {
          "type": "windsurf_config",
          "host": "windsurf",
          "label": "Windsurf config",
          "value": "{\"mcpServers\":{\"create-something\":{\"url\":\"https://mcp.createsomething.ltd/mcp\"}}}"
        },
        {
          "type": "codex_config",
          "host": "codex",
          "label": "Codex config",
          "value": "[mcp_servers.\"create-something\"]\nurl = \"https://mcp.createsomething.ltd/mcp\""
        }
      ]
    },
    "verification": {
      "summary": "Verify the remote extension is reachable, then run one content lookup.",
      "steps": [
        {
          "label": "Confirm the Goose extension is listed",
          "prompt": "Open the Goose extension list and confirm `create-something` is installed.",
          "expected": "Goose lists `create-something` as an available extension."
        },
        {
          "label": "Run a content search",
          "prompt": "Call `search` for `three-tier framework`.",
          "expected": "The extension returns matching CREATE SOMETHING documents."
        }
      ]
    }
  },
  {
    "id": "ground-policy-pack",
    "kind": "policy_pack",
    "title": "Ground Policy Pack",
    "description": "Persistent instructions, prompt templates, and adversary rules for verification-first code analysis in Goose.",
    "ownerPackage": "packages/judgment-layer",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "config/distribution/goose/policies/ground/README.md",
    "policyRefs": [
      "docs/MCP_CATALOG_EXPOSURE_POLICY.md",
      "packages/judgment-layer/README.md"
    ],
    "telemetryKey": "distribution.ground.policy-pack",
    "packageRefs": [
      "ground-extension",
      "ground-review-recipe",
      "create-something-distro"
    ],
    "artifacts": {
      "policyDir": "config/distribution/goose/policies/ground",
      "persistentInstructionsFile": "config/distribution/goose/policies/ground/persistent-instructions.md",
      "systemPromptFile": "config/distribution/goose/policies/ground/prompts/system.md",
      "permissionJudgeFile": "config/distribution/goose/policies/ground/prompts/permission_judge.md",
      "adversaryFile": "config/distribution/goose/policies/ground/adversary.md"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_bundle",
          "label": "Policy pack directory",
          "value": "config/distribution/goose/policies/ground"
        },
        {
          "type": "persistent_instructions_file",
          "label": "Persistent instructions file",
          "value": "config/distribution/goose/policies/ground/persistent-instructions.md"
        },
        {
          "type": "prompt_template_file",
          "label": "System prompt template",
          "value": "config/distribution/goose/policies/ground/prompts/system.md"
        },
        {
          "type": "prompt_template_file",
          "label": "Permission judge prompt template",
          "value": "config/distribution/goose/policies/ground/prompts/permission_judge.md"
        },
        {
          "type": "adversary_rule_file",
          "label": "Adversary rules file",
          "value": "config/distribution/goose/policies/ground/adversary.md"
        }
      ]
    },
    "verification": {
      "summary": "Verify Goose is reading the pack and enforcing verification-first behavior.",
      "steps": [
        {
          "label": "Load the persistent instructions file",
          "command": "cat config/distribution/goose/policies/ground/persistent-instructions.md",
          "expected": "The file states that Ground must verify claims before they are reported as facts."
        },
        {
          "label": "Exercise a Ground-required claim",
          "prompt": "Ask Goose to report duplicate code and confirm it reaches for Ground rather than guessing.",
          "expected": "Goose uses Ground or explicitly says the claim is unverified."
        }
      ]
    }
  },
  {
    "id": "loom-policy-pack",
    "kind": "policy_pack",
    "title": "Loom Policy Pack",
    "description": "Persistent instructions, prompt templates, and adversary rules for Loom-backed coordination and evidence capture in Goose.",
    "ownerPackage": "packages/judgment-layer",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "config/distribution/goose/policies/loom/README.md",
    "policyRefs": [
      "docs/MCP_CATALOG_EXPOSURE_POLICY.md",
      "packages/judgment-layer/README.md"
    ],
    "telemetryKey": "distribution.loom.policy-pack",
    "packageRefs": [
      "loom-extension",
      "loom-coordination-recipe",
      "create-something-distro"
    ],
    "artifacts": {
      "policyDir": "config/distribution/goose/policies/loom",
      "persistentInstructionsFile": "config/distribution/goose/policies/loom/persistent-instructions.md",
      "systemPromptFile": "config/distribution/goose/policies/loom/prompts/system.md",
      "planPromptFile": "config/distribution/goose/policies/loom/prompts/plan.md",
      "adversaryFile": "config/distribution/goose/policies/loom/adversary.md"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_bundle",
          "label": "Policy pack directory",
          "value": "config/distribution/goose/policies/loom"
        },
        {
          "type": "persistent_instructions_file",
          "label": "Persistent instructions file",
          "value": "config/distribution/goose/policies/loom/persistent-instructions.md"
        },
        {
          "type": "prompt_template_file",
          "label": "System prompt template",
          "value": "config/distribution/goose/policies/loom/prompts/system.md"
        },
        {
          "type": "prompt_template_file",
          "label": "Plan prompt template",
          "value": "config/distribution/goose/policies/loom/prompts/plan.md"
        },
        {
          "type": "adversary_rule_file",
          "label": "Adversary rules file",
          "value": "config/distribution/goose/policies/loom/adversary.md"
        }
      ]
    },
    "verification": {
      "summary": "Verify Goose is reading the pack and preserving Loom checkpoints as part of execution.",
      "steps": [
        {
          "label": "Load the persistent instructions file",
          "command": "cat config/distribution/goose/policies/loom/persistent-instructions.md",
          "expected": "The file states that meaningful work should use Loom readiness, claims, and checkpoints."
        },
        {
          "label": "Exercise a Loom-coordinated task",
          "prompt": "Ask Goose to start a meaningful task and confirm it reaches for Loom task state before claiming completion.",
          "expected": "Goose uses Loom or explicitly says why Loom was unavailable."
        }
      ]
    }
  },
  {
    "id": "ground-review-recipe",
    "kind": "recipe",
    "title": "Grounded Code Review Recipe",
    "description": "A Goose recipe that packages the Ground extension with CREATE SOMETHING verification-first review instructions.",
    "ownerPackage": "packages/playbook-mcp",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "config/distribution/goose/recipes/ground-review.yaml",
    "policyRefs": [
      "config/distribution/goose/policies/ground/README.md"
    ],
    "telemetryKey": "distribution.ground.recipe",
    "packageRefs": [
      "ground-extension",
      "ground-policy-pack",
      "create-something-distro"
    ],
    "artifacts": {
      "recipeFile": "config/distribution/goose/recipes/ground-review.yaml"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_recipe",
          "label": "Open recipe in Goose CLI",
          "command": "goose",
          "args": [
            "recipe",
            "open",
            "config/distribution/goose/recipes/ground-review.yaml"
          ]
        },
        {
          "type": "goose_bundle",
          "label": "Recipe file",
          "value": "config/distribution/goose/recipes/ground-review.yaml"
        }
      ]
    },
    "verification": {
      "summary": "Validate the recipe file, then confirm Goose loads the extension and instructions together.",
      "steps": [
        {
          "label": "Validate the recipe",
          "command": "goose recipe validate config/distribution/goose/recipes/ground-review.yaml",
          "expected": "Goose validates the recipe without schema errors."
        },
        {
          "label": "Open the recipe",
          "command": "goose recipe open config/distribution/goose/recipes/ground-review.yaml",
          "expected": "Goose opens a session with Ground and the bundled review instructions."
        }
      ]
    }
  },
  {
    "id": "loom-coordination-recipe",
    "kind": "recipe",
    "title": "Loom Coordination Recipe",
    "description": "A Goose recipe that packages the Loom extension with CREATE SOMETHING checkpoint and coordination rules.",
    "ownerPackage": "packages/playbook-mcp",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "config/distribution/goose/recipes/loom-coordination.yaml",
    "policyRefs": [
      "config/distribution/goose/policies/loom/README.md"
    ],
    "telemetryKey": "distribution.loom.recipe",
    "packageRefs": [
      "loom-extension",
      "loom-policy-pack",
      "create-something-distro"
    ],
    "artifacts": {
      "recipeFile": "config/distribution/goose/recipes/loom-coordination.yaml"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_recipe",
          "label": "Open recipe in Goose CLI",
          "command": "goose",
          "args": [
            "recipe",
            "open",
            "config/distribution/goose/recipes/loom-coordination.yaml"
          ]
        },
        {
          "type": "goose_bundle",
          "label": "Recipe file",
          "value": "config/distribution/goose/recipes/loom-coordination.yaml"
        }
      ]
    },
    "verification": {
      "summary": "Validate the recipe file, then confirm Goose loads Loom and the bundled coordination instructions together.",
      "steps": [
        {
          "label": "Validate the recipe",
          "command": "goose recipe validate config/distribution/goose/recipes/loom-coordination.yaml",
          "expected": "Goose validates the recipe without schema errors."
        },
        {
          "label": "Open the recipe",
          "command": "goose recipe open config/distribution/goose/recipes/loom-coordination.yaml",
          "expected": "Goose opens a session with Loom and the bundled coordination instructions."
        }
      ]
    }
  },
  {
    "id": "create-something-distro",
    "kind": "distro",
    "title": "CREATE SOMETHING Goose Distro Starter",
    "description": "Starter distro assets for packaging CREATE SOMETHING extensions, policy packs, and recipes as a single Goose-standard distribution.",
    "ownerPackage": "packages/agency",
    "visibility": "public",
    "entitlement": "public",
    "docsRef": "config/distribution/goose/distros/create-something/README.md",
    "policyRefs": [
      "docs/DISTRIBUTION_PLANE_PRODUCT_SPEC_2026-04-13.md"
    ],
    "telemetryKey": "distribution.create-something.distro",
    "packageRefs": [
      "ground-extension",
      "loom-extension",
      "playbook-extension",
      "create-something-extension",
      "ground-policy-pack",
      "loom-policy-pack",
      "ground-review-recipe",
      "loom-coordination-recipe"
    ],
    "artifacts": {
      "distroDir": "config/distribution/goose/distros/create-something",
      "initConfigFile": "config/distribution/goose/distros/create-something/init-config.yaml",
      "bundleRoot": "config/distribution/goose"
    },
    "goose": {
      "installModes": [
        {
          "type": "goose_distro",
          "label": "Starter init-config file",
          "value": "config/distribution/goose/distros/create-something/init-config.yaml"
        },
        {
          "type": "goose_bundle",
          "label": "Goose bundle root",
          "value": "config/distribution/goose"
        }
      ]
    },
    "verification": {
      "summary": "Verify the distro bundle includes extensions, policy packs, and recipes in one place.",
      "steps": [
        {
          "label": "Inspect the distro starter",
          "command": "cat config/distribution/goose/distros/create-something/init-config.yaml",
          "expected": "The init-config file sets the starter provider and model defaults."
        },
        {
          "label": "Inspect the bundle root",
          "command": "ls config/distribution/goose",
          "expected": "The bundle root exposes distros, policies, and recipes together."
        }
      ]
    }
  }
] as const;

export type DistributionCatalogEntry = (typeof DISTRIBUTION_CATALOG_ENTRIES)[number];
export type DistributionArtifactKind = DistributionCatalogEntry['kind'];
export type DistributionGooseInstallMode = DistributionCatalogEntry['goose']['installModes'][number];
export type DistributionCatalogEntryWithCompatibility = Extract<DistributionCatalogEntry, { compatibility: unknown }>;
export type DistributionCompatibility = NonNullable<DistributionCatalogEntryWithCompatibility['compatibility']>;
export type DistributionHost = DistributionCompatibility['hosts'][number];
export type DistributionCompatibilityInstallMode = DistributionCompatibility['installModes'][number];
export type DistributionVisibility = DistributionCatalogEntry['visibility'];
export type DistributionEntitlement = DistributionCatalogEntry['entitlement'];
