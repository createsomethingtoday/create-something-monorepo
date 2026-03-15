"""
Pattern Library

A curated catalog of canonical UI patterns with identifying signatures.
Used by the classification agent to match extracted components against known patterns.

Philosophy: Extract first (cheap), classify against library (reliable).
"""

from dataclasses import dataclass, field
from typing import Callable

from .types import PatternCategory, InteractionType


@dataclass
class PatternSignature:
    """Identifying characteristics of a pattern."""

    # Selector patterns that suggest this pattern (regex-friendly)
    selector_hints: list[str] = field(default_factory=list)

    # CSS properties that are characteristic of this pattern
    css_property_hints: dict[str, list[str]] = field(default_factory=dict)

    # HTML elements commonly used
    element_hints: list[str] = field(default_factory=list)

    # Class name patterns (substrings)
    class_hints: list[str] = field(default_factory=list)

    # Structural hints (e.g., "contains img and h3")
    structure_hints: list[str] = field(default_factory=list)

    # Keywords in content that suggest this pattern
    content_hints: list[str] = field(default_factory=list)


@dataclass
class CanonicalPattern:
    """A known pattern in the library."""

    id: str
    name: str
    category: PatternCategory
    description: str
    signature: PatternSignature
    tags: list[str] = field(default_factory=list)
    examples: list[str] = field(default_factory=list)  # Example HTML snippets
    confidence_threshold: float = 0.30  # Minimum score to match (lower for limited signals)


class PatternLibrary:
    """
    Curated library of canonical UI patterns.

    The library serves as ground truth for pattern classification.
    When an agent extracts raw components, they're matched against
    this library for consistent categorization.
    """

    def __init__(self) -> None:
        self._patterns: dict[str, CanonicalPattern] = {}
        self._load_default_patterns()

    def _load_default_patterns(self) -> None:
        """Load the default pattern library."""
        default_patterns = [
            # Navigation patterns
            CanonicalPattern(
                id="nav-primary",
                name="Primary Navigation",
                category=PatternCategory.NAVIGATION,
                description="Main site navigation, typically in header",
                signature=PatternSignature(
                    selector_hints=[r"\.w-nav", r"nav", r"\.navbar", r"\.header-nav"],
                    class_hints=["nav", "navbar", "navigation", "menu", "header"],
                    element_hints=["nav", "header"],
                    css_property_hints={
                        "display": ["flex", "grid"],
                        "position": ["fixed", "sticky", "relative"],
                    },
                    structure_hints=["contains links", "contains logo"],
                ),
                tags=["navigation", "header", "menu"],
            ),
            CanonicalPattern(
                id="nav-mobile",
                name="Mobile Navigation",
                category=PatternCategory.NAVIGATION,
                description="Mobile/hamburger menu navigation",
                signature=PatternSignature(
                    selector_hints=[r"\.w-nav-menu", r"\.mobile-menu", r"\.hamburger"],
                    class_hints=["mobile", "hamburger", "burger", "menu-toggle"],
                    css_property_hints={
                        "display": ["none"],  # Hidden by default on desktop
                    },
                ),
                tags=["navigation", "mobile", "hamburger"],
            ),
            # Hero patterns
            CanonicalPattern(
                id="hero-standard",
                name="Hero Section",
                category=PatternCategory.HERO,
                description="Large introductory section with headline and CTA",
                signature=PatternSignature(
                    selector_hints=[r"\.hero", r"\.banner", r"\.jumbotron"],
                    class_hints=["hero", "banner", "intro", "splash", "jumbotron"],
                    element_hints=["section", "div"],
                    css_property_hints={
                        "min-height": ["100vh", "80vh", "90vh"],
                        "display": ["flex", "grid"],
                    },
                    structure_hints=["contains h1", "contains button or link"],
                ),
                tags=["hero", "header", "intro", "landing"],
            ),
            CanonicalPattern(
                id="hero-split",
                name="Split Hero",
                category=PatternCategory.HERO,
                description="Hero with content on one side, image on other",
                signature=PatternSignature(
                    class_hints=["hero", "split"],
                    css_property_hints={
                        "display": ["grid", "flex"],
                        "grid-template-columns": ["1fr 1fr", "repeat(2"],
                    },
                    structure_hints=["contains image", "two column layout"],
                ),
                tags=["hero", "split", "two-column"],
            ),
            # Card patterns
            CanonicalPattern(
                id="card-basic",
                name="Basic Card",
                category=PatternCategory.CARD,
                description="Content card with optional image, title, text",
                signature=PatternSignature(
                    selector_hints=[r"\.card", r"\.w-dyn-item"],
                    class_hints=["card", "tile", "item", "box"],
                    css_property_hints={
                        "border-radius": [],  # Any border-radius
                        "box-shadow": [],
                        "background": [],
                    },
                    structure_hints=["contains heading", "bounded container"],
                ),
                tags=["card", "content", "container"],
            ),
            CanonicalPattern(
                id="card-feature",
                name="Feature Card",
                category=PatternCategory.FEATURE,
                description="Card highlighting a feature with icon/image",
                signature=PatternSignature(
                    class_hints=["feature", "benefit", "service", "icon-card"],
                    structure_hints=["contains icon or small image", "contains heading"],
                    css_property_hints={
                        "text-align": ["center"],
                    },
                ),
                tags=["feature", "benefit", "icon"],
            ),
            # Footer patterns
            CanonicalPattern(
                id="footer-standard",
                name="Standard Footer",
                category=PatternCategory.FOOTER,
                description="Site footer with links, copyright, social",
                signature=PatternSignature(
                    selector_hints=[r"\.w-footer", r"footer", r"\.footer"],
                    class_hints=["footer", "site-footer"],
                    element_hints=["footer"],
                    structure_hints=["contains links", "contains copyright"],
                ),
                tags=["footer", "navigation", "copyright"],
            ),
            # Testimonial patterns
            CanonicalPattern(
                id="testimonial-card",
                name="Testimonial Card",
                category=PatternCategory.TESTIMONIAL,
                description="Customer quote with attribution",
                signature=PatternSignature(
                    class_hints=["testimonial", "quote", "review", "feedback"],
                    element_hints=["blockquote"],
                    structure_hints=["contains quote text", "contains name/author"],
                    content_hints=["said", "testimonial", "review"],
                ),
                tags=["testimonial", "quote", "review", "social-proof"],
            ),
            CanonicalPattern(
                id="testimonial-slider",
                name="Testimonial Slider",
                category=PatternCategory.TESTIMONIAL,
                description="Carousel of testimonials",
                signature=PatternSignature(
                    class_hints=["testimonial", "slider", "carousel", "swiper"],
                    css_property_hints={
                        "overflow": ["hidden"],
                    },
                    structure_hints=["multiple testimonial items"],
                ),
                tags=["testimonial", "slider", "carousel"],
            ),
            # CTA patterns
            CanonicalPattern(
                id="cta-section",
                name="CTA Section",
                category=PatternCategory.CTA,
                description="Call-to-action section with button",
                signature=PatternSignature(
                    class_hints=["cta", "call-to-action", "action"],
                    structure_hints=["contains button", "contains headline"],
                    css_property_hints={
                        "text-align": ["center"],
                        "padding": [],  # Usually has significant padding
                    },
                ),
                tags=["cta", "action", "conversion"],
            ),
            CanonicalPattern(
                id="cta-banner",
                name="CTA Banner",
                category=PatternCategory.CTA,
                description="Horizontal banner with CTA",
                signature=PatternSignature(
                    class_hints=["banner", "cta", "promo"],
                    css_property_hints={
                        "display": ["flex"],
                        "justify-content": ["space-between", "center"],
                    },
                ),
                tags=["cta", "banner", "promotion"],
            ),
            # Gallery/Grid patterns
            CanonicalPattern(
                id="gallery-grid",
                name="Image Gallery Grid",
                category=PatternCategory.GALLERY,
                description="Grid of images or portfolio items",
                signature=PatternSignature(
                    class_hints=["gallery", "grid", "portfolio", "work", "projects"],
                    css_property_hints={
                        "display": ["grid"],
                        "grid-template-columns": ["repeat"],
                    },
                    structure_hints=["multiple images"],
                ),
                tags=["gallery", "grid", "portfolio", "images"],
            ),
            CanonicalPattern(
                id="gallery-masonry",
                name="Masonry Gallery",
                category=PatternCategory.GALLERY,
                description="Pinterest-style masonry layout",
                signature=PatternSignature(
                    class_hints=["masonry", "pinterest", "columns"],
                    css_property_hints={
                        "column-count": [],
                        "columns": [],
                    },
                ),
                tags=["gallery", "masonry", "pinterest"],
            ),
            # Form patterns
            CanonicalPattern(
                id="form-contact",
                name="Contact Form",
                category=PatternCategory.FORM,
                description="Standard contact or inquiry form",
                signature=PatternSignature(
                    selector_hints=[r"form", r"\.w-form"],
                    class_hints=["form", "contact", "inquiry"],
                    element_hints=["form"],
                    structure_hints=["contains input fields", "contains submit button"],
                ),
                tags=["form", "contact", "input"],
            ),
            CanonicalPattern(
                id="form-newsletter",
                name="Newsletter Signup",
                category=PatternCategory.FORM,
                description="Email signup form",
                signature=PatternSignature(
                    class_hints=["newsletter", "subscribe", "signup", "email"],
                    structure_hints=["contains email input", "single field"],
                ),
                tags=["form", "newsletter", "email", "signup"],
            ),
            # Pricing patterns
            CanonicalPattern(
                id="pricing-table",
                name="Pricing Table",
                category=PatternCategory.PRICING,
                description="Pricing tiers/plans comparison",
                signature=PatternSignature(
                    class_hints=["pricing", "plans", "tiers", "packages"],
                    structure_hints=["contains price", "contains features list"],
                    content_hints=["$", "€", "£", "/month", "/year", "per"],
                ),
                tags=["pricing", "plans", "comparison"],
            ),
            # Stats/Numbers patterns
            CanonicalPattern(
                id="stats-section",
                name="Statistics Section",
                category=PatternCategory.STATS,
                description="Section displaying key metrics/numbers",
                signature=PatternSignature(
                    class_hints=["stats", "numbers", "metrics", "counter"],
                    structure_hints=["contains large numbers", "contains labels"],
                    content_hints=["+", "%", "k", "m"],
                ),
                tags=["stats", "numbers", "metrics", "counters"],
            ),
            # Team patterns
            CanonicalPattern(
                id="team-grid",
                name="Team Grid",
                category=PatternCategory.TEAM,
                description="Grid of team member cards",
                signature=PatternSignature(
                    class_hints=["team", "members", "people", "staff"],
                    structure_hints=["contains photos", "contains names", "contains titles"],
                ),
                tags=["team", "people", "about"],
            ),
            # FAQ patterns
            CanonicalPattern(
                id="faq-accordion",
                name="FAQ Accordion",
                category=PatternCategory.FAQ,
                description="Expandable FAQ items",
                signature=PatternSignature(
                    class_hints=["faq", "accordion", "questions", "collapse"],
                    structure_hints=["question-answer pairs", "expandable items"],
                    content_hints=["?"],
                ),
                tags=["faq", "accordion", "questions"],
            ),
        ]

        for pattern in default_patterns:
            self._patterns[pattern.id] = pattern

    def get_pattern(self, pattern_id: str) -> CanonicalPattern | None:
        """Get a pattern by ID."""
        return self._patterns.get(pattern_id)

    def get_patterns_by_category(self, category: PatternCategory) -> list[CanonicalPattern]:
        """Get all patterns in a category."""
        return [p for p in self._patterns.values() if p.category == category]

    def all_patterns(self) -> list[CanonicalPattern]:
        """Get all patterns in the library."""
        return list(self._patterns.values())

    def add_pattern(self, pattern: CanonicalPattern) -> None:
        """Add a custom pattern to the library."""
        self._patterns[pattern.id] = pattern

    def remove_pattern(self, pattern_id: str) -> bool:
        """Remove a pattern from the library."""
        if pattern_id in self._patterns:
            del self._patterns[pattern_id]
            return True
        return False

    def match_component(
        self,
        html: str,
        css_classes: list[str],
        css_properties: dict[str, str],
        element_type: str = "",
    ) -> list[tuple[CanonicalPattern, float]]:
        """
        Match a component against patterns in the library.

        Returns list of (pattern, confidence_score) tuples, sorted by score.
        """
        matches: list[tuple[CanonicalPattern, float]] = []

        for pattern in self._patterns.values():
            score = self._calculate_match_score(
                pattern.signature,
                html=html,
                css_classes=css_classes,
                css_properties=css_properties,
                element_type=element_type,
            )
            if score >= pattern.confidence_threshold:
                matches.append((pattern, score))

        # Sort by confidence score descending
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def _calculate_match_score(
        self,
        signature: PatternSignature,
        html: str,
        css_classes: list[str],
        css_properties: dict[str, str],
        element_type: str,
    ) -> float:
        """Calculate how well a component matches a signature."""
        import re

        scores: list[float] = []
        weights: list[float] = []

        html_lower = html.lower()
        classes_str = " ".join(css_classes).lower()
        # Create CSS-style selector string for selector_hints matching
        # e.g., ["w-nav", "navbar"] -> ".w-nav .navbar"
        selector_str = " ".join(f".{cls}" for cls in css_classes).lower()

        # Check class hints (high weight)
        if signature.class_hints:
            class_matches = sum(
                1 for hint in signature.class_hints if hint.lower() in classes_str
            )
            class_score = class_matches / len(signature.class_hints)
            scores.append(class_score)
            weights.append(3.0)

        # Check selector hints (high weight)
        # Also match against element type + classes for selectors like "nav"
        if signature.selector_hints:
            # Build combined match target: element + selector-style classes
            match_target = f"{element_type.lower()} {selector_str}"
            selector_matches = sum(
                1
                for hint in signature.selector_hints
                if re.search(hint, match_target, re.IGNORECASE)
            )
            selector_score = selector_matches / len(signature.selector_hints)
            scores.append(selector_score)
            weights.append(2.5)

        # Check element type (medium weight)
        if signature.element_hints:
            element_score = 1.0 if element_type.lower() in [e.lower() for e in signature.element_hints] else 0.0
            scores.append(element_score)
            weights.append(2.0)

        # Check CSS properties (medium weight)
        if signature.css_property_hints:
            prop_matches = 0
            for prop, expected_values in signature.css_property_hints.items():
                if prop in css_properties:
                    if not expected_values:  # Just check existence
                        prop_matches += 1
                    elif any(v in css_properties[prop] for v in expected_values):
                        prop_matches += 1
            prop_score = prop_matches / len(signature.css_property_hints) if signature.css_property_hints else 0
            scores.append(prop_score)
            weights.append(1.5)

        # Check content hints (low weight)
        if signature.content_hints:
            content_matches = sum(
                1 for hint in signature.content_hints if hint.lower() in html_lower
            )
            content_score = content_matches / len(signature.content_hints)
            scores.append(content_score)
            weights.append(1.0)

        # Check structure hints (low weight, presence-based)
        if signature.structure_hints:
            structure_matches = 0
            for hint in signature.structure_hints:
                hint_lower = hint.lower()
                if "contains" in hint_lower:
                    # Simple check for common patterns
                    if "h1" in hint_lower and "<h1" in html_lower:
                        structure_matches += 1
                    elif "h2" in hint_lower and "<h2" in html_lower:
                        structure_matches += 1
                    elif "h3" in hint_lower and "<h3" in html_lower:
                        structure_matches += 1
                    elif "heading" in hint_lower and any(f"<h{i}" in html_lower for i in range(1, 7)):
                        structure_matches += 1
                    elif "button" in hint_lower and ("<button" in html_lower or 'class="' in html_lower and "btn" in html_lower):
                        structure_matches += 1
                    elif "link" in hint_lower and "<a" in html_lower:
                        structure_matches += 1
                    elif "image" in hint_lower and "<img" in html_lower:
                        structure_matches += 1
                    elif "icon" in hint_lower and ("icon" in html_lower or "<svg" in html_lower):
                        structure_matches += 1
                    elif "logo" in hint_lower and "logo" in html_lower:
                        structure_matches += 1
            structure_score = structure_matches / len(signature.structure_hints)
            scores.append(structure_score)
            weights.append(1.0)

        # Calculate weighted average
        if not scores:
            return 0.0

        total_weight = sum(weights)
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        return weighted_sum / total_weight

    def to_prompt_context(self) -> str:
        """Generate a prompt-friendly description of the library for LLM use."""
        lines = ["# Pattern Library Reference", ""]
        lines.append("Use these canonical patterns when classifying extracted components:")
        lines.append("")

        by_category: dict[PatternCategory, list[CanonicalPattern]] = {}
        for pattern in self._patterns.values():
            if pattern.category not in by_category:
                by_category[pattern.category] = []
            by_category[pattern.category].append(pattern)

        for category in PatternCategory:
            patterns = by_category.get(category, [])
            if patterns:
                lines.append(f"## {category.value}")
                for p in patterns:
                    lines.append(f"- **{p.name}** ({p.id}): {p.description}")
                    if p.signature.class_hints:
                        lines.append(f"  - Class hints: {', '.join(p.signature.class_hints[:5])}")
                lines.append("")

        return "\n".join(lines)


# Singleton instance for convenience
_default_library: PatternLibrary | None = None


def get_pattern_library() -> PatternLibrary:
    """Get the default pattern library instance."""
    global _default_library
    if _default_library is None:
        _default_library = PatternLibrary()
    return _default_library
