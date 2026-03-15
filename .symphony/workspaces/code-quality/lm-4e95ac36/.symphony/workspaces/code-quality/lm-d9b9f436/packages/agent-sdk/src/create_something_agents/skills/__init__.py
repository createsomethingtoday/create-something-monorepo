"""
CREATE SOMETHING Skills System

Progressive context disclosure via markdown files.
Skills load from .claude/rules/ or .claude/skills/ directories.
"""

from create_something_agents.skills.loader import load_skill, discover_skills

__all__ = [
    "load_skill",
    "discover_skills",
]
