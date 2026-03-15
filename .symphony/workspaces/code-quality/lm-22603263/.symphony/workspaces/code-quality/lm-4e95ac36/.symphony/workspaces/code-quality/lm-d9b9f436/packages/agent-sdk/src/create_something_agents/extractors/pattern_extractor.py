"""
Pattern Extractor

Extracts reusable patterns from HTML/CSS templates using Gemini Flash.
Cost-optimized for batch processing of template libraries.

Philosophy: Extract the patterns, not impose new ones.
"""

import json
import re
import time
import uuid
from typing import Any

from ..providers.base import ProviderConfig, ProviderResult
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
from .pattern_library import PatternLibrary, CanonicalPattern


# Extraction prompt for Gemini Flash (optimized for 8K token output limit)
EXTRACTION_PROMPT = """# Template Pattern Extraction

You are a pattern extraction system. Analyze this HTML/CSS template and extract all reusable patterns.

## CRITICAL: Output Size Limit
Keep total JSON output under 7000 tokens. For HTML fields, use ABBREVIATED snippets (max 300 chars each).

## Your Task

Extract and catalog:
1. **Components** - Distinct UI elements (heroes, cards, navs, footers, etc.)
2. **Layouts** - Grid/flex patterns and their responsive breakpoints
3. **Interactions** - Hover states, animations, transitions
4. **Colors** - The complete color palette used
5. **Typography** - Font families, sizes, weights, line heights
6. **Spacing** - Padding, margin, and gap patterns

## Output Format

Return ONLY valid JSON (no markdown, no explanation):

{
  "components": [
    {
      "category": "hero|navigation|card|footer|header|section|form|modal|slider|gallery|testimonial|pricing|cta|feature|team|contact|faq|blog|unknown",
      "name": "Human readable name",
      "html": "<div class='...'>[ABBREVIATED - max 300 chars]</div>",
      "css_classes": ["class1", "class2"],
      "description": "Brief description",
      "tags": ["tag1", "tag2"]
    }
  ],
  "layouts": [
    {
      "name": "Layout name",
      "type": "grid|flex|absolute",
      "columns": 3,
      "rows": null,
      "css_rules": [{"selector": ".grid", "properties": {"display": "grid"}}],
      "breakpoints": {"768px": {"columns": 2}},
      "description": "Brief description"
    }
  ],
  "interactions": [
    {
      "type": "hover|scroll|click|load|parallax|transition|transform|fade|slide",
      "trigger": ".selector:hover",
      "css_rules": [{"selector": ".selector:hover", "properties": {"opacity": "0.8"}}],
      "keyframes": null,
      "duration": "0.3s",
      "easing": "ease-out",
      "description": "Brief description"
    }
  ],
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex",
    "muted": "#hex",
    "border": "#hex",
    "all_colors": ["#hex1", "#hex2"]
  },
  "typography": {
    "font_families": ["Font Name"],
    "heading_sizes": ["3rem", "2rem"],
    "body_size": "1rem",
    "line_heights": ["1.2", "1.5"],
    "font_weights": ["400", "700"]
  },
  "spacing": {
    "padding_values": ["1rem", "2rem"],
    "margin_values": ["0", "1rem"],
    "gap_values": ["1rem"]
  }
}

## Guidelines

- ABBREVIATE HTML: Max 300 characters per component. Show structure, not full content.
- Focus on UNIQUE components only (skip repeated instances)
- Include the ROOT element's classes for each component
- Extract actual hex colors, not color names
- Keep descriptions brief (1 sentence max)
- Limit to 10 most important components
- Limit to 5 most important interactions

## Template to Analyze

{TEMPLATE_CONTENT}
"""


class PatternExtractor:
    """
    Extracts patterns from HTML/CSS templates.

    Uses Gemini Flash for cost-effective analysis (~$0.001 per template).
    Falls back to Claude Haiku if Gemini unavailable.
    """

    def __init__(
        self,
        claude_provider: Any | None = None,
        gemini_provider: Any | None = None,
        pattern_library: PatternLibrary | None = None,
    ):
        """
        Initialize the pattern extractor.

        Args:
            claude_provider: ClaudeProvider instance (fallback)
            gemini_provider: GeminiProvider instance (primary - cost optimized)
            pattern_library: Optional PatternLibrary for validation and enhancement
        """
        self.claude_provider = claude_provider
        self.gemini_provider = gemini_provider
        self.pattern_library = pattern_library

    async def extract(
        self,
        template_content: str,
        template_name: str = "template",
        include_css: str | None = None,
        timeout_ms: int = 120000,
    ) -> ExtractionResult:
        """
        Extract patterns from a template.

        Args:
            template_content: HTML content of the template
            template_name: Name identifier for the template
            include_css: Optional separate CSS content to include
            timeout_ms: Timeout in milliseconds

        Returns:
            ExtractionResult with PatternCatalog if successful
        """
        start_time = time.time()

        # Combine HTML and CSS if provided separately
        content = template_content
        if include_css:
            content = f"{template_content}\n\n<style>\n{include_css}\n</style>"

        # Build prompt
        prompt = EXTRACTION_PROMPT.replace("{TEMPLATE_CONTENT}", content)

        # Select provider (prefer Gemini for cost)
        # Model-specific max_tokens limits
        MODEL_MAX_TOKENS = {
            "gemini-2.0-flash-exp": 8192,  # Gemini Flash output limit
            "claude-3-5-haiku-20241022": 8192,  # Haiku max output
            "claude-sonnet-4-20250514": 16384,  # Sonnet higher limit
        }

        provider = self.gemini_provider
        provider_name = "gemini"
        model = "gemini-2.0-flash-exp"

        if provider is None:
            provider = self.claude_provider
            provider_name = "claude"
            model = "claude-3-5-haiku-20241022"

        if provider is None:
            return ExtractionResult(
                success=False,
                error="No provider available (neither Gemini nor Claude configured)",
                extraction_time_ms=(time.time() - start_time) * 1000,
            )

        # Get model-appropriate max_tokens
        max_tokens = MODEL_MAX_TOKENS.get(model, 8192)

        # Execute extraction
        try:
            config = ProviderConfig(
                task=prompt,
                model=model,
                max_tokens=max_tokens,  # Model-appropriate output limit
                temperature=0.0,  # Deterministic extraction
            )

            result = await provider.execute(config)
            duration_ms = (time.time() - start_time) * 1000

            if not result.success:
                return ExtractionResult(
                    success=False,
                    error=f"Provider execution failed: {result.error}",
                    extraction_time_ms=duration_ms,
                    cost_usd=result.cost_usd,
                    model_used=model,
                    provider_used=provider_name,
                )

            # Parse the extraction result
            catalog = self._parse_extraction(result.output, template_name)

            if catalog is None:
                return ExtractionResult(
                    success=False,
                    error="Failed to parse extraction output",
                    extraction_time_ms=duration_ms,
                    cost_usd=result.cost_usd,
                    model_used=model,
                    provider_used=provider_name,
                )

            return ExtractionResult(
                success=True,
                catalog=catalog,
                extraction_time_ms=duration_ms,
                cost_usd=result.cost_usd,
                model_used=model,
                provider_used=provider_name,
            )

        except Exception as e:
            return ExtractionResult(
                success=False,
                error=f"Extraction failed: {str(e)}",
                extraction_time_ms=(time.time() - start_time) * 1000,
            )

    def _parse_extraction(self, output: str, template_name: str) -> PatternCatalog | None:
        """Parse the LLM output into a PatternCatalog."""
        # Extract JSON from output
        json_content = self._extract_json(output)
        if not json_content:
            return None

        try:
            data = json.loads(json_content)
        except json.JSONDecodeError:
            return None

        catalog_id = f"cat_{uuid.uuid4().hex[:8]}"

        # Parse components
        components = []
        for i, comp_data in enumerate(data.get("components", [])):
            comp_id = f"comp_{uuid.uuid4().hex[:8]}"
            category = self._parse_category(comp_data.get("category", "unknown"))

            # Parse CSS rules if present
            css_rules = []
            for rule_data in comp_data.get("css_rules", []):
                css_rules.append(CSSRule(
                    selector=rule_data.get("selector", ""),
                    properties=rule_data.get("properties", {}),
                ))

            component = Component(
                id=comp_id,
                category=category,
                name=comp_data.get("name", f"Component {i+1}"),
                html=comp_data.get("html", ""),
                css_classes=comp_data.get("css_classes", []),
                css_rules=css_rules,
                interactions=[],  # Will link later
                source_template=template_name,
                description=comp_data.get("description"),
                tags=comp_data.get("tags", []),
            )
            components.append(component)

        # Parse layouts
        layouts = []
        for i, layout_data in enumerate(data.get("layouts", [])):
            layout_id = f"layout_{uuid.uuid4().hex[:8]}"

            css_rules = []
            for rule_data in layout_data.get("css_rules", []):
                css_rules.append(CSSRule(
                    selector=rule_data.get("selector", ""),
                    properties=rule_data.get("properties", {}),
                ))

            layout = LayoutPattern(
                id=layout_id,
                name=layout_data.get("name", f"Layout {i+1}"),
                type=layout_data.get("type", "unknown"),
                columns=layout_data.get("columns"),
                rows=layout_data.get("rows"),
                css_rules=css_rules,
                breakpoints=layout_data.get("breakpoints", {}),
                description=layout_data.get("description"),
            )
            layouts.append(layout)

        # Parse interactions
        interactions = []
        for i, int_data in enumerate(data.get("interactions", [])):
            int_type = self._parse_interaction_type(int_data.get("type", "none"))

            css_rules = []
            for rule_data in int_data.get("css_rules", []):
                css_rules.append(CSSRule(
                    selector=rule_data.get("selector", ""),
                    properties=rule_data.get("properties", {}),
                ))

            interaction = Interaction(
                type=int_type,
                trigger=int_data.get("trigger", ""),
                css_rules=css_rules,
                keyframes=int_data.get("keyframes"),
                duration=int_data.get("duration"),
                easing=int_data.get("easing"),
                description=int_data.get("description"),
            )
            interactions.append(interaction)

        # Parse colors
        colors_data = data.get("colors", {})
        colors = ColorPalette(
            primary=colors_data.get("primary"),
            secondary=colors_data.get("secondary"),
            accent=colors_data.get("accent"),
            background=colors_data.get("background"),
            text=colors_data.get("text"),
            muted=colors_data.get("muted"),
            border=colors_data.get("border"),
            all_colors=colors_data.get("all_colors", []),
        )

        # Parse typography
        typo_data = data.get("typography", {})
        typography = Typography(
            font_families=typo_data.get("font_families", []),
            heading_sizes=typo_data.get("heading_sizes", []),
            body_size=typo_data.get("body_size"),
            line_heights=typo_data.get("line_heights", []),
            font_weights=typo_data.get("font_weights", []),
        )

        # Parse spacing
        spacing_data = data.get("spacing", {})
        spacing = Spacing(
            padding_values=spacing_data.get("padding_values", []),
            margin_values=spacing_data.get("margin_values", []),
            gap_values=spacing_data.get("gap_values", []),
        )

        return PatternCatalog(
            id=catalog_id,
            name=f"Patterns from {template_name}",
            source_templates=[template_name],
            components=components,
            layouts=layouts,
            interactions=interactions,
            colors=colors,
            typography=typography,
            spacing=spacing,
        )

    def _parse_category(self, category_str: str) -> PatternCategory:
        """Parse category string to enum."""
        category_map = {
            "hero": PatternCategory.HERO,
            "navigation": PatternCategory.NAVIGATION,
            "nav": PatternCategory.NAVIGATION,
            "card": PatternCategory.CARD,
            "footer": PatternCategory.FOOTER,
            "header": PatternCategory.HEADER,
            "section": PatternCategory.SECTION,
            "form": PatternCategory.FORM,
            "modal": PatternCategory.MODAL,
            "slider": PatternCategory.SLIDER,
            "carousel": PatternCategory.SLIDER,
            "gallery": PatternCategory.GALLERY,
            "testimonial": PatternCategory.TESTIMONIAL,
            "pricing": PatternCategory.PRICING,
            "cta": PatternCategory.CTA,
            "feature": PatternCategory.FEATURE,
            "features": PatternCategory.FEATURE,
            "team": PatternCategory.TEAM,
            "contact": PatternCategory.CONTACT,
            "faq": PatternCategory.FAQ,
            "blog": PatternCategory.BLOG,
        }
        return category_map.get(category_str.lower(), PatternCategory.UNKNOWN)

    def _parse_interaction_type(self, type_str: str) -> InteractionType:
        """Parse interaction type string to enum."""
        type_map = {
            "hover": InteractionType.HOVER,
            "scroll": InteractionType.SCROLL,
            "click": InteractionType.CLICK,
            "load": InteractionType.LOAD,
            "parallax": InteractionType.PARALLAX,
            "transition": InteractionType.TRANSITION,
            "transform": InteractionType.TRANSFORM,
            "fade": InteractionType.FADE,
            "slide": InteractionType.SLIDE,
        }
        return type_map.get(type_str.lower(), InteractionType.NONE)

    def _extract_json(self, output: str) -> str | None:
        """Extract JSON from model output."""
        output = output.strip()

        # Strategy 1: Code block
        code_block = re.search(r"```json?\s*([\s\S]*?)\s*```", output)
        if code_block:
            content = code_block.group(1).strip()
            if self._is_valid_json(content):
                return content

        # Strategy 2: Raw JSON (starts with {)
        if output.startswith("{"):
            json_content = self._extract_balanced_json(output)
            if json_content and self._is_valid_json(json_content):
                return json_content

        # Strategy 3: Find JSON anywhere in output
        json_match = re.search(r"\{[\s\S]*\}", output)
        if json_match:
            json_content = self._extract_balanced_json(json_match.group())
            if json_content and self._is_valid_json(json_content):
                return json_content

        return None

    def _extract_balanced_json(self, text: str) -> str | None:
        """Extract balanced JSON object from text."""
        start_idx = text.find("{")
        if start_idx == -1:
            return None

        depth = 0
        in_string = False
        escape_next = False

        for i in range(start_idx, len(text)):
            char = text[i]

            if escape_next:
                escape_next = False
                continue

            if char == "\\" and in_string:
                escape_next = True
                continue

            if char == '"':
                in_string = not in_string
                continue

            if not in_string:
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start_idx:i + 1]

        return None

    def _is_valid_json(self, text: str) -> bool:
        """Check if text is valid JSON."""
        try:
            json.loads(text)
            return True
        except json.JSONDecodeError:
            return False

    def _extract_element_type(self, html: str) -> str:
        """Extract the root element type from HTML."""
        import re
        # Match opening tag: <tagname or <tagname ... >
        match = re.match(r"<(\w+)", html.strip())
        return match.group(1) if match else ""

    def validate_against_library(
        self,
        catalog: PatternCatalog,
    ) -> dict[str, list[tuple[CanonicalPattern, float]]]:
        """
        Validate extracted components against the pattern library.

        Args:
            catalog: Extracted PatternCatalog to validate

        Returns:
            Dict mapping component IDs to list of (pattern, confidence) tuples
        """
        if self.pattern_library is None:
            return {}

        results: dict[str, list[tuple[CanonicalPattern, float]]] = {}

        for component in catalog.components:
            # Build CSS properties dict from rules
            css_properties: dict[str, str] = {}
            for rule in component.css_rules:
                css_properties.update(rule.properties)

            # Extract element type from HTML
            element_type = self._extract_element_type(component.html)

            # Match against library
            matches = self.pattern_library.match_component(
                html=component.html,
                css_classes=component.css_classes,
                css_properties=css_properties,
                element_type=element_type,
            )

            results[component.id] = matches

        return results

    def enhance_catalog(
        self,
        catalog: PatternCatalog,
        min_confidence: float = 0.30,
    ) -> PatternCatalog:
        """
        Enhance a catalog by re-categorizing components based on library matches.

        This uses the pattern library to improve extraction accuracy.
        Components with library matches above min_confidence have their
        category updated to match the canonical pattern.

        Args:
            catalog: The PatternCatalog to enhance
            min_confidence: Minimum confidence threshold for re-categorization

        Returns:
            Enhanced PatternCatalog with improved categorization
        """
        if self.pattern_library is None:
            return catalog

        matches = self.validate_against_library(catalog)

        # Create enhanced components
        enhanced_components: list[Component] = []
        for component in catalog.components:
            component_matches = matches.get(component.id, [])

            if component_matches:
                # Use the highest confidence match
                best_pattern, confidence = component_matches[0]
                if confidence >= min_confidence:
                    # Create updated component with canonical category
                    enhanced = Component(
                        id=component.id,
                        category=best_pattern.category,
                        name=component.name,
                        html=component.html,
                        css_classes=component.css_classes,
                        css_rules=component.css_rules,
                        interactions=component.interactions,
                        children=component.children,
                        source_template=component.source_template,
                        description=component.description,
                        tags=list(set(component.tags + best_pattern.tags)),
                    )
                    enhanced_components.append(enhanced)
                    continue

            enhanced_components.append(component)

        # Return new catalog with enhanced components
        return PatternCatalog(
            id=catalog.id,
            name=catalog.name,
            source_templates=catalog.source_templates,
            components=enhanced_components,
            layouts=catalog.layouts,
            interactions=catalog.interactions,
            colors=catalog.colors,
            typography=catalog.typography,
            spacing=catalog.spacing,
        )

    def get_unmatched_components(
        self,
        catalog: PatternCatalog,
        min_confidence: float = 0.3,
    ) -> list[Component]:
        """
        Get components that don't match any library pattern.

        These are candidates for pattern discovery - they may represent
        new patterns that should be added to the library.

        Args:
            catalog: The PatternCatalog to analyze
            min_confidence: Components below this threshold are considered unmatched

        Returns:
            List of components without library matches
        """
        if self.pattern_library is None:
            return catalog.components

        matches = self.validate_against_library(catalog)
        unmatched: list[Component] = []

        for component in catalog.components:
            component_matches = matches.get(component.id, [])

            # Check if there's any match above threshold
            has_match = any(conf >= min_confidence for _, conf in component_matches)
            if not has_match:
                unmatched.append(component)

        return unmatched

    async def extract_and_enhance(
        self,
        template_content: str,
        template_name: str = "template",
        include_css: str | None = None,
        min_confidence: float = 0.30,
        timeout_ms: int = 120000,
    ) -> ExtractionResult:
        """
        Extract patterns and enhance with library validation.

        This is a convenience method that combines extraction and enhancement.

        Args:
            template_content: HTML content of the template
            template_name: Name identifier for the template
            include_css: Optional separate CSS content
            min_confidence: Minimum confidence for library re-categorization
            timeout_ms: Timeout in milliseconds

        Returns:
            ExtractionResult with enhanced PatternCatalog
        """
        result = await self.extract(
            template_content,
            template_name,
            include_css,
            timeout_ms,
        )

        if result.success and result.catalog and self.pattern_library:
            enhanced_catalog = self.enhance_catalog(result.catalog, min_confidence)
            return ExtractionResult(
                success=True,
                catalog=enhanced_catalog,
                extraction_time_ms=result.extraction_time_ms,
                cost_usd=result.cost_usd,
                model_used=result.model_used,
                provider_used=result.provider_used,
            )

        return result


async def extract_patterns(
    template_content: str,
    template_name: str = "template",
    include_css: str | None = None,
    claude_provider: Any | None = None,
    gemini_provider: Any | None = None,
    pattern_library: PatternLibrary | None = None,
    enhance: bool = False,
    timeout_ms: int = 120000,
) -> ExtractionResult:
    """
    Convenience function to extract patterns from a template.

    Args:
        template_content: HTML content of the template
        template_name: Name identifier for the template
        include_css: Optional separate CSS content
        claude_provider: Optional ClaudeProvider (fallback)
        gemini_provider: Optional GeminiProvider (primary)
        pattern_library: Optional PatternLibrary for validation
        enhance: If True and pattern_library provided, enhance classifications
        timeout_ms: Timeout in milliseconds

    Returns:
        ExtractionResult with PatternCatalog if successful
    """
    extractor = PatternExtractor(claude_provider, gemini_provider, pattern_library)

    if enhance and pattern_library:
        return await extractor.extract_and_enhance(
            template_content,
            template_name,
            include_css,
            timeout_ms=timeout_ms,
        )

    return await extractor.extract(
        template_content,
        template_name,
        include_css,
        timeout_ms,
    )
