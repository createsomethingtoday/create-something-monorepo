"""
Generate plagiarism detection comparison paper directly.
Bypasses bd show by using issue data directly.
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from create_something_agents import AgentConfig, CreateSomethingAgent

# Load API keys from python-test .env
load_dotenv("../templates-platform/workers/plagiarism-agent/python-test/.env")

SYSTEM_PROMPT = open("agents/paper_agent.py").read().split('SYSTEM_PROMPT = """')[1].split('"""')[0]

async def main():
    # Issue details (from csm-74458)
    issue_id = "csm-74458"
    title = "Workers vs Python SDK for Webflow Plagiarism Detection"
    description = """Compare the Workers implementation (vision + code analysis) vs Python SDK (AST + vision) for detecting plagiarism in Webflow templates. Key finding: Workers achieved same accuracy as Python SDK while being faster and cheaper. Vision analysis is critical for GUI-based tools like Webflow where code similarity can be 0% despite visual plagiarism."""

    slug = "workers-vs-python-sdk-plagiarism-detection"
    output_dir = Path("../io/src/routes/papers") / slug
    route_path = f"/papers/{slug}"

    task = f'''
Generate a CREATE SOMETHING paper from this research.

## Issue Details
- ID: {issue_id}
- Title: {title}
- Description: {description}
- Labels: io, research, paper

## MANDATORY: Use Tools Before Writing

**You MUST call bash and file_read tools before writing ANY content.**

### Step 1: Search with bash tool (REQUIRED)
Call the bash tool with these commands:
- grep -ri "plagiarism" packages/templates-platform/workers/plagiarism-agent/ --include="*.ts" | head -30
- ls -la packages/templates-platform/workers/plagiarism-agent/python-test/
- grep -ri "vision" packages/templates-platform/workers/plagiarism-agent/src/ --include="*.ts" | head -20

### Step 2: Read files with file_read tool (REQUIRED)
After searching, read the relevant files you found:
- file_read(path="packages/templates-platform/workers/plagiarism-agent/src/index.ts")
- file_read(path="packages/templates-platform/workers/plagiarism-agent/python-test/agent_enhanced.py")
- file_read(path="packages/templates-platform/workers/plagiarism-agent/python-test/README.md")

### Step 3: Extract facts from what you read
From the actual file contents:
- Quote exact code with line numbers
- Note real function names you saw
- Extract real metrics from test results

### Step 4: Write paper citing your sources
Every claim must reference a file you read:
- "In packages/templates-platform/workers/plagiarism-agent/src/index.ts:XXX..."
- "The Python SDK test results show..."

**If you skip Steps 1-2 and write without tool calls, your paper will be rejected.**

## Output Requirements

1. Create directory: {output_dir}

2. Create +page.svelte with:
   - Canon design tokens (var(--color-*), var(--radius-*), var(--text-*))
   - NO Tailwind design utilities (bg-white, rounded-lg, etc.)
   - Tailwind ONLY for layout (flex, grid, p-*, m-*, gap-*)
   - Proper <script lang="ts"> with types DEFINED INLINE (not imported)
   - Semantic HTML structure
   - Escape curly braces in code examples: {{`code`}}
   - Content based ONLY on verified facts

3. Static paper - no server file needed

4. After creating files successfully, close the Beads issue:
   bd close {issue_id} --no-db

## PAPER STRUCTURE REQUIREMENTS

Your paper MUST tell a story comparing Workers vs Python SDK for plagiarism detection.

Focus on the KEY FINDING from the test results:
- Workers achieved SAME accuracy as Python SDK ("minor" plagiarism detected in both)
- Workers cost $0.17 vs Python SDK $0.30-0.50
- Workers deployed globally on edge vs Python requires server
- Vision analysis is CRITICAL for detecting visual plagiarism even when code similarity is 0%

Include specific metrics from the test case (recgROoGWyyoQiSUq - Fluora vs Scalerfy/Interiora).

Generate complete, production-ready content. No placeholders. No TODOs.
Route will be: {route_path}
'''

    agent_config = AgentConfig(
        task=task,
        model="claude-sonnet-4-20250514",
        skills=["css-canon", "voice-canon", "sveltekit-conventions"],
        max_turns=50,
    )

    agent = CreateSomethingAgent(agent_config)
    agent.system_prompt = SYSTEM_PROMPT

    print(f"Generating paper: {title}")
    print(f"Output: {output_dir}")
    print("\nAgent working...\n")

    result = await agent.run()

    print(f"\n{'='*60}")
    print(f"Success: {result.success}")
    print(f"Model: {result.model}")
    print(f"Iterations: {result.iterations}")
    print(f"Cost: ${result.cost_usd:.4f}")
    print(f"{'='*60}\n")

    return 0 if result.success else 1

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))
