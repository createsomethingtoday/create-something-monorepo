"""
Modal Deployment for CREATE SOMETHING Scheduled Agents

Deploy: modal deploy modal_agents.py
Test locally: modal run modal_agents.py

Scheduled Agents (5 cron jobs - Modal free tier limit):
- Monitor: Hourly health checks
- Coordinator: Daily orchestration (8am UTC)
- Review: Monday Subtractive Triad audit (10am UTC)
- Resolution: Mon/Tue/Fri fix findings (11am UTC)
- Content: Tue-Fri content drafts (9am UTC)

On-Demand Agents (run via launchd locally or `modal run`):
- Canon Audit: CSS compliance (daily via launchd)
- DRY Check: Duplication analysis (Tue/Fri via launchd)
"""

import modal
from datetime import datetime
import json

# Image with dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "anthropic>=0.40.0",
    "httpx>=0.27.0",
)

# Modal app for scheduled agents
app = modal.App(
    "cs-agents",
    image=image,
    secrets=[
        modal.Secret.from_name("anthropic-api-key"),  # ANTHROPIC_API_KEY
    ],
)

# Volume to persist logs and state
logs_volume = modal.Volume.from_name("cs-agent-logs", create_if_missing=True)

# Model costs for tracking
MODEL_COSTS = {
    "claude-3-5-haiku-20241022": (0.80, 4.0),  # (input, output) per million
    "claude-sonnet-4-20250514": (3.0, 15.0),
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD based on token usage."""
    costs = MODEL_COSTS.get(model, (3.0, 15.0))
    input_cost = (input_tokens / 1_000_000) * costs[0]
    output_cost = (output_tokens / 1_000_000) * costs[1]
    return input_cost + output_cost


def run_agent(
    model: str,
    system_prompt: str,
    task: str,
    max_tokens: int = 4096,
) -> dict:
    """Run a Claude agent and return results."""
    import anthropic
    import os

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"success": False, "error": "ANTHROPIC_API_KEY not configured"}

    client = anthropic.Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": task}],
        )

        output = ""
        for block in response.content:
            if hasattr(block, "text"):
                output += block.text

        cost = calculate_cost(
            model,
            response.usage.input_tokens,
            response.usage.output_tokens,
        )

        return {
            "success": True,
            "output": output,
            "model": model,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cost_usd": round(cost, 6),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def log_result(agent_name: str, result: dict):
    """Log agent result to volume."""
    import os

    timestamp = datetime.utcnow().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "agent": agent_name,
        **result,
    }

    # Print for Modal logs
    print(f"[{timestamp}] {agent_name}: success={result.get('success')} cost=${result.get('cost_usd', 0):.4f}")
    if not result.get("success"):
        print(f"  Error: {result.get('error')}")

    # Write to volume (create directory if needed)
    log_dir = f"/logs/{agent_name}"
    os.makedirs(log_dir, exist_ok=True)
    log_path = f"{log_dir}/{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


# ============================================================================
# MONITOR AGENT - Hourly health checks with deduplication
# ============================================================================

PROPERTIES = [
    "https://createsomething.io",
    "https://createsomething.space",
    "https://createsomething.agency",
    "https://createsomething.ltd",
]

STATE_FILE = "/logs/monitor/state.json"


def load_monitor_state() -> dict:
    """Load previous monitor state from volume."""
    import os
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"last_status": {}, "issues_reported": {}}


def save_monitor_state(state: dict):
    """Save monitor state to volume."""
    import os
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)
    # Commit volume to ensure persistence across container instances
    logs_volume.commit()


def check_property(url: str) -> tuple[bool, int, str]:
    """Check if a property is healthy. Returns (healthy, status_code, error)."""
    import httpx

    try:
        response = httpx.get(url, timeout=10, follow_redirects=True)
        return response.status_code == 200, response.status_code, ""
    except Exception as e:
        return False, 0, str(e)


@app.function(
    schedule=modal.Cron("0 * * * *"),  # Every hour at :00
    volumes={"/logs": logs_volume},
    timeout=120,
)
def monitor_agent():
    """Hourly infrastructure health check with state-aware deduplication."""
    import os

    os.makedirs("/logs/monitor", exist_ok=True)
    timestamp = datetime.utcnow().isoformat()

    # Load previous state
    state = load_monitor_state()
    last_status = state.get("last_status", {})
    issues_reported = state.get("issues_reported", {})

    # Check all properties
    current_status = {}
    changes = []
    issues = []

    for url in PROPERTIES:
        healthy, status_code, error = check_property(url)
        domain = url.replace("https://", "")
        current_status[domain] = {"healthy": healthy, "status_code": status_code, "error": error}

        was_healthy = last_status.get(domain, {}).get("healthy", True)

        if healthy and not was_healthy:
            # Recovered
            changes.append(f"✅ {domain}: RECOVERED (was down)")
            issues_reported.pop(domain, None)
        elif not healthy and was_healthy:
            # New issue
            changes.append(f"🔴 {domain}: DOWN (status={status_code}, error={error})")
            issues_reported[domain] = timestamp
            issues.append(domain)
        elif not healthy:
            # Still down (don't re-report, just note duration)
            first_reported = issues_reported.get(domain, timestamp)
            issues.append(f"{domain} (down since {first_reported})")

    # Save new state
    state["last_status"] = current_status
    state["issues_reported"] = issues_reported
    save_monitor_state(state)

    # Build result
    all_healthy = all(s["healthy"] for s in current_status.values())
    result = {
        "success": True,
        "timestamp": timestamp,
        "all_healthy": all_healthy,
        "status": current_status,
        "changes": changes,
        "ongoing_issues": issues if not all_healthy else [],
        "cost_usd": 0,  # No API call needed
    }

    # Log
    log_entry = {"timestamp": timestamp, "agent": "monitor", **result}
    log_path = f"/logs/monitor/{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

    # Print summary
    status_line = "✅ All healthy" if all_healthy else f"🔴 {len(issues)} issue(s)"
    print(f"[{timestamp}] monitor: {status_line}")
    for change in changes:
        print(f"  {change}")

    return result


# ============================================================================
# CANON AUDIT AGENT - On-demand CSS compliance (no cron - run locally or manually)
# ============================================================================

CANON_AUDIT_SYSTEM = """You are a CSS Canon compliance auditor for CREATE SOMETHING.

Check for violations of the Canon design system:
- Hardcoded colors instead of --color-* tokens
- Arbitrary text sizes instead of --text-* tokens
- Non-standard spacing instead of --space-* tokens
- Hardcoded transitions instead of --duration-* tokens

Output format:
CANON AUDIT: [timestamp]
Files checked: [count]
Violations found: [count]
- [file]: [violation type] - [details]
...
"""

@app.function(
    volumes={"/logs": logs_volume},
    timeout=300,
)
def canon_audit_agent():
    """CSS Canon compliance check (run via Modal CLI or webhook)."""
    result = run_agent(
        model="claude-3-5-haiku-20241022",
        system_prompt=CANON_AUDIT_SYSTEM,
        task="""Analyze the CREATE SOMETHING codebase for Canon CSS violations.

Focus on:
1. packages/components/src/lib/ - shared components
2. packages/*/src/routes/ - page components

Report any hardcoded colors, sizes, or timing values that should use Canon tokens.""",
        max_tokens=2048,
    )
    log_result("canon-audit", result)
    return result


# ============================================================================
# DRY CHECK AGENT - On-demand duplication analysis (no cron - run locally or manually)
# ============================================================================

DRY_CHECK_SYSTEM = """You are a DRY (Don't Repeat Yourself) analyzer for CREATE SOMETHING.

Look for code duplication patterns:
- Literal duplication: 3+ identical lines
- Structural duplication: Same logic with different variable names
- Type duplication: Same interface defined in multiple places
- Config duplication: Same settings repeated across files

Output format:
DRY CHECK: [timestamp]
Areas analyzed: [list]
Duplications found: [count]

Priority 1 (5+ files affected):
- [description]

Priority 2 (2-4 files affected):
- [description]

Recommendations:
- [actionable suggestions]
"""

@app.function(
    volumes={"/logs": logs_volume},
    timeout=600,
)
def dry_check_agent():
    """Code duplication analysis (run via Modal CLI or webhook)."""
    result = run_agent(
        model="claude-sonnet-4-20250514",
        system_prompt=DRY_CHECK_SYSTEM,
        task="""Analyze the CREATE SOMETHING codebase for DRY violations.

Focus on high-value areas:
1. packages/components/src/lib/ - shared utilities
2. packages/*/src/lib/ - package-specific code

Look for patterns that could be consolidated into shared utilities.""",
        max_tokens=4096,
    )
    log_result("dry-check", result)
    return result


# ============================================================================
# REVIEW AGENT - Monday Subtractive Triad audit
# ============================================================================

REVIEW_SYSTEM = """You are the Subtractive Triad Review Agent for CREATE SOMETHING.

Review code for alignment with the Subtractive Triad:
- DRY (Implementation): Eliminate duplication
- Rams (Artifact): Eliminate excess - only what earns existence remains
- Heidegger (System): Eliminate disconnection - every part serves the whole

Output format:
SUBTRACTIVE TRIAD REVIEW: [timestamp]

DRY Analysis:
- [findings about duplication]

Rams Analysis (Does it earn existence?):
- [findings about dead code, over-engineering]

Heidegger Analysis (Does it serve the whole?):
- [findings about disconnected code, pattern drift]

Priority Issues:
1. [P1 issues]
2. [P2 issues]

Recommendations:
- [actionable next steps]
"""

@app.function(
    schedule=modal.Cron("0 10 * * 1"),  # Monday at 10am UTC
    volumes={"/logs": logs_volume},
    timeout=900,
)
def review_agent():
    """Monday Subtractive Triad code review."""
    result = run_agent(
        model="claude-sonnet-4-20250514",
        system_prompt=REVIEW_SYSTEM,
        task="""Perform a Subtractive Triad review of the CREATE SOMETHING codebase.

Review the most frequently changed areas:
1. packages/*/src/routes/ - route handlers
2. packages/*/src/lib/components/ - UI components
3. packages/*/workers/ - Cloudflare workers

Create findings for DRY violations, Rams violations (excess), and Heidegger violations (disconnection).""",
        max_tokens=8192,
    )
    log_result("review", result)
    return result


# ============================================================================
# RESOLUTION AGENT - Mon/Tue/Fri fix findings
# ============================================================================

RESOLUTION_SYSTEM = """You are the Resolution Agent for CREATE SOMETHING.

Your job is to propose fixes for issues found by review agents.

For each issue:
1. Assess complexity (simple/medium/complex)
2. Propose a concrete fix
3. List files that would change
4. Note any risks or dependencies

Output format:
RESOLUTION PROPOSALS: [timestamp]

Issue 1: [title]
Complexity: [simple|medium|complex]
Proposed Fix:
  [description of fix]
Files Affected:
  - [file1]
  - [file2]
Risks: [any concerns]

...

Summary:
- Simple fixes ready to apply: [count]
- Medium fixes needing review: [count]
- Complex fixes needing discussion: [count]
"""

@app.function(
    schedule=modal.Cron("0 11 * * 1,2,5"),  # Mon/Tue/Fri at 11am UTC
    volumes={"/logs": logs_volume},
    timeout=900,
)
def resolution_agent():
    """Mon/Tue/Fri propose fixes for review findings."""
    result = run_agent(
        model="claude-sonnet-4-20250514",
        system_prompt=RESOLUTION_SYSTEM,
        task="""Review recent findings from the review and audit agents.

For each finding, propose a concrete resolution:
1. Read the finding details
2. Assess complexity
3. Propose a specific fix with file changes
4. Note any risks

Focus on actionable, specific proposals that could be implemented.""",
        max_tokens=8192,
    )
    log_result("resolution", result)
    return result


# ============================================================================
# COORDINATOR AGENT - Daily orchestration
# ============================================================================

COORDINATOR_SYSTEM = """You are the Coordinator Agent for CREATE SOMETHING.

Your daily responsibilities:
1. Review recent agent outputs
2. Prioritize work for the day
3. Flag any urgent issues
4. Suggest focus areas

Output format:
DAILY COORDINATION: [timestamp]

Agent Status:
- Monitor: [last run status]
- Canon Audit: [last run status]
- Review: [last run status]
- Resolution: [last run status]

Today's Priorities:
1. [highest priority item]
2. [next priority]
...

Urgent Issues: [any P0/P1 items]

Recommended Focus: [what to work on today]
"""

@app.function(
    schedule=modal.Cron("0 8 * * *"),  # Daily at 8am UTC
    volumes={"/logs": logs_volume},
    timeout=300,
)
def coordinator_agent():
    """Daily work coordination."""
    result = run_agent(
        model="claude-sonnet-4-20250514",
        system_prompt=COORDINATOR_SYSTEM,
        task="""Review the current state of CREATE SOMETHING and prioritize today's work.

Consider:
1. Any urgent issues from monitoring
2. Outstanding review findings
3. Resolution proposals ready for implementation
4. Scheduled deadlines or commitments

Provide clear priorities for the day.""",
        max_tokens=2048,
    )
    log_result("coordinator", result)
    return result


# ============================================================================
# CONTENT AGENT - Tue-Fri content drafts
# ============================================================================

CONTENT_SYSTEM = """You are the Content Agent for CREATE SOMETHING.

Generate LinkedIn post drafts based on recent work and research.

Guidelines:
- Lead with outcome or insight, not philosophy
- Include specific metrics where possible
- Keep posts 1500+ characters for reach
- Put links in comments, not main post
- Max 5 hashtags

Output format:
CONTENT DRAFT: [timestamp]

Post Title: [title]
Type: [research finding | case study | methodology | anti-pattern]

---
[Full post content here]
---

Comment (for link):
[CTA and hashtags]

---
Voice Check:
- [x] Claims backed by methodology
- [x] Self-contained (no thread references)
- [x] No marketing jargon
"""

@app.function(
    schedule=modal.Cron("0 9 * * 2-5"),  # Tue-Fri at 9am UTC
    volumes={"/logs": logs_volume},
    timeout=300,
)
def content_agent():
    """Tue-Fri content draft generation."""
    result = run_agent(
        model="claude-sonnet-4-20250514",
        system_prompt=CONTENT_SYSTEM,
        task="""Generate a LinkedIn post draft for CREATE SOMETHING.

Topics to consider:
1. Recent experiments or findings
2. Methodology insights (Subtractive Triad, agent orchestration)
3. Case study highlights
4. Anti-patterns observed

Create a post that demonstrates expertise through specific outcomes, not claims.""",
        max_tokens=2048,
    )
    log_result("content", result)
    return result


# ============================================================================
# WEB ENDPOINTS - Manual triggers and status
# ============================================================================

@app.function()
@modal.fastapi_endpoint(method="GET")
def health() -> dict:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "cs-agents",
        "agents": [
            "monitor",
            "canon-audit",
            "dry-check",
            "review",
            "resolution",
            "coordinator",
            "content",
        ],
    }


@app.function(volumes={"/logs": logs_volume})
@modal.fastapi_endpoint(method="GET")
def status() -> dict:
    """Public status page data - current health of all CREATE SOMETHING properties."""
    import os
    from datetime import timedelta

    # Load current state
    state = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            state = json.load(f)

    last_status = state.get("last_status", {})
    issues_reported = state.get("issues_reported", {})

    # Determine overall status
    all_healthy = all(s.get("healthy", True) for s in last_status.values()) if last_status else True

    # Get recent incidents from logs (last 7 days)
    incidents = []
    for i in range(7):
        date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        log_file = f"/logs/monitor/{date}.jsonl"
        if os.path.exists(log_file):
            with open(log_file) as f:
                for line in f:
                    entry = json.loads(line)
                    if entry.get("changes"):
                        for change in entry["changes"]:
                            incidents.append({
                                "timestamp": entry["timestamp"],
                                "message": change,
                            })

    # Build response
    properties = []
    for domain in ["createsomething.io", "createsomething.space", "createsomething.agency", "createsomething.ltd"]:
        prop_status = last_status.get(domain, {})
        properties.append({
            "domain": domain,
            "healthy": prop_status.get("healthy", True),
            "status_code": prop_status.get("status_code", 0),
            "down_since": issues_reported.get(domain),
        })

    return {
        "status": "operational" if all_healthy else "degraded",
        "all_healthy": all_healthy,
        "properties": properties,
        "incidents": sorted(incidents, key=lambda x: x["timestamp"], reverse=True)[:20],
        "last_check": state.get("last_status", {}).get("createsomething.io", {}).get("checked_at")
                      if last_status else None,
        "updated_at": datetime.utcnow().isoformat(),
    }


@app.function(volumes={"/logs": logs_volume})
@modal.fastapi_endpoint(method="GET")
def logs(agent: str = "all", days: int = 1) -> dict:
    """Get recent agent logs."""
    import os
    from datetime import datetime, timedelta

    results = []
    agents = [agent] if agent != "all" else [
        "monitor", "canon-audit", "dry-check",
        "review", "resolution", "coordinator", "content"
    ]

    for agent_name in agents:
        agent_dir = f"/logs/{agent_name}"
        if not os.path.exists(agent_dir):
            continue

        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            log_file = f"{agent_dir}/{date}.jsonl"
            if os.path.exists(log_file):
                with open(log_file) as f:
                    for line in f:
                        results.append(json.loads(line))

    return {
        "logs": sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True),
        "count": len(results),
    }


# ============================================================================
# TRIGGER ENDPOINTS (for testing and manual runs)
# ============================================================================

@app.function(volumes={"/logs": logs_volume})
@modal.fastapi_endpoint(method="POST")
def trigger(agent: str = "monitor") -> dict:
    """Trigger an agent run manually. POST /trigger?agent=monitor"""
    agents_map = {
        "monitor": lambda: run_monitor_check(),
    }
    if agent not in agents_map:
        return {"error": f"Unknown agent: {agent}", "available": list(agents_map.keys())}

    return agents_map[agent]()


def run_monitor_check() -> dict:
    """Run monitor check directly (for trigger endpoint)."""
    import os
    import httpx

    os.makedirs("/logs/monitor", exist_ok=True)
    timestamp = datetime.utcnow().isoformat()

    PROPERTIES = [
        "https://createsomething.io",
        "https://createsomething.space",
        "https://createsomething.agency",
        "https://createsomething.ltd",
    ]

    state = load_monitor_state()
    results = {}
    changes = []

    for url in PROPERTIES:
        domain = url.replace("https://", "")
        try:
            response = httpx.get(url, timeout=10, follow_redirects=True)
            healthy = response.status_code == 200
            status_code = response.status_code
            error = ""
        except Exception as e:
            healthy = False
            status_code = 0
            error = str(e)

        results[domain] = {
            "healthy": healthy,
            "status_code": status_code,
            "error": error,
            "checked_at": timestamp,
        }

        prev_status = state["last_status"].get(domain, {})
        was_healthy = prev_status.get("healthy", True)

        if healthy and not was_healthy:
            changes.append(f"✅ {domain}: RECOVERED")
            if domain in state["issues_reported"]:
                del state["issues_reported"][domain]
        elif not healthy and was_healthy:
            changes.append(f"🔴 {domain}: DOWN (HTTP {status_code})")
            state["issues_reported"][domain] = timestamp

    state["last_status"] = results
    state["last_check"] = timestamp
    save_monitor_state(state)

    all_healthy = all(r["healthy"] for r in results.values())
    log_entry = {
        "timestamp": timestamp,
        "agent": "monitor",
        "success": True,
        "all_healthy": all_healthy,
        "changes": changes,
        "cost_usd": 0,
    }

    log_path = f"/logs/monitor/{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {
        "success": True,
        "all_healthy": all_healthy,
        "changes": changes,
        "timestamp": timestamp,
    }


@app.function(volumes={"/logs": logs_volume})
def simulate_outage(domain: str = "createsomething.space"):
    """Simulate an outage for testing alerting."""
    import os

    os.makedirs("/logs/monitor", exist_ok=True)
    timestamp = datetime.utcnow().isoformat()

    # Load current state
    state = load_monitor_state()

    # Mark the domain as down
    state["last_status"][domain] = {
        "healthy": False,
        "status_code": 503,
        "error": "Simulated outage for testing",
    }
    state["issues_reported"][domain] = timestamp

    save_monitor_state(state)

    # Log the simulated outage
    log_entry = {
        "timestamp": timestamp,
        "agent": "monitor",
        "success": True,
        "all_healthy": False,
        "status": state["last_status"],
        "changes": [f"🔴 {domain}: DOWN (simulated outage)"],
        "ongoing_issues": [domain],
        "cost_usd": 0,
        "simulated": True,
    }

    log_path = f"/logs/monitor/{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

    print(f"✓ Simulated outage for {domain}")
    return {"simulated": True, "domain": domain, "timestamp": timestamp}


@app.function(volumes={"/logs": logs_volume})
def clear_outage():
    """Clear simulated outage - run real health check."""
    result = monitor_agent.local()
    print("✓ Cleared simulated outage, ran real health check")
    return result


@app.local_entrypoint()
def main():
    """Test agents locally: modal run modal_agents.py"""
    print("Testing Monitor Agent...")
    result = monitor_agent.remote()
    print(f"  Success: {result.get('success')}")
    print(f"  Cost: ${result.get('cost_usd', 0):.4f}")
    if result.get("output"):
        print(f"  Output preview: {result['output'][:200]}...")
