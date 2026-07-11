/**
 * Generated Canon overlay template file content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonOverlayTemplateFilePack } from '../types.js';

export const CANON_OVERLAY_TEMPLATE_FILE_PACK: CanonOverlayTemplateFilePack = {
  "schemaVersion": 1,
  "id": "canon-overlay-template-file-pack",
  "templateId": "overlay.project-template",
  "templateUri": "canon://overlays/overlay.project-template",
  "filesUri": "canon://overlays/overlay.project-template/files",
  "sourceOfTruth": "@create-something/canon/overlays/project-template",
  "description": "Read-only Canon project overlay template file pack generated from the Canon overlay renderer for web, chat, app, voice, and glasses surfaces.",
  "files": [
    {
      "id": "canon-overlay-template-file:overlay.project-template:theme.css",
      "templateId": "overlay.project-template",
      "relativePath": "theme.css",
      "outputPath": "packages/canon/src/lib/overlays/project-template/theme.css",
      "uri": "canon://overlays/overlay.project-template/files/theme.css",
      "mimeType": "text/css",
      "content": "/*\n * Canon Project Overlay Template theme overlay.\n * Generated from @create-something/canon/overlays/project-template.\n * Keep aliases pointed at Canon tokens instead of forking primitives.\n */\n\n:root {\n\t--overlay-accent: var(--color-performance-signal, #0057b8);\n\t--overlay-accent-contrast: var(--color-performance-panel, #ffffff);\n\t--overlay-surface: var(--color-performance-panel, #ffffff);\n\t--overlay-surface-muted: var(--color-performance-paper, #f3f3f0);\n\t--overlay-border: var(--color-performance-line, #d7d7d2);\n\t--overlay-proof: var(--color-performance-growth, #007a4d);\n\t--overlay-review: var(--color-performance-gold, #8b6b00);\n\t--overlay-block: var(--color-performance-risk, #c62026);\n\t--overlay-radius: var(--radius-performance-md, 4px);\n\t--overlay-focus-ring: 0 0 0 3px color-mix(in srgb, var(--overlay-accent) 24%, transparent);\n}\n\n[data-canon-overlay='overlay.project-template'] {\n\tcolor: var(--color-performance-ink, #090909);\n\tbackground: var(--overlay-surface);\n}\n\n[data-canon-overlay='overlay.project-template'] :focus-visible {\n\toutline: none;\n\tbox-shadow: var(--overlay-focus-ring);\n}\n",
      "description": "Project-local CSS aliases that point back to Canon tokens."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:tokens.json",
      "templateId": "overlay.project-template",
      "relativePath": "tokens.json",
      "outputPath": "packages/canon/src/lib/overlays/project-template/tokens.json",
      "uri": "canon://overlays/overlay.project-template/files/tokens.json",
      "mimeType": "application/json",
      "content": "{\n  \"$schema\": \"https://design-tokens.github.io/community-group/format/\",\n  \"$extensions\": {\n    \"canonOverlay\": {\n      \"id\": \"overlay.project-template\",\n      \"name\": \"Canon Project Overlay Template\",\n      \"sourcePackage\": \"@create-something/example-project\"\n    }\n  },\n  \"canonOverlay\": {\n    \"accent\": {\n      \"$type\": \"color\",\n      \"$value\": \"{color.performance.signal}\",\n      \"$description\": \"Project accent alias. Keep the underlying Canon token as the source of truth.\"\n    },\n    \"surface\": {\n      \"$type\": \"color\",\n      \"$value\": \"{color.performance.panel}\",\n      \"$description\": \"Default overlay surface alias for web and app shells.\"\n    },\n    \"proof\": {\n      \"$type\": \"color\",\n      \"$value\": \"{color.performance.ready}\",\n      \"$description\": \"Evidence and receipt state alias. Must be paired with text labels.\"\n    },\n    \"radius\": {\n      \"$type\": \"dimension\",\n      \"$value\": \"{radius.performance.md}\",\n      \"$description\": \"Overlay radius alias. Do not introduce a project-specific radius scale.\"\n    }\n  }\n}\n",
      "description": "Design-token aliases for project-specific names without creating a new token scale."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:templates/README.md",
      "templateId": "overlay.project-template",
      "relativePath": "templates/README.md",
      "outputPath": "packages/canon/src/lib/overlays/project-template/templates/README.md",
      "uri": "canon://overlays/overlay.project-template/files/templates%2FREADME.md",
      "mimeType": "text/markdown",
      "content": "# Canon Project Overlay Template Templates\n\nCopy these templates into project surfaces and fill in project-specific details.\n\n## Files\n\n- `surface-brief.md`: one surface or client workflow brief.\n\n## Template Rules\n\n- Keep template structure stable so agents can compare overlays across clients.\n- Put project language in the overlay, not in Canon primitives.\n- Attach extension-intake packets only when the project needs a primitive, template, adapter, token, or policy that Canon does not already provide.\n",
      "description": "Overlay template directory guide and template rules."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:templates/surface-brief.md",
      "templateId": "overlay.project-template",
      "relativePath": "templates/surface-brief.md",
      "outputPath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
      "uri": "canon://overlays/overlay.project-template/files/templates%2Fsurface-brief.md",
      "mimeType": "text/markdown",
      "content": "# Surface Brief\n\nOverlay: Canon Project Overlay Template (overlay.project-template)\n\n## Surface\n\n- Name:\n- Modality: web | chat | app | voice | glasses\n- Owner: project-owner\n- Source path:\n\n## Workflow Need\n\nDescribe the workflow object, action, policy, owner, and receipt.\n\n## Canon Reuse\n\n- Registry items:\n- Imported components:\n- Token aliases:\n\n## Local Overlay\n\n- Theme changes:\n- Copy rules:\n- Surface policy:\n- Templates:\n\n## Evidence\n\n- Receipt:\n- Validation command:\n- Second surface or client proof:\n\n## Extension Intake\n\nUse only when the local overlay cannot reuse an existing Canon registry item.\n",
      "description": "Surface brief template for workflow need, Canon reuse, local overlay artifacts, evidence, and extension intake."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:copy-rules.md",
      "templateId": "overlay.project-template",
      "relativePath": "copy-rules.md",
      "outputPath": "packages/canon/src/lib/overlays/project-template/copy-rules.md",
      "uri": "canon://overlays/overlay.project-template/files/copy-rules.md",
      "mimeType": "text/markdown",
      "content": "# Canon Project Overlay Template Copy Rules\n\nUse this file to define project-local language while preserving Canon structure.\n\n## Rules\n\n- Name the workflow object before the action.\n- Name the owner, evidence, receipt, and next action when a surface asks for trust.\n- Keep state words stable across modalities: `ready`, `review`, `blocked`, `complete`.\n- Keep reasoning and policy details off thin displays; summarize the decision and route to the full receipt.\n- Do not rename Canon primitives to project-specific concepts when the primitive behavior is unchanged.\n\n## Voice And Chat\n\n- Prefer short declarative sentences.\n- Make handoffs explicit: who owns the next step, what proof exists, and where the durable record lives.\n- Do not put private chain-of-thought, hidden policy text, or speculative rationale in user-visible output.\n\n## Web And App\n\n- Put proof beside claims.\n- Use action labels that describe the result, not the component.\n- Keep local marketing tone in project copy files, not Canon primitives.\n",
      "description": "Project-local terminology and voice rules that preserve Canon structure."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:surface-policy.md",
      "templateId": "overlay.project-template",
      "relativePath": "surface-policy.md",
      "outputPath": "packages/canon/src/lib/overlays/project-template/surface-policy.md",
      "uri": "canon://overlays/overlay.project-template/files/surface-policy.md",
      "mimeType": "text/markdown",
      "content": "# Canon Project Overlay Template Surface Policy\n\nThis policy keeps @create-something/example-project overlays portable across web, chat, app, voice, glasses without forking Canon.\n\n## Web\n\n- Use Canon components and tokens first.\n- Add project-local layout, copy, and theme aliases only when the consuming route needs them.\n- Keep receipt, evidence, and owner metadata visible near decisions.\n\n## Chat\n\n- Return compact summaries grounded in overlay artifacts.\n- Name the registry item or template before suggesting a local primitive.\n- Route primitive changes through Canon extension intake.\n\n## App\n\n- Preserve touch targets, focus order, and text state labels.\n- Use local templates for workflow-specific screens, not new base components.\n\n## Voice\n\n- Speak status, owner, and next action.\n- Do not read long policy text. Point to the receipt or durable record.\n\n## Glasses\n\n- Show only glanceable state, owner, and next action.\n- Keep reasoning, review history, and policy bodies on larger surfaces.\n\n## Promotion Boundary\n\nProject overlays can become Canon candidates only after repeated-surface evidence exists. Until then, keep implementation, copy, and policy local to the named overlay.\n",
      "description": "Modality policy for web, chat, app, voice, and glasses overlays."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:registry.json",
      "templateId": "overlay.project-template",
      "relativePath": "registry.json",
      "outputPath": "packages/canon/src/lib/overlays/project-template/registry.json",
      "uri": "canon://overlays/overlay.project-template/files/registry.json",
      "mimeType": "application/json",
      "content": "{\n  \"id\": \"overlay.project-template\",\n  \"name\": \"Canon Project Overlay Template\",\n  \"owner\": \"project-owner\",\n  \"sourcePackage\": \"@create-something/example-project\",\n  \"targetModalities\": [\n    \"web\",\n    \"chat\",\n    \"app\",\n    \"voice\",\n    \"glasses\"\n  ],\n  \"registryItemIds\": [\n    \"token.canon-core\",\n    \"component.clear-decision-panel\",\n    \"component.clear-proof-strip\",\n    \"template.canon-project-overlay-manifest\",\n    \"template.canon-extension-intake\",\n    \"policy.signal-decision-proof\"\n  ],\n  \"overlayRule\": \"Use project-local artifacts for theme, tokens, templates, copy, surface policy, and registry metadata. Route primitive changes through Canon extension intake instead of forking Canon.\"\n}\n",
      "description": "Project-local registry metadata and Canon dependency list."
    },
    {
      "id": "canon-overlay-template-file:overlay.project-template:manifest.ts",
      "templateId": "overlay.project-template",
      "relativePath": "manifest.ts",
      "outputPath": "packages/canon/src/lib/overlays/project-template/manifest.ts",
      "uri": "canon://overlays/overlay.project-template/files/manifest.ts",
      "mimeType": "text/typescript",
      "content": "export const CANON_PROJECT_OVERLAY_MANIFEST = {\n  \"id\": \"overlay.project-template\",\n  \"name\": \"Canon Project Overlay Template\",\n  \"owner\": \"project-owner\",\n  \"sourcePackage\": \"@create-something/example-project\",\n  \"sourcePath\": \"manifest.ts\",\n  \"targetModalities\": [\n    \"web\",\n    \"chat\",\n    \"app\",\n    \"voice\",\n    \"glasses\"\n  ],\n  \"tags\": [\n    \"canon\",\n    \"overlay\",\n    \"template\",\n    \"project\",\n    \"client\",\n    \"governance\"\n  ],\n  \"artifacts\": [\n    {\n      \"kind\": \"theme\",\n      \"path\": \"theme.css\",\n      \"description\": \"Project-local CSS aliases that point back to Canon tokens.\",\n      \"registryItemIds\": [\n        \"token.canon-core\"\n      ]\n    },\n    {\n      \"kind\": \"tokens\",\n      \"path\": \"tokens.json\",\n      \"description\": \"Design-token aliases for project-specific names without a new token scale.\",\n      \"registryItemIds\": [\n        \"token.canon-core\"\n      ]\n    },\n    {\n      \"kind\": \"templates\",\n      \"path\": \"templates\",\n      \"description\": \"Copyable briefs for surface-specific workflow overlays.\",\n      \"registryItemIds\": [\n        \"template.canon-project-overlay-manifest\",\n        \"template.canon-extension-intake\"\n      ]\n    },\n    {\n      \"kind\": \"copy-rules\",\n      \"path\": \"copy-rules.md\",\n      \"description\": \"Project voice and terminology rules that keep Canon primitives stable.\",\n      \"registryItemIds\": [\n        \"policy.signal-decision-proof\"\n      ]\n    },\n    {\n      \"kind\": \"surface-policy\",\n      \"path\": \"surface-policy.md\",\n      \"description\": \"Modality policy for web, chat, app, voice, and glasses overlays.\",\n      \"registryItemIds\": [\n        \"policy.signal-decision-proof\"\n      ]\n    },\n    {\n      \"kind\": \"registry\",\n      \"path\": \"registry.json\",\n      \"description\": \"Project-local registry metadata and Canon dependency list.\",\n      \"registryItemIds\": [\n        \"component.clear-decision-panel\",\n        \"component.clear-proof-strip\",\n        \"template.canon-project-overlay-manifest\"\n      ]\n    }\n  ],\n  \"extensionIntakes\": [\n    {\n      \"id\": \"overlay.project-template.surface-brief\",\n      \"title\": \"Surface Brief Template\",\n      \"summary\": \"A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.\",\n      \"requestedKind\": \"template\",\n      \"requestedModalities\": [\n        \"web\",\n        \"chat\",\n        \"app\",\n        \"voice\",\n        \"glasses\"\n      ],\n      \"owner\": \"project-owner\",\n      \"sourcePackage\": \"@create-something/example-project\",\n      \"sourcePath\": \"canon-overlay/templates/surface-brief.md\",\n      \"tags\": [\n        \"overlay\",\n        \"brief\",\n        \"surface\",\n        \"evidence\"\n      ],\n      \"surfaces\": [\n        {\n          \"surfaceId\": \"web-project-template-brief-1\",\n          \"name\": \"Web project overlay brief\",\n          \"modality\": \"web\",\n          \"sourcePath\": \"canon-overlay/templates/surface-brief.md\",\n          \"proof\": \"Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake.\"\n        },\n        {\n          \"surfaceId\": \"chat-project-template-brief-2\",\n          \"name\": \"Chat project overlay brief\",\n          \"modality\": \"chat\",\n          \"sourcePath\": \"canon-overlay/templates/surface-brief.md\",\n          \"proof\": \"The same structure summarizes cleanly for agent/chat handoff.\"\n        }\n      ],\n      \"dependencies\": [\n        \"template.canon-project-overlay-manifest\",\n        \"template.canon-extension-intake\",\n        \"policy.signal-decision-proof\"\n      ]\n    }\n  ]\n};\n",
      "description": "TypeScript overlay manifest export for Canon intake inventory."
    }
  ],
  "summary": {
    "totalFiles": 8
  },
  "agentContract": {
    "purpose": "canon-overlay-template-file-resources",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "inspecting the exact Canon project overlay starter files before instantiation",
      "copying artifact structure for theme, tokens, templates, copy rules, surface policy, registry metadata, and manifest wiring",
      "checking overlay file bodies without writing into a project package"
    ],
    "stopBefore": [
      "writing template files into apps or packages",
      "treating a template file as a project-specific overlay approval",
      "mutating Canon registry, project overlays, candidate queues, or promotion state",
      "forking Canon primitives instead of using overlay artifacts"
    ]
  }
};
