"""
Template Deployer Agent

Deploys CREATE SOMETHING vertical templates to Cloudflare Pages.
Handles build, R2 upload, tenant config, and verification.
"""

from __future__ import annotations

import httpx

from create_something_agents import (
    AgentConfig,
    CreateSomethingAgent,
    RalphConfig,
    RalphStopHook,
)


SYSTEM_PROMPT = """You are a template deployment agent for CREATE SOMETHING.

Your task is to deploy vertical templates to Cloudflare Pages with proper:
1. Build configuration (SvelteKit static adapter)
2. R2 asset upload (correct paths)
3. Tenant configuration injection
4. DNS and route setup

## Deployment Steps

1. **Build the template**
   ```bash
   cd packages/verticals/{template}/
   pnpm install
   pnpm build
   ```

2. **Upload to R2**
   ```bash
   cd build/
   find . -type f -print0 | xargs -0 -I{} sh -c \
     'wrangler r2 object put "templates-site-assets/{template_id}/{version}/${1#./}" --file="$1" --remote' _ {}
   ```

3. **Update tenant config**
   - Update D1 templates_platform database
   - Clear KV cache for tenant

4. **Verify deployment**
   - Check subdomain responds
   - Verify config injection
   - Test asset loading

Use the skills loaded for exact patterns. Verify each step before proceeding.
Output <promise>DEPLOY_COMPLETE</promise> when the site is live and responding.
"""


def create_template_deployer(
    task: str,
    subdomain: str | None = None,
    template_id: str = "tpl_professional_services",
    version: str = "latest",
) -> CreateSomethingAgent:
    """
    Create a template deployer agent.

    Args:
        task: Deployment task description
        subdomain: Target subdomain (e.g., "clientname" for clientname.createsomething.space)
        template_id: Template ID (e.g., "tpl_professional_services")
        version: Version to deploy ("latest" or semver like "1.0.0")

    Returns:
        Configured CreateSomethingAgent for deployment
    """
    # Build context for the task
    context = f"""
Template: {template_id}
Version: {version}
"""
    if subdomain:
        context += f"Target: {subdomain}.createsomething.space\n"

    full_task = f"{task}\n\n{context}"

    config = AgentConfig(
        task=full_task,
        model="claude-sonnet-4-20250514",
        skills=[
            "sveltekit-conventions",
            "cloudflare-patterns",
            "template-deployment-patterns",
        ],
        stop_hooks=[
            RalphStopHook(
                RalphConfig(
                    prompt=full_task,
                    max_iterations=20,
                    completion_promise="DEPLOY_COMPLETE",
                )
            )
        ],
        max_turns=50,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent


async def verify_deployment(subdomain: str) -> dict[str, bool | str]:
    """
    Verify a template deployment succeeded.

    Args:
        subdomain: Subdomain to check (e.g., "clientname")

    Returns:
        Dict with verification results
    """
    url = f"https://{subdomain}.createsomething.space"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            html_ok = response.status_code == 200

            # Check for config injection
            config_ok = "window.__SITE_CONFIG__" in response.text

            # Check for assets
            app_ok = "/_app/" in response.text

            return {
                "success": html_ok and config_ok,
                "status_code": response.status_code,
                "html_ok": html_ok,
                "config_injected": config_ok,
                "assets_linked": app_ok,
                "url": url,
            }
        except httpx.RequestError as e:
            return {
                "success": False,
                "error": str(e),
                "url": url,
            }
