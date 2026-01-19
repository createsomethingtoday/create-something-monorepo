#!/usr/bin/env python3
"""
RLM DRY Violation Analysis

Runs the Recursive Language Model to find DRY violations in the codebase.
Focuses on: catch blocks, console calls, validation patterns, identity API fetches.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from create_something_agents.rlm.session import RLMSession, RLMConfig
from create_something_agents.providers.claude import ClaudeProvider


def gather_codebase_context(
    root_dir: str,
    extensions: tuple[str, ...] = (".ts", ".svelte"),
    max_files: int = 100,
    max_chars: int = 200000,
) -> str:
    """
    Gather TypeScript and Svelte files from the codebase.
    
    Focuses on route handlers where DRY violations are most common.
    """
    root = Path(root_dir)
    files_content: list[str] = []
    total_chars = 0
    file_count = 0
    
    # Priority directories for API endpoints
    priority_dirs = [
        root / "packages" / "ltd" / "src" / "routes",
        root / "packages" / "space" / "src" / "routes",
        root / "packages" / "io" / "src" / "routes",
        root / "packages" / "lms" / "src" / "routes",
        root / "packages" / "agency" / "src" / "routes",
    ]
    
    for priority_dir in priority_dirs:
        if not priority_dir.exists():
            continue
            
        for ext in extensions:
            for file_path in priority_dir.rglob(f"*{ext}"):
                if file_count >= max_files:
                    break
                    
                # Skip node_modules and generated files
                if "node_modules" in str(file_path) or ".svelte-kit" in str(file_path):
                    continue
                
                try:
                    content = file_path.read_text(encoding="utf-8")
                    
                    # Skip very small files
                    if len(content) < 100:
                        continue
                    
                    # Skip if would exceed max chars
                    if total_chars + len(content) > max_chars:
                        continue
                    
                    relative_path = file_path.relative_to(root)
                    files_content.append(f"\n{'='*60}\nFILE: {relative_path}\n{'='*60}\n{content}")
                    total_chars += len(content)
                    file_count += 1
                    
                except Exception as e:
                    print(f"Warning: Could not read {file_path}: {e}")
    
    print(f"Gathered {file_count} files, {total_chars:,} characters")
    return "\n".join(files_content)


async def main():
    # Get API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)
    
    # Get monorepo root
    monorepo_root = Path(__file__).parent.parent.parent.parent
    print(f"Monorepo root: {monorepo_root}")
    
    # Gather codebase context
    print("Gathering codebase context...")
    context = gather_codebase_context(
        str(monorepo_root),
        extensions=(".ts",),  # Focus on TypeScript for API routes
        max_files=60,
        max_chars=180000,
    )
    
    if not context:
        print("Error: No files found")
        sys.exit(1)
    
    # Create provider and session
    provider = ClaudeProvider(api_key=api_key)
    
    config = RLMConfig(
        root_model="claude-sonnet-4-20250514",
        sub_model="claude-haiku-4-20250514",
        max_iterations=8,
        max_sub_calls=10,
    )
    
    session = RLMSession(
        context=context,
        provider=provider,
        config=config,
    )
    
    # Query for DRY violations
    query = r"""Find DRY (Don't Repeat Yourself) violations in this TypeScript codebase.

Focus on these specific patterns:

1. **catch_blocks**: Try/catch blocks with similar error handling that should use `catchApiError()`:
   ```typescript
   // Violation pattern:
   try { ... } catch (err) { console.error(...); return json({ error: ... }); }
   
   // Should use:
   import { catchApiError } from '@create-something/components/utils';
   export const POST = catchApiError('MyAPI', async (event) => { ... });
   ```

2. **console_calls**: Direct console.log/error/warn that should use `createLogger()`:
   ```typescript
   // Violation pattern:
   console.log('[MyAPI]', ...);
   console.error('Error:', err);
   
   // Should use:
   import { createLogger } from '@create-something/components/utils';
   const logger = createLogger('MyAPI');
   logger.info('message', { data });
   ```

3. **validation_patterns**: Manual string/array validation that should use helpers:
   ```typescript
   // Violation pattern:
   if (!name || typeof name !== 'string' || name.trim().length === 0)
   if (items.length === 0)
   
   // Should use:
   import { validateStringField, isEmpty } from '@create-something/components/utils';
   if (isEmpty(items)) { ... }
   const result = validateStringField(name, 'name', { required: true });
   ```

4. **identity_api_fetches**: Direct fetch calls to IDENTITY_API that should use `identityClient`:
   ```typescript
   // Violation pattern:
   const response = await fetch(`${IDENTITY_API}/v1/...`, { ... });
   
   // Should use:
   import { identityClient } from '@create-something/components/api';
   const result = await identityClient.methodName({ ... });
   ```

Use the REPL to:
1. Search for each pattern using regex
2. Count occurrences by file
3. Store findings in results dictionary

Start by probing the context structure, then search for each violation type.

```repl
# First, understand the context structure
lines = context.split('\n')
print(f"Total lines: {len(lines)}")
print(f"First 20 lines:")
for i, line in enumerate(lines[:20]):
    print(f"{i}: {line[:100]}")
```
"""

    print("\nRunning RLM analysis...")
    print("=" * 60)
    
    result = await session.run(query)
    
    print("=" * 60)
    print(f"\nRLM Result:")
    print(f"  Success: {result.success}")
    print(f"  Iterations: {result.iterations}")
    print(f"  Sub-calls: {result.sub_calls}")
    print(f"  Cost: ${result.cost_usd:.4f}")
    
    if result.error:
        print(f"  Error: {result.error}")
    
    if result.answer:
        print(f"\n{'='*60}")
        print("ANSWER:")
        print("="*60)
        print(result.answer)
    
    # Print trajectory summary
    print(f"\n{'='*60}")
    print("TRAJECTORY:")
    print("="*60)
    for entry in result.trajectory:
        if entry["type"] == "execution":
            print(f"\n[Iteration {entry['iteration']}] Code executed:")
            print(f"  Success: {entry['success']}")
            if entry.get("output"):
                print(f"  Output preview: {entry['output'][:500]}...")
        elif entry["type"] in ("final", "final_var"):
            print(f"\n[Iteration {entry['iteration']}] Final answer provided")


if __name__ == "__main__":
    asyncio.run(main())
