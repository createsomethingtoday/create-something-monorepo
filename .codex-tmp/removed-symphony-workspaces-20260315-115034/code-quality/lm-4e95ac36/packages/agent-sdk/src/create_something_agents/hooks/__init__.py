"""
CREATE SOMETHING Agent Hooks

Stop hooks for controlling agent iteration (Ralph-style loops).
"""

from create_something_agents.hooks.stop import RalphConfig, RalphStopHook, StopDecision, StopHook

__all__ = [
    "StopHook",
    "StopDecision",
    "RalphStopHook",
    "RalphConfig",
]
