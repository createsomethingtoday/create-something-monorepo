#!/usr/bin/env python3
"""Update the connection layer in an existing local Draw & Motion plugin."""
import argparse
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('plugin', type=Path)
args = parser.parse_args()
root = args.plugin.resolve()
manifest_path = root / '.codex-plugin/plugin.json'
manifest = json.loads(manifest_path.read_text())
if manifest.get('name') != 'draw-motion-descript':
    raise SystemExit('Expected the existing draw-motion-descript plugin; nothing changed.')
source = Path(__file__).resolve().parent.parent
(root / 'scripts').mkdir(exist_ok=True)
for script in ['draw-agent.py', 'draw_intent.py']:
    shutil.copy2(source / 'scripts' / script, root / 'scripts' / script)
shutil.copytree(source / 'agent-plugin/skills/draw-agent', root / 'skills/draw-agent', dirs_exist_ok=True)
config_path = root / '.mcp.json'
config = json.loads(config_path.read_text()) if config_path.exists() else {'mcpServers': {}}
config.setdefault('mcpServers', {})['draw-agent'] = json.loads((source / 'agent-plugin/mcp.json').read_text())['mcpServers']['draw-agent']
config_path.write_text(json.dumps(config, indent=2) + '\n')
manifest['mcpServers'] = './.mcp.json'
manifest['description'] = 'Collaborate with agents in Draw Canvas and Motion, and create verified narrated animations with Descript.'
manifest['interface']['shortDescription'] = 'Connect, draw, animate and narrate.'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
skill_path = root / 'skills/draw-motion-descript/SKILL.md'
skill = skill_path.read_text()
section = '\n## Live Draw connection\n\nFor live work in an open Draw project, use the bundled [Draw agent skill](../draw-agent/SKILL.md). It supplies scoped pairing, current tool discovery, real operation activity, reload recovery and receipt verification across browsers, including those without WebMCP. Keep the narration and export steps below for narrated work.\n'
if '## Live Draw connection' not in skill:
    skill = skill.replace('\n## Workflow\n', section + '\n## Workflow\n')
skill = skill.replace('This plugin does not bundle a Motion MCP or renderer.', 'This plugin bundles the Draw agent connection; it does not bundle a renderer.')
skill = skill.replace('No new MCP server is required. Use official Descript CLI help', 'The bundled Draw MCP adapter controls only explicitly paired projects. Use official Descript CLI help')
skill_path.write_text(skill)
print('Updated Draw connection adapter and skill; preserved existing narration scripts and configuration.')
