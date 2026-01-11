"""
Pattern Extractors

Extract reusable patterns from HTML/CSS templates for remixing.
Philosophy: Extract patterns from templates, not impose new ones.

Primary use: Gemini Flash for cost-effective batch extraction (~$0.001/template)
"""

from .types import (
    PatternCategory,
    InteractionType,
    CSSRule,
    ColorPalette,
    Typography,
    Spacing,
    Interaction,
    Component,
    LayoutPattern,
    PatternCatalog,
    ExtractionResult,
)
from .pattern_extractor import PatternExtractor, extract_patterns
from .pattern_library import (
    PatternLibrary,
    PatternSignature,
    CanonicalPattern,
    get_pattern_library,
)
from .pattern_discovery import (
    PatternDiscovery,
    DiscoveredPattern,
    PatternLearningAgent,
)

__all__ = [
    # Types
    "PatternCategory",
    "InteractionType",
    "CSSRule",
    "ColorPalette",
    "Typography",
    "Spacing",
    "Interaction",
    "Component",
    "LayoutPattern",
    "PatternCatalog",
    "ExtractionResult",
    # Extractor
    "PatternExtractor",
    "extract_patterns",
    # Library
    "PatternLibrary",
    "PatternSignature",
    "CanonicalPattern",
    "get_pattern_library",
    # Discovery
    "PatternDiscovery",
    "DiscoveredPattern",
    "PatternLearningAgent",
]
