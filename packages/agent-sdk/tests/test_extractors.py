"""
Tests for Pattern Extractors

Tests the template pattern extraction system.
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock

from create_something_agents.extractors import (
    PatternExtractor,
    PatternCatalog,
    PatternCategory,
    InteractionType,
    Component,
    LayoutPattern,
    Interaction,
    CSSRule,
    ColorPalette,
    Typography,
    Spacing,
    ExtractionResult,
    extract_patterns,
)
from create_something_agents.providers.base import ProviderResult


class TestPatternTypes:
    """Test pattern type definitions."""

    def test_pattern_categories(self) -> None:
        """All pattern categories are defined."""
        assert PatternCategory.HERO.value == "hero"
        assert PatternCategory.NAVIGATION.value == "navigation"
        assert PatternCategory.CARD.value == "card"
        assert PatternCategory.FOOTER.value == "footer"
        assert PatternCategory.PRICING.value == "pricing"
        assert PatternCategory.CTA.value == "cta"

    def test_interaction_types(self) -> None:
        """All interaction types are defined."""
        assert InteractionType.HOVER.value == "hover"
        assert InteractionType.SCROLL.value == "scroll"
        assert InteractionType.FADE.value == "fade"
        assert InteractionType.PARALLAX.value == "parallax"

    def test_css_rule_to_css(self) -> None:
        """CSS rule converts to CSS string."""
        rule = CSSRule(
            selector=".card",
            properties={"display": "flex", "padding": "1rem"},
        )
        css = rule.to_css()
        assert ".card {" in css
        assert "display: flex;" in css
        assert "padding: 1rem;" in css

    def test_css_rule_with_media_query(self) -> None:
        """CSS rule with media query wraps correctly."""
        rule = CSSRule(
            selector=".card",
            properties={"flex-direction": "column"},
            media_query="(max-width: 768px)",
        )
        css = rule.to_css()
        assert "@media (max-width: 768px)" in css
        assert ".card {" in css


class TestPatternCatalog:
    """Test PatternCatalog functionality."""

    @pytest.fixture
    def sample_catalog(self) -> PatternCatalog:
        """Create a sample catalog for testing."""
        return PatternCatalog(
            id="cat_test",
            name="Test Catalog",
            source_templates=["template1.html"],
            components=[
                Component(
                    id="comp_1",
                    category=PatternCategory.HERO,
                    name="Hero Banner",
                    html="<div class='hero'>...</div>",
                    css_classes=["hero", "hero-large"],
                    description="A large hero section",
                    tags=["hero", "banner", "fullwidth"],
                ),
                Component(
                    id="comp_2",
                    category=PatternCategory.CARD,
                    name="Feature Card",
                    html="<div class='card'>...</div>",
                    css_classes=["card", "card-feature"],
                    description="A feature highlight card",
                    tags=["card", "feature"],
                ),
                Component(
                    id="comp_3",
                    category=PatternCategory.CARD,
                    name="Pricing Card",
                    html="<div class='pricing'>...</div>",
                    css_classes=["card", "pricing"],
                    description="A pricing tier card",
                    tags=["card", "pricing"],
                ),
            ],
            colors=ColorPalette(
                primary="#1a1a1a",
                secondary="#333333",
                all_colors=["#1a1a1a", "#333333", "#ffffff"],
            ),
        )

    def test_get_components_by_category(self, sample_catalog: PatternCatalog) -> None:
        """Filter components by category."""
        cards = sample_catalog.get_components_by_category(PatternCategory.CARD)
        assert len(cards) == 2
        assert all(c.category == PatternCategory.CARD for c in cards)

        heroes = sample_catalog.get_components_by_category(PatternCategory.HERO)
        assert len(heroes) == 1

    def test_get_component_by_id(self, sample_catalog: PatternCatalog) -> None:
        """Get component by ID."""
        comp = sample_catalog.get_component_by_id("comp_1")
        assert comp is not None
        assert comp.name == "Hero Banner"

        missing = sample_catalog.get_component_by_id("nonexistent")
        assert missing is None

    def test_search_components_by_name(self, sample_catalog: PatternCatalog) -> None:
        """Search components by name."""
        results = sample_catalog.search_components("hero")
        assert len(results) == 1
        assert results[0].name == "Hero Banner"

    def test_search_components_by_tag(self, sample_catalog: PatternCatalog) -> None:
        """Search components by tags."""
        results = sample_catalog.search_components("pricing")
        assert len(results) == 1
        assert results[0].name == "Pricing Card"

    def test_search_components_by_description(self, sample_catalog: PatternCatalog) -> None:
        """Search components by description."""
        results = sample_catalog.search_components("feature")
        assert len(results) == 1
        assert results[0].name == "Feature Card"

    def test_catalog_summary(self, sample_catalog: PatternCatalog) -> None:
        """Catalog generates readable summary."""
        summary = sample_catalog.summary()
        assert "Test Catalog" in summary
        assert "Components: 3" in summary
        assert "hero: 1" in summary
        assert "card: 2" in summary

    def test_catalog_to_dict(self, sample_catalog: PatternCatalog) -> None:
        """Catalog serializes to dictionary."""
        data = sample_catalog.to_dict()
        assert data["id"] == "cat_test"
        assert data["name"] == "Test Catalog"
        assert len(data["components"]) == 3
        assert data["colors"]["primary"] == "#1a1a1a"


class TestPatternExtractor:
    """Test the PatternExtractor class."""

    @pytest.fixture
    def mock_gemini_provider(self) -> MagicMock:
        """Create mock Gemini provider with extraction response."""
        provider = MagicMock()
        provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output=json.dumps({
                    "components": [
                        {
                            "category": "hero",
                            "name": "Hero Section",
                            "html": "<section class='hero'><h1>Title</h1></section>",
                            "css_classes": ["hero", "hero-main"],
                            "description": "Main hero section",
                            "tags": ["hero", "banner"],
                        },
                        {
                            "category": "card",
                            "name": "Feature Card",
                            "html": "<div class='card'><h3>Feature</h3></div>",
                            "css_classes": ["card", "feature-card"],
                            "description": "Feature display card",
                            "tags": ["card", "feature"],
                        },
                    ],
                    "layouts": [
                        {
                            "name": "Three Column Grid",
                            "type": "grid",
                            "columns": 3,
                            "css_rules": [{"selector": ".grid", "properties": {"display": "grid", "grid-template-columns": "repeat(3, 1fr)"}}],
                            "breakpoints": {"768px": {"columns": 2}},
                            "description": "Responsive 3-column grid",
                        }
                    ],
                    "interactions": [
                        {
                            "type": "hover",
                            "trigger": ".card:hover",
                            "css_rules": [{"selector": ".card:hover", "properties": {"transform": "translateY(-4px)"}}],
                            "duration": "0.2s",
                            "easing": "ease-out",
                            "description": "Card lift on hover",
                        }
                    ],
                    "colors": {
                        "primary": "#1a1a1a",
                        "secondary": "#333333",
                        "background": "#ffffff",
                        "text": "#111111",
                        "all_colors": ["#1a1a1a", "#333333", "#ffffff", "#111111"],
                    },
                    "typography": {
                        "font_families": ["Inter", "sans-serif"],
                        "heading_sizes": ["3rem", "2.5rem", "2rem"],
                        "body_size": "1rem",
                        "line_heights": ["1.2", "1.5"],
                        "font_weights": ["400", "600", "700"],
                    },
                    "spacing": {
                        "padding_values": ["1rem", "2rem", "4rem"],
                        "margin_values": ["0", "1rem", "2rem"],
                        "gap_values": ["1rem", "2rem"],
                    },
                }),
                model="gemini-2.0-flash-exp",
                provider="gemini",
                cost_usd=0.001,
            )
        )
        return provider

    @pytest.fixture
    def sample_html(self) -> str:
        """Sample HTML template for testing."""
        return """
<!DOCTYPE html>
<html>
<head>
    <style>
        .hero { padding: 4rem 2rem; background: #1a1a1a; }
        .card { padding: 2rem; border-radius: 8px; }
        .card:hover { transform: translateY(-4px); }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    </style>
</head>
<body>
    <section class="hero hero-main">
        <h1>Welcome</h1>
    </section>
    <div class="grid">
        <div class="card feature-card">Feature 1</div>
        <div class="card feature-card">Feature 2</div>
        <div class="card feature-card">Feature 3</div>
    </div>
</body>
</html>
"""

    @pytest.mark.asyncio
    async def test_extraction_uses_gemini(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction uses Gemini provider when available."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.success
        assert result.provider_used == "gemini"
        assert result.model_used == "gemini-2.0-flash-exp"
        mock_gemini_provider.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_extraction_parses_components(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction correctly parses components."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.success
        assert result.catalog is not None
        assert len(result.catalog.components) == 2

        hero = result.catalog.components[0]
        assert hero.category == PatternCategory.HERO
        assert hero.name == "Hero Section"
        assert "hero" in hero.css_classes

    @pytest.mark.asyncio
    async def test_extraction_parses_layouts(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction correctly parses layouts."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.catalog is not None
        assert len(result.catalog.layouts) == 1

        layout = result.catalog.layouts[0]
        assert layout.type == "grid"
        assert layout.columns == 3
        assert "768px" in layout.breakpoints

    @pytest.mark.asyncio
    async def test_extraction_parses_interactions(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction correctly parses interactions."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.catalog is not None
        assert len(result.catalog.interactions) == 1

        interaction = result.catalog.interactions[0]
        assert interaction.type == InteractionType.HOVER
        assert interaction.duration == "0.2s"

    @pytest.mark.asyncio
    async def test_extraction_parses_colors(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction correctly parses color palette."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.catalog is not None
        assert result.catalog.colors is not None
        assert result.catalog.colors.primary == "#1a1a1a"
        assert len(result.catalog.colors.all_colors) == 4

    @pytest.mark.asyncio
    async def test_extraction_parses_typography(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction correctly parses typography."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.catalog is not None
        assert result.catalog.typography is not None
        assert "Inter" in result.catalog.typography.font_families
        assert result.catalog.typography.body_size == "1rem"

    @pytest.mark.asyncio
    async def test_extraction_tracks_cost(
        self,
        mock_gemini_provider: MagicMock,
        sample_html: str,
    ) -> None:
        """Extraction tracks API cost."""
        extractor = PatternExtractor(None, mock_gemini_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert result.cost_usd == 0.001

    @pytest.mark.asyncio
    async def test_fallback_to_claude(
        self,
        sample_html: str,
    ) -> None:
        """Falls back to Claude when Gemini unavailable."""
        mock_claude = MagicMock()
        mock_claude.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output='{"components": [], "layouts": [], "interactions": [], "colors": {}, "typography": {}, "spacing": {}}',
                model="claude-3-5-haiku-20241022",
                provider="claude",
                cost_usd=0.002,
            )
        )

        extractor = PatternExtractor(mock_claude, None)  # No Gemini
        result = await extractor.extract(sample_html, "test-template")

        assert result.success
        assert result.provider_used == "claude"
        mock_claude.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_error_when_no_providers(
        self,
        sample_html: str,
    ) -> None:
        """Returns error when no providers available."""
        extractor = PatternExtractor(None, None)
        result = await extractor.extract(sample_html, "test-template")

        assert not result.success
        assert "No provider available" in result.error

    @pytest.mark.asyncio
    async def test_handles_provider_failure(
        self,
        sample_html: str,
    ) -> None:
        """Handles provider execution failure gracefully."""
        mock_provider = MagicMock()
        mock_provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=False,
                output="",
                error="Rate limit exceeded",
                model="gemini-2.0-flash-exp",
                provider="gemini",
            )
        )

        extractor = PatternExtractor(None, mock_provider)
        result = await extractor.extract(sample_html, "test-template")

        assert not result.success
        assert "Rate limit exceeded" in result.error


class TestJSONExtraction:
    """Test JSON extraction from various output formats."""

    @pytest.fixture
    def extractor(self) -> PatternExtractor:
        """Create extractor instance."""
        return PatternExtractor(None, None)

    def test_extract_raw_json(self, extractor: PatternExtractor) -> None:
        """Extracts raw JSON output."""
        output = '{"components": [], "layouts": []}'
        result = extractor._extract_json(output)
        assert result is not None
        assert '"components"' in result

    def test_extract_json_from_code_block(self, extractor: PatternExtractor) -> None:
        """Extracts JSON from markdown code block."""
        output = """Here's the extraction:
```json
{"components": [], "layouts": []}
```
"""
        result = extractor._extract_json(output)
        assert result is not None
        assert '"components"' in result

    def test_extract_json_with_surrounding_text(self, extractor: PatternExtractor) -> None:
        """Extracts JSON surrounded by explanation text."""
        output = """Based on my analysis, here are the patterns:
{"components": [{"name": "Hero"}], "layouts": []}
That's all the patterns I found."""
        result = extractor._extract_json(output)
        assert result is not None
        assert '"Hero"' in result

    def test_handles_nested_json(self, extractor: PatternExtractor) -> None:
        """Handles nested JSON structures correctly."""
        output = '{"components": [{"css_rules": [{"selector": ".foo", "properties": {"display": "flex"}}]}]}'
        result = extractor._extract_json(output)
        assert result is not None
        data = json.loads(result)
        assert data["components"][0]["css_rules"][0]["selector"] == ".foo"


class TestCategoryParsing:
    """Test category string parsing."""

    @pytest.fixture
    def extractor(self) -> PatternExtractor:
        """Create extractor instance."""
        return PatternExtractor(None, None)

    def test_parse_standard_categories(self, extractor: PatternExtractor) -> None:
        """Parses standard category names."""
        assert extractor._parse_category("hero") == PatternCategory.HERO
        assert extractor._parse_category("card") == PatternCategory.CARD
        assert extractor._parse_category("footer") == PatternCategory.FOOTER

    def test_parse_category_aliases(self, extractor: PatternExtractor) -> None:
        """Parses category aliases."""
        assert extractor._parse_category("nav") == PatternCategory.NAVIGATION
        assert extractor._parse_category("carousel") == PatternCategory.SLIDER
        assert extractor._parse_category("features") == PatternCategory.FEATURE

    def test_parse_category_case_insensitive(self, extractor: PatternExtractor) -> None:
        """Category parsing is case insensitive."""
        assert extractor._parse_category("HERO") == PatternCategory.HERO
        assert extractor._parse_category("Hero") == PatternCategory.HERO

    def test_unknown_category(self, extractor: PatternExtractor) -> None:
        """Unknown categories return UNKNOWN."""
        assert extractor._parse_category("random") == PatternCategory.UNKNOWN


class TestInteractionTypeParsing:
    """Test interaction type string parsing."""

    @pytest.fixture
    def extractor(self) -> PatternExtractor:
        """Create extractor instance."""
        return PatternExtractor(None, None)

    def test_parse_interaction_types(self, extractor: PatternExtractor) -> None:
        """Parses interaction type strings."""
        assert extractor._parse_interaction_type("hover") == InteractionType.HOVER
        assert extractor._parse_interaction_type("scroll") == InteractionType.SCROLL
        assert extractor._parse_interaction_type("fade") == InteractionType.FADE

    def test_unknown_interaction_type(self, extractor: PatternExtractor) -> None:
        """Unknown interaction types return NONE."""
        assert extractor._parse_interaction_type("random") == InteractionType.NONE


class TestConvenienceFunction:
    """Test the extract_patterns convenience function."""

    @pytest.mark.asyncio
    async def test_extract_patterns_function(self) -> None:
        """Convenience function works correctly."""
        mock_provider = MagicMock()
        mock_provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output='{"components": [], "layouts": [], "interactions": [], "colors": {}, "typography": {}, "spacing": {}}',
                model="gemini-2.0-flash-exp",
                provider="gemini",
                cost_usd=0.001,
            )
        )

        result = await extract_patterns(
            "<html><body>Test</body></html>",
            "test",
            gemini_provider=mock_provider,
        )

        assert result.success
        assert result.catalog is not None


class TestLibraryIntegration:
    """Test PatternExtractor integration with PatternLibrary."""

    @pytest.fixture
    def pattern_library(self):
        """Create a PatternLibrary instance."""
        from create_something_agents.extractors import PatternLibrary
        return PatternLibrary()

    @pytest.fixture
    def sample_catalog(self) -> PatternCatalog:
        """Create a sample catalog for testing."""
        return PatternCatalog(
            id="test-catalog",
            name="Test Catalog",
            source_templates=["test.html"],
            components=[
                Component(
                    id="comp-1",
                    category=PatternCategory.UNKNOWN,  # Will be enhanced
                    name="Navigation Bar",
                    html='<nav class="w-nav navbar"><a href="/">Home</a></nav>',
                    css_classes=["w-nav", "navbar", "navigation"],
                    css_rules=[],
                ),
                Component(
                    id="comp-2",
                    category=PatternCategory.UNKNOWN,  # Will be enhanced
                    name="Hero Section",
                    html='<section class="hero-section"><h1>Welcome</h1></section>',
                    css_classes=["hero-section", "hero"],
                    css_rules=[],
                ),
                Component(
                    id="comp-3",
                    category=PatternCategory.UNKNOWN,  # Unknown component
                    name="Custom Widget",
                    html='<div class="custom-xyz-widget">Custom content</div>',
                    css_classes=["custom-xyz-widget"],
                    css_rules=[],
                ),
            ],
            layouts=[],
            interactions=[],
            colors=ColorPalette(),
            typography=Typography(),
            spacing=Spacing(),
        )

    def test_extractor_accepts_library(self, pattern_library) -> None:
        """Extractor accepts pattern library in constructor."""
        extractor = PatternExtractor(
            claude_provider=None,
            gemini_provider=None,
            pattern_library=pattern_library,
        )
        assert extractor.pattern_library is pattern_library

    def test_validate_against_library(
        self,
        pattern_library,
        sample_catalog: PatternCatalog,
    ) -> None:
        """Validates components against library patterns."""
        extractor = PatternExtractor(pattern_library=pattern_library)
        matches = extractor.validate_against_library(sample_catalog)

        assert "comp-1" in matches
        assert "comp-2" in matches
        assert "comp-3" in matches

        # Navigation should have matches
        nav_matches = matches["comp-1"]
        assert len(nav_matches) > 0
        assert nav_matches[0][0].category == PatternCategory.NAVIGATION

        # Hero should have matches
        hero_matches = matches["comp-2"]
        assert len(hero_matches) > 0
        assert hero_matches[0][0].category == PatternCategory.HERO

    def test_enhance_catalog(
        self,
        pattern_library,
        sample_catalog: PatternCatalog,
    ) -> None:
        """Enhances catalog with library classifications."""
        extractor = PatternExtractor(pattern_library=pattern_library)
        enhanced = extractor.enhance_catalog(sample_catalog)

        # Navigation should be re-categorized
        nav_comp = next(c for c in enhanced.components if c.id == "comp-1")
        assert nav_comp.category == PatternCategory.NAVIGATION

        # Hero should be re-categorized
        hero_comp = next(c for c in enhanced.components if c.id == "comp-2")
        assert hero_comp.category == PatternCategory.HERO

        # Custom widget may remain unknown (no library match)
        custom_comp = next(c for c in enhanced.components if c.id == "comp-3")
        # This could stay UNKNOWN or be matched - depends on library

    def test_get_unmatched_components(
        self,
        pattern_library,
        sample_catalog: PatternCatalog,
    ) -> None:
        """Gets components without library matches."""
        extractor = PatternExtractor(pattern_library=pattern_library)
        unmatched = extractor.get_unmatched_components(sample_catalog)

        # Custom widget should be unmatched
        unmatched_ids = [c.id for c in unmatched]
        assert "comp-3" in unmatched_ids

    def test_no_library_returns_empty_matches(
        self,
        sample_catalog: PatternCatalog,
    ) -> None:
        """Without library, validate returns empty dict."""
        extractor = PatternExtractor()
        matches = extractor.validate_against_library(sample_catalog)
        assert matches == {}

    def test_no_library_enhance_returns_same(
        self,
        sample_catalog: PatternCatalog,
    ) -> None:
        """Without library, enhance returns same catalog."""
        extractor = PatternExtractor()
        enhanced = extractor.enhance_catalog(sample_catalog)
        assert enhanced.id == sample_catalog.id
        assert len(enhanced.components) == len(sample_catalog.components)

    def test_no_library_unmatched_returns_all(
        self,
        sample_catalog: PatternCatalog,
    ) -> None:
        """Without library, all components are unmatched."""
        extractor = PatternExtractor()
        unmatched = extractor.get_unmatched_components(sample_catalog)
        assert len(unmatched) == len(sample_catalog.components)

    @pytest.mark.asyncio
    async def test_extract_and_enhance(self, pattern_library) -> None:
        """Extract and enhance combines extraction with library enhancement."""
        mock_provider = MagicMock()
        mock_provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output=json.dumps({
                    "components": [
                        {
                            "category": "unknown",
                            "name": "Nav",
                            "html": '<nav class="navbar">Links</nav>',
                            "css_classes": ["navbar", "nav"],
                        }
                    ],
                    "layouts": [],
                    "interactions": [],
                    "colors": {},
                    "typography": {},
                    "spacing": {},
                }),
                model="gemini-2.0-flash-exp",
                provider="gemini",
                cost_usd=0.001,
            )
        )

        extractor = PatternExtractor(
            gemini_provider=mock_provider,
            pattern_library=pattern_library,
        )

        result = await extractor.extract_and_enhance(
            "<nav>Test</nav>",
            "test-template",
        )

        assert result.success
        assert result.catalog is not None
        # Component should be enhanced to NAVIGATION
        assert len(result.catalog.components) == 1
        assert result.catalog.components[0].category == PatternCategory.NAVIGATION

    @pytest.mark.asyncio
    async def test_convenience_function_with_enhance(self, pattern_library) -> None:
        """Convenience function supports enhance option."""
        mock_provider = MagicMock()
        mock_provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output=json.dumps({
                    "components": [
                        {
                            "category": "unknown",
                            "name": "Hero",
                            "html": '<section class="hero">Welcome</section>',
                            "css_classes": ["hero", "hero-section"],
                        }
                    ],
                    "layouts": [],
                    "interactions": [],
                    "colors": {},
                    "typography": {},
                    "spacing": {},
                }),
                model="gemini-2.0-flash-exp",
                provider="gemini",
                cost_usd=0.001,
            )
        )

        result = await extract_patterns(
            "<section>Test</section>",
            "test",
            gemini_provider=mock_provider,
            pattern_library=pattern_library,
            enhance=True,
        )

        assert result.success
        assert result.catalog is not None
        assert result.catalog.components[0].category == PatternCategory.HERO
