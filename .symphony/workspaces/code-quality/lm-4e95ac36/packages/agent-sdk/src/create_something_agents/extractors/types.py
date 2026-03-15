"""
Pattern Extraction Types

Data structures for extracted patterns from HTML/CSS templates.
Designed for cataloging, searching, and remixing.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class PatternCategory(Enum):
    """Categories of extractable patterns."""

    HERO = "hero"
    NAVIGATION = "navigation"
    CARD = "card"
    FOOTER = "footer"
    HEADER = "header"
    SECTION = "section"
    FORM = "form"
    MODAL = "modal"
    SLIDER = "slider"
    GALLERY = "gallery"
    TESTIMONIAL = "testimonial"
    PRICING = "pricing"
    CTA = "cta"
    FEATURE = "feature"
    TEAM = "team"
    CONTACT = "contact"
    FAQ = "faq"
    BLOG = "blog"
    STATS = "stats"
    UNKNOWN = "unknown"


class InteractionType(Enum):
    """Types of interactions/animations."""

    HOVER = "hover"
    SCROLL = "scroll"
    CLICK = "click"
    LOAD = "load"
    PARALLAX = "parallax"
    TRANSITION = "transition"
    TRANSFORM = "transform"
    FADE = "fade"
    SLIDE = "slide"
    NONE = "none"


@dataclass
class CSSRule:
    """A single CSS rule with selector and properties."""

    selector: str
    properties: dict[str, str]
    media_query: str | None = None

    def to_css(self) -> str:
        """Convert back to CSS string."""
        props = "\n  ".join(f"{k}: {v};" for k, v in self.properties.items())
        rule = f"{self.selector} {{\n  {props}\n}}"
        if self.media_query:
            return f"@media {self.media_query} {{\n  {rule}\n}}"
        return rule


@dataclass
class ColorPalette:
    """Extracted color palette from a template."""

    primary: str | None = None
    secondary: str | None = None
    accent: str | None = None
    background: str | None = None
    text: str | None = None
    muted: str | None = None
    border: str | None = None
    all_colors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "primary": self.primary,
            "secondary": self.secondary,
            "accent": self.accent,
            "background": self.background,
            "text": self.text,
            "muted": self.muted,
            "border": self.border,
            "all_colors": self.all_colors,
        }


@dataclass
class Typography:
    """Extracted typography patterns."""

    font_families: list[str] = field(default_factory=list)
    heading_sizes: list[str] = field(default_factory=list)
    body_size: str | None = None
    line_heights: list[str] = field(default_factory=list)
    font_weights: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "font_families": self.font_families,
            "heading_sizes": self.heading_sizes,
            "body_size": self.body_size,
            "line_heights": self.line_heights,
            "font_weights": self.font_weights,
        }


@dataclass
class Spacing:
    """Extracted spacing patterns."""

    padding_values: list[str] = field(default_factory=list)
    margin_values: list[str] = field(default_factory=list)
    gap_values: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "padding_values": self.padding_values,
            "margin_values": self.margin_values,
            "gap_values": self.gap_values,
        }


@dataclass
class Interaction:
    """An interaction/animation pattern."""

    type: InteractionType
    trigger: str  # CSS selector or event
    css_rules: list[CSSRule] = field(default_factory=list)
    keyframes: str | None = None  # Raw @keyframes if applicable
    duration: str | None = None
    easing: str | None = None
    description: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "type": self.type.value,
            "trigger": self.trigger,
            "css_rules": [{"selector": r.selector, "properties": r.properties} for r in self.css_rules],
            "keyframes": self.keyframes,
            "duration": self.duration,
            "easing": self.easing,
            "description": self.description,
        }


@dataclass
class Component:
    """An extracted component pattern."""

    id: str  # Unique identifier
    category: PatternCategory
    name: str  # Human-readable name
    html: str  # The HTML structure
    css_classes: list[str]  # Classes used
    css_rules: list[CSSRule] = field(default_factory=list)
    interactions: list[Interaction] = field(default_factory=list)
    children: list[str] = field(default_factory=list)  # Child component IDs
    source_template: str | None = None  # Which template it came from
    description: str | None = None  # AI-generated description
    tags: list[str] = field(default_factory=list)  # Searchable tags

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "category": self.category.value,
            "name": self.name,
            "html": self.html,
            "css_classes": self.css_classes,
            "css_rules": [{"selector": r.selector, "properties": r.properties} for r in self.css_rules],
            "interactions": [i.to_dict() for i in self.interactions],
            "children": self.children,
            "source_template": self.source_template,
            "description": self.description,
            "tags": self.tags,
        }


@dataclass
class LayoutPattern:
    """A layout/grid pattern."""

    id: str
    name: str
    type: str  # "grid", "flex", "absolute", etc.
    columns: int | None = None
    rows: int | None = None
    css_rules: list[CSSRule] = field(default_factory=list)
    breakpoints: dict[str, dict[str, Any]] = field(default_factory=dict)
    description: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "columns": self.columns,
            "rows": self.rows,
            "css_rules": [{"selector": r.selector, "properties": r.properties} for r in self.css_rules],
            "breakpoints": self.breakpoints,
            "description": self.description,
        }


@dataclass
class PatternCatalog:
    """
    A catalog of patterns extracted from one or more templates.

    This is the main output of PatternExtractor and the input to PatternRemixer.
    """

    id: str  # Catalog identifier
    name: str  # Human-readable name
    source_templates: list[str] = field(default_factory=list)
    components: list[Component] = field(default_factory=list)
    layouts: list[LayoutPattern] = field(default_factory=list)
    interactions: list[Interaction] = field(default_factory=list)
    colors: ColorPalette | None = None
    typography: Typography | None = None
    spacing: Spacing | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def get_components_by_category(self, category: PatternCategory) -> list[Component]:
        """Get all components of a specific category."""
        return [c for c in self.components if c.category == category]

    def get_component_by_id(self, component_id: str) -> Component | None:
        """Get a component by its ID."""
        for c in self.components:
            if c.id == component_id:
                return c
        return None

    def search_components(self, query: str) -> list[Component]:
        """Search components by name, description, or tags."""
        query_lower = query.lower()
        results = []
        for c in self.components:
            if query_lower in c.name.lower():
                results.append(c)
            elif c.description and query_lower in c.description.lower():
                results.append(c)
            elif any(query_lower in tag.lower() for tag in c.tags):
                results.append(c)
        return results

    def to_dict(self) -> dict[str, Any]:
        """Convert entire catalog to dictionary for serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "source_templates": self.source_templates,
            "components": [c.to_dict() for c in self.components],
            "layouts": [l.to_dict() for l in self.layouts],
            "interactions": [i.to_dict() for i in self.interactions],
            "colors": self.colors.to_dict() if self.colors else None,
            "typography": self.typography.to_dict() if self.typography else None,
            "spacing": self.spacing.to_dict() if self.spacing else None,
            "metadata": self.metadata,
        }

    def summary(self) -> str:
        """Generate a human-readable summary."""
        lines = [
            f"Pattern Catalog: {self.name}",
            f"Sources: {len(self.source_templates)} templates",
            f"Components: {len(self.components)}",
        ]

        # Count by category
        category_counts: dict[str, int] = {}
        for c in self.components:
            cat = c.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1

        if category_counts:
            lines.append("  By category:")
            for cat, count in sorted(category_counts.items()):
                lines.append(f"    - {cat}: {count}")

        lines.append(f"Layouts: {len(self.layouts)}")
        lines.append(f"Interactions: {len(self.interactions)}")

        if self.colors and self.colors.all_colors:
            lines.append(f"Colors: {len(self.colors.all_colors)} unique")

        return "\n".join(lines)


@dataclass
class ExtractionResult:
    """Result of a pattern extraction operation."""

    success: bool
    catalog: PatternCatalog | None = None
    error: str | None = None
    warnings: list[str] = field(default_factory=list)
    extraction_time_ms: float = 0.0
    cost_usd: float = 0.0
    model_used: str | None = None
    provider_used: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "catalog": self.catalog.to_dict() if self.catalog else None,
            "error": self.error,
            "warnings": self.warnings,
            "extraction_time_ms": self.extraction_time_ms,
            "cost_usd": self.cost_usd,
            "model_used": self.model_used,
            "provider_used": self.provider_used,
        }
