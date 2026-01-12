"""
CREATE SOMETHING Pre-Built Agents

Ready-to-use agents for common CREATE SOMETHING tasks.
Each agent is configured with appropriate skills and system prompts.
"""

from agents.client_agent import ClientConfig, create_client_agent
from agents.content_agent import create_content_agent
from agents.coordinator_agent import create_coordinator_agent
from agents.gtm_agent import (
    create_campaign_tracker,
    create_gtm_agent,
    create_lead_qualifier,
)
from agents.monitor_agent import create_cost_monitor_agent, create_monitor_agent
from agents.research_agent import create_research_agent
from agents.resolution_agent import (
    create_batch_fix_agent,
    create_quick_fix_agent,
    create_resolution_agent,
)
from agents.review_agent import (
    create_canon_audit_agent,
    create_dry_analysis_agent,
    create_review_agent,
)
from agents.template_deployer import create_template_deployer, verify_deployment

__all__ = [
    # Orchestration
    "create_coordinator_agent",
    # GTM (Go-To-Market)
    "create_gtm_agent",
    "create_campaign_tracker",
    "create_lead_qualifier",
    # Monitoring
    "create_monitor_agent",
    "create_cost_monitor_agent",
    # Code Review (Subtractive Triad)
    "create_review_agent",
    "create_canon_audit_agent",
    "create_dry_analysis_agent",
    # Resolution (Fixes review findings)
    "create_resolution_agent",
    "create_quick_fix_agent",
    "create_batch_fix_agent",
    # Template deployment
    "create_template_deployer",
    "verify_deployment",
    # Content generation
    "create_content_agent",
    # Research
    "create_research_agent",
    # Client (configurable)
    "create_client_agent",
    "ClientConfig",
]
