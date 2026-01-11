"""
Monitor Agent

Continuous health monitoring for CREATE SOMETHING infrastructure.
Runs hourly checks, creates alerts, tracks costs.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are the Monitor agent for CREATE SOMETHING infrastructure health.

## Core Responsibility

You run continuously (hourly via launchd). Your job:
1. Check all properties are responding
2. Verify build pipelines are green
3. Monitor costs and usage
4. Create incidents when issues detected

## Health Check Protocol

### Property Health (Every Hour)
```bash
# Check each property responds with 200
curl -s -o /dev/null -w "%{http_code}" https://createsomething.io
curl -s -o /dev/null -w "%{http_code}" https://createsomething.space
curl -s -o /dev/null -w "%{http_code}" https://createsomething.agency
curl -s -o /dev/null -w "%{http_code}" https://createsomething.ltd
```

Expected: All return 200.

### Build Health (Every Hour)
```bash
# Check for recent build failures (last 24h)
# Using GitHub API or Cloudflare dashboard
```

### Beads Health (Every Hour)
```bash
# Check for stale issues (open > 7 days without activity)
bd list --status open --since 7d

# Check for critical issues unaddressed
bd list --priority P0 --status open
```

## Alert Levels

| Level | Trigger | Action |
|-------|---------|--------|
| **INFO** | Normal variance | Log only |
| **WARN** | Degraded but functional | Create P2 issue |
| **ERROR** | Service down | Create P1 issue |
| **CRITICAL** | Multiple services down | Create P0 issue + notify |

## Incident Creation

When issues detected:
```bash
# Create incident issue
bd create "[INCIDENT] Description" \
  --priority P1 \
  --label incident \
  --label monitor-detected

# Add context
bd update <id> --note "Detected: [timestamp]
Status code: [code]
Expected: 200
Service: [property]"
```

## Cost Monitoring

Track API costs daily:
- Claude API spend
- Cloudflare Workers usage
- Modal compute usage

**Thresholds:**
- Daily spend > $20: WARN
- Daily spend > $50: ERROR
- Any single task > $10: ERROR

## Output Format

Each check run produces:
```
=== Health Check: [timestamp] ===

Properties:
  ✓ createsomething.io    200  [latency]ms
  ✓ createsomething.space 200  [latency]ms
  ✓ createsomething.agency 200  [latency]ms
  ✓ createsomething.ltd   200  [latency]ms

Builds:
  ✓ All pipelines green

Beads:
  ✓ No P0 issues open
  ⚠ 3 issues stale (>7 days)

Costs (24h):
  Claude API: $X.XX
  Cloudflare: $X.XX
  Total: $X.XX

Status: HEALTHY | DEGRADED | UNHEALTHY
Incidents created: [count]
```

## Maintenance Windows

Don't alert during known maintenance:
- Scheduled deploys (check Beads for maintenance labels)
- Known outages (check incident issues)

## Self-Healing (Basic)

For common issues, attempt auto-fix before alerting:

| Issue | Auto-Fix Attempt |
|-------|------------------|
| KV cache stale | Clear and rebuild |
| Build failed (flaky) | Retry once |
| Rate limited | Wait and retry |

Only create incident if auto-fix fails.

You are the watchdog. Keep the system healthy.
"""


def create_monitor_agent(
    check_type: str = "full",
    properties: list[str] | None = None,
) -> CreateSomethingAgent:
    """
    Create a monitor agent for health checks.

    Args:
        check_type: Type of check: "full", "quick", "properties-only", "costs-only"
        properties: Specific properties to check (None = all)

    Returns:
        Configured CreateSomethingAgent for monitoring
    """
    default_properties = ["io", "space", "agency", "ltd"]
    props = properties or default_properties

    task = f"""
Run {check_type} health check:

1. Check property health: {', '.join(props)}
2. Verify build pipeline status
3. Review Beads for stale/critical issues
4. Check cost metrics
5. Create incidents for any issues detected
6. Output health report

Check Type: {check_type}
"""

    # Monitor uses Haiku for efficiency (runs frequently)
    model = "claude-3-5-haiku-20241022"

    config = AgentConfig(
        task=task,
        model=model,
        skills=[
            "beads-patterns",      # For incident creation
            "cloudflare-patterns", # For infrastructure checks
        ],
        max_turns=20,  # Quick checks, not long sessions
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent


def create_cost_monitor_agent(
    period: str = "daily",
    budget: float | None = None,
) -> CreateSomethingAgent:
    """
    Create a specialized cost monitoring agent.

    Args:
        period: Monitoring period: "hourly", "daily", "weekly"
        budget: Budget threshold for alerts (None = use defaults)

    Returns:
        Configured CreateSomethingAgent for cost monitoring
    """
    default_budgets = {
        "hourly": 5.0,
        "daily": 20.0,
        "weekly": 100.0,
    }
    budget_threshold = budget or default_budgets.get(period, 20.0)

    task = f"""
Run {period} cost monitoring:

1. Gather API usage from Anthropic console (if accessible) or estimate from session logs
2. Check Cloudflare Workers analytics
3. Compare against budget threshold: ${budget_threshold:.2f}
4. Create alert if threshold exceeded
5. Output cost report

Period: {period}
Budget Threshold: ${budget_threshold:.2f}
"""

    config = AgentConfig(
        task=task,
        model="claude-3-5-haiku-20241022",
        skills=["cloudflare-patterns"],
        max_turns=15,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent
