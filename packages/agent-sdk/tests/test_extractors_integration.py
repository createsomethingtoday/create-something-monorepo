"""
Integration Tests for Pattern Extractors

These tests can run against real providers when API keys are available.
Run with: pytest tests/test_extractors_integration.py -v -s

Environment variables:
- GOOGLE_API_KEY or GEMINI_API_KEY: Enable Gemini tests
- ANTHROPIC_API_KEY: Enable Claude fallback tests

Skip all integration tests: pytest tests/test_extractors_integration.py -m "not integration"
"""

import os
import json
import pytest
from pathlib import Path

from create_something_agents.extractors import (
    PatternExtractor,
    PatternCatalog,
    PatternCategory,
    InteractionType,
    extract_patterns,
)


# Check for API keys
HAS_GEMINI = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
HAS_ANTHROPIC = bool(os.environ.get("ANTHROPIC_API_KEY"))


def get_fixture_path(name: str) -> Path:
    """Get path to a test fixture."""
    return Path(__file__).parent / "fixtures" / name


def load_fixture(name: str) -> str:
    """Load a test fixture file."""
    path = get_fixture_path(name)
    if not path.exists():
        pytest.skip(f"Fixture {name} not found at {path}")
    return path.read_text()


class TestFixtureExtraction:
    """Test extraction with local fixtures (mocked providers)."""

    @pytest.fixture
    def sample_template(self) -> str:
        """Load the sample Webflow portfolio template."""
        return load_fixture("webflow_portfolio_template.html")

    def test_fixture_loads(self, sample_template: str) -> None:
        """Verify fixture loads correctly."""
        assert len(sample_template) > 1000
        assert "hero-section" in sample_template
        assert "feature-card" in sample_template
        assert "testimonial" in sample_template
        assert "w-footer" in sample_template

    def test_fixture_has_css(self, sample_template: str) -> None:
        """Verify fixture contains embedded CSS."""
        assert "<style>" in sample_template
        assert "var(--color-primary)" in sample_template
        assert "transition:" in sample_template
        assert "@keyframes" in sample_template

    def test_fixture_has_interactions(self, sample_template: str) -> None:
        """Verify fixture contains interaction patterns."""
        assert ":hover" in sample_template
        assert "translateY" in sample_template
        assert "ease" in sample_template

    def test_fixture_has_responsive(self, sample_template: str) -> None:
        """Verify fixture contains responsive breakpoints."""
        assert "@media" in sample_template
        assert "768px" in sample_template
        assert "1024px" in sample_template


@pytest.mark.integration
@pytest.mark.skipif(not HAS_GEMINI, reason="GOOGLE_API_KEY not set")
class TestGeminiExtraction:
    """Test real extraction with Gemini provider."""

    @pytest.fixture
    def gemini_provider(self):
        """Create real Gemini provider."""
        from create_something_agents.providers.gemini import GeminiProvider
        return GeminiProvider()

    @pytest.fixture
    def sample_template(self) -> str:
        """Load the sample Webflow portfolio template."""
        return load_fixture("webflow_portfolio_template.html")

    @pytest.mark.asyncio
    async def test_full_extraction(
        self,
        gemini_provider,
        sample_template: str,
    ) -> None:
        """Test full pattern extraction with Gemini.

        This test runs against the real Gemini API.
        Cost estimate: ~$0.001 (Flash model)
        """
        extractor = PatternExtractor(gemini_provider=gemini_provider)
        result = await extractor.extract(
            sample_template,
            template_name="webflow-portfolio-sample",
        )

        # Should succeed
        assert result.success, f"Extraction failed: {result.error}"
        assert result.catalog is not None

        # Should use Gemini
        assert result.provider_used == "gemini"
        assert "gemini" in result.model_used.lower()

        # Should extract components
        assert len(result.catalog.components) > 0
        print(f"\nExtracted {len(result.catalog.components)} components:")
        for comp in result.catalog.components:
            print(f"  - [{comp.category.value}] {comp.name}")

        # Should extract layouts
        assert len(result.catalog.layouts) > 0
        print(f"\nExtracted {len(result.catalog.layouts)} layouts:")
        for layout in result.catalog.layouts:
            print(f"  - [{layout.type}] {layout.name}")

        # Should extract interactions
        assert len(result.catalog.interactions) > 0
        print(f"\nExtracted {len(result.catalog.interactions)} interactions:")
        for interaction in result.catalog.interactions:
            print(f"  - [{interaction.type.value}] {interaction.trigger}")

        # Should extract colors
        assert result.catalog.colors is not None
        if result.catalog.colors.all_colors:
            print(f"\nExtracted {len(result.catalog.colors.all_colors)} colors:")
            for color in result.catalog.colors.all_colors[:5]:
                print(f"  - {color}")

        # Should extract typography
        assert result.catalog.typography is not None
        if result.catalog.typography.font_families:
            print(f"\nExtracted fonts: {result.catalog.typography.font_families}")

        # Should track cost
        assert result.cost_usd >= 0
        print(f"\nExtraction cost: ${result.cost_usd:.4f}")
        print(f"Extraction time: {result.extraction_time_ms:.0f}ms")

    @pytest.mark.asyncio
    async def test_component_categories(
        self,
        gemini_provider,
        sample_template: str,
    ) -> None:
        """Verify expected component categories are extracted."""
        extractor = PatternExtractor(gemini_provider=gemini_provider)
        result = await extractor.extract(sample_template, "test-template")

        assert result.success
        catalog = result.catalog

        # Get unique categories
        categories = set(c.category for c in catalog.components)
        print(f"\nCategories found: {[c.value for c in categories]}")

        # Should find at least navigation, hero, and footer
        expected = {PatternCategory.NAVIGATION, PatternCategory.HERO, PatternCategory.FOOTER}
        found = categories & expected
        assert len(found) >= 2, f"Expected at least 2 of {expected}, found {found}"

    @pytest.mark.asyncio
    async def test_catalog_search(
        self,
        gemini_provider,
        sample_template: str,
    ) -> None:
        """Test searching extracted catalog."""
        extractor = PatternExtractor(gemini_provider=gemini_provider)
        result = await extractor.extract(sample_template, "test-template")

        assert result.success
        catalog = result.catalog

        # Search for card components
        cards = catalog.search_components("card")
        print(f"\nSearch 'card' found: {[c.name for c in cards]}")

        # Search for feature components
        features = catalog.search_components("feature")
        print(f"Search 'feature' found: {[c.name for c in features]}")

        # Get components by category
        heroes = catalog.get_components_by_category(PatternCategory.HERO)
        print(f"Hero components: {[h.name for h in heroes]}")

    @pytest.mark.asyncio
    async def test_catalog_serialization(
        self,
        gemini_provider,
        sample_template: str,
    ) -> None:
        """Verify catalog can be serialized to JSON."""
        extractor = PatternExtractor(gemini_provider=gemini_provider)
        result = await extractor.extract(sample_template, "test-template")

        assert result.success

        # Serialize to dict
        data = result.catalog.to_dict()

        # Should be JSON serializable
        json_str = json.dumps(data, indent=2)
        assert len(json_str) > 100

        # Should preserve structure
        parsed = json.loads(json_str)
        assert "components" in parsed
        assert "layouts" in parsed
        assert "colors" in parsed

        print(f"\nCatalog serializes to {len(json_str)} characters")


@pytest.mark.integration
@pytest.mark.skipif(not HAS_GEMINI, reason="GOOGLE_API_KEY not set")
class TestExtractionPromptQuality:
    """Test the quality of extraction prompts."""

    @pytest.fixture
    def gemini_provider(self):
        """Create real Gemini provider."""
        from create_something_agents.providers.gemini import GeminiProvider
        return GeminiProvider()

    @pytest.mark.asyncio
    async def test_minimal_template(self, gemini_provider) -> None:
        """Test extraction on minimal HTML."""
        minimal_html = """
<!DOCTYPE html>
<html>
<head>
    <style>
        .hero { padding: 4rem; background: #1a1a1a; color: white; }
        .btn { padding: 1rem 2rem; background: blue; color: white; border-radius: 4px; }
        .btn:hover { background: darkblue; }
    </style>
</head>
<body>
    <section class="hero">
        <h1>Welcome</h1>
        <p>A simple hero section</p>
        <a href="#" class="btn">Get Started</a>
    </section>
</body>
</html>
"""
        extractor = PatternExtractor(gemini_provider=gemini_provider)
        result = await extractor.extract(minimal_html, "minimal")

        assert result.success
        assert result.catalog is not None
        assert len(result.catalog.components) >= 1

        # Should identify hero
        heroes = result.catalog.get_components_by_category(PatternCategory.HERO)
        print(f"\nMinimal template - Hero components: {len(heroes)}")

        # Should capture colors
        if result.catalog.colors:
            print(f"Colors found: {result.catalog.colors.all_colors}")

    @pytest.mark.asyncio
    async def test_complex_interactions(self, gemini_provider) -> None:
        """Test extraction of complex CSS interactions."""
        complex_html = """
<!DOCTYPE html>
<html>
<head>
    <style>
        .card {
            padding: 2rem;
            border-radius: 8px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .pulse { animation: pulse 2s infinite; }
    </style>
</head>
<body>
    <div class="card fade-in">
        <h3>Feature Card</h3>
        <p>With hover and animation</p>
        <button class="pulse">Learn More</button>
    </div>
</body>
</html>
"""
        extractor = PatternExtractor(gemini_provider=gemini_provider)
        result = await extractor.extract(complex_html, "complex-interactions")

        assert result.success
        print(f"\nExtracted {len(result.catalog.interactions)} interactions:")
        for i in result.catalog.interactions:
            print(f"  - [{i.type.value}] {i.trigger}")
            if i.keyframes:
                print(f"    Keyframes: {i.keyframes[:50]}...")


@pytest.mark.integration
@pytest.mark.skipif(not HAS_ANTHROPIC, reason="ANTHROPIC_API_KEY not set")
class TestClaudeFallback:
    """Test Claude fallback when Gemini unavailable."""

    @pytest.fixture
    def claude_provider(self):
        """Create real Claude provider."""
        from create_something_agents.providers.claude import ClaudeProvider
        return ClaudeProvider()

    @pytest.mark.asyncio
    async def test_claude_extraction(self, claude_provider) -> None:
        """Test extraction using Claude as fallback."""
        simple_html = """
<!DOCTYPE html>
<html>
<head><style>.hero { padding: 4rem; }</style></head>
<body><section class="hero"><h1>Test</h1></section></body>
</html>
"""
        extractor = PatternExtractor(claude_provider=claude_provider)
        result = await extractor.extract(simple_html, "claude-test")

        assert result.success
        assert result.provider_used == "claude"
        print(f"\nClaude extraction cost: ${result.cost_usd:.4f}")


class TestCatalogUsage:
    """Test practical PatternCatalog usage patterns."""

    @pytest.fixture
    def sample_catalog(self) -> PatternCatalog:
        """Create a sample catalog for testing usage patterns."""
        from create_something_agents.extractors.types import (
            Component, LayoutPattern, Interaction, CSSRule,
            ColorPalette, Typography, Spacing,
        )

        return PatternCatalog(
            id="cat_sample",
            name="Sample Portfolio Patterns",
            source_templates=["webflow_portfolio_template.html"],
            components=[
                Component(
                    id="comp_nav",
                    category=PatternCategory.NAVIGATION,
                    name="Sticky Navigation",
                    html="<nav class='w-nav'>...</nav>",
                    css_classes=["w-nav", "w-nav-container", "w-nav-brand"],
                    description="Fixed navigation with backdrop blur",
                    tags=["navigation", "sticky", "transparent"],
                ),
                Component(
                    id="comp_hero",
                    category=PatternCategory.HERO,
                    name="Split Hero",
                    html="<section class='hero-section'>...</section>",
                    css_classes=["hero-section", "hero-container", "hero-content"],
                    description="Two-column hero with image and content",
                    tags=["hero", "split-layout", "image"],
                ),
                Component(
                    id="comp_features",
                    category=PatternCategory.FEATURE,
                    name="Feature Cards Grid",
                    html="<div class='features-grid'>...</div>",
                    css_classes=["features-grid", "feature-card"],
                    description="Three-column responsive feature cards",
                    tags=["features", "cards", "grid"],
                ),
                Component(
                    id="comp_testimonials",
                    category=PatternCategory.TESTIMONIAL,
                    name="Testimonial Carousel",
                    html="<div class='testimonials-grid'>...</div>",
                    css_classes=["testimonials-grid", "testimonial-card"],
                    description="Client testimonials with avatars",
                    tags=["testimonials", "social-proof", "carousel"],
                ),
                Component(
                    id="comp_cta",
                    category=PatternCategory.CTA,
                    name="Full-Width CTA",
                    html="<section class='cta-section'>...</section>",
                    css_classes=["cta-section", "cta-container"],
                    description="Dark background call-to-action section",
                    tags=["cta", "conversion", "dark"],
                ),
                Component(
                    id="comp_footer",
                    category=PatternCategory.FOOTER,
                    name="Multi-Column Footer",
                    html="<footer class='w-footer'>...</footer>",
                    css_classes=["w-footer", "footer-grid", "footer-links"],
                    description="Four-column footer with social links",
                    tags=["footer", "multi-column", "social"],
                ),
            ],
            layouts=[
                LayoutPattern(
                    id="layout_hero",
                    name="Split Hero Grid",
                    type="grid",
                    columns=2,
                    css_rules=[
                        CSSRule(
                            selector=".hero-container",
                            properties={
                                "display": "grid",
                                "grid-template-columns": "1fr 1fr",
                                "gap": "4rem",
                            },
                        ),
                    ],
                    breakpoints={
                        "1024px": {"columns": 1},
                    },
                    description="Two-column hero that stacks on mobile",
                ),
                LayoutPattern(
                    id="layout_features",
                    name="Three-Column Features",
                    type="grid",
                    columns=3,
                    css_rules=[
                        CSSRule(
                            selector=".features-grid",
                            properties={
                                "display": "grid",
                                "grid-template-columns": "repeat(3, 1fr)",
                                "gap": "2rem",
                            },
                        ),
                    ],
                    breakpoints={
                        "1024px": {"columns": 2},
                        "768px": {"columns": 1},
                    },
                    description="Responsive feature grid 3→2→1 columns",
                ),
            ],
            interactions=[
                Interaction(
                    type=InteractionType.HOVER,
                    trigger=".feature-card:hover",
                    css_rules=[
                        CSSRule(
                            selector=".feature-card:hover",
                            properties={
                                "transform": "translateY(-8px)",
                                "box-shadow": "0 20px 40px rgba(0,0,0,0.1)",
                            },
                        ),
                    ],
                    duration="0.3s",
                    easing="ease",
                    description="Card lift on hover",
                ),
                Interaction(
                    type=InteractionType.FADE,
                    trigger=".hero-content",
                    keyframes="@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }",
                    duration="0.8s",
                    easing="ease-out",
                    description="Hero content fade-in animation",
                ),
            ],
            colors=ColorPalette(
                primary="#1a1a1a",
                secondary="#333333",
                accent="#6366f1",
                background="#ffffff",
                text="#111111",
                muted="#666666",
                border="#e5e7eb",
                all_colors=["#1a1a1a", "#333333", "#6366f1", "#ffffff", "#111111", "#666666", "#e5e7eb", "#f8f9fa"],
            ),
            typography=Typography(
                font_families=["Inter", "Playfair Display", "sans-serif", "Georgia", "serif"],
                heading_sizes=["clamp(2.5rem, 5vw, 4rem)", "clamp(2rem, 4vw, 2.75rem)", "1.5rem", "1.25rem"],
                body_size="1rem",
                line_heights=["1.1", "1.6", "1.7"],
                font_weights=["400", "500", "600", "700"],
            ),
            spacing=Spacing(
                padding_values=["0.5rem", "1rem", "2rem", "4rem", "6rem"],
                margin_values=["0", "0.5rem", "1rem", "1.5rem", "2rem"],
                gap_values=["1rem", "2rem", "3rem", "4rem"],
            ),
        )

    def test_catalog_summary(self, sample_catalog: PatternCatalog) -> None:
        """Test catalog summary generation."""
        summary = sample_catalog.summary()
        print(f"\n{summary}")

        assert "Sample Portfolio Patterns" in summary
        assert "Components: 6" in summary

    def test_filter_by_category(self, sample_catalog: PatternCatalog) -> None:
        """Test filtering components by category."""
        heroes = sample_catalog.get_components_by_category(PatternCategory.HERO)
        assert len(heroes) == 1
        assert heroes[0].name == "Split Hero"

        features = sample_catalog.get_components_by_category(PatternCategory.FEATURE)
        assert len(features) == 1

    def test_search_by_tag(self, sample_catalog: PatternCatalog) -> None:
        """Test searching components by tag."""
        results = sample_catalog.search_components("grid")
        assert len(results) == 1
        assert results[0].name == "Feature Cards Grid"

        results = sample_catalog.search_components("dark")
        assert len(results) == 1
        assert results[0].category == PatternCategory.CTA

    def test_search_by_description(self, sample_catalog: PatternCatalog) -> None:
        """Test searching components by description."""
        results = sample_catalog.search_components("avatar")
        assert len(results) == 1
        assert results[0].category == PatternCategory.TESTIMONIAL

    def test_get_all_css_rules(self, sample_catalog: PatternCatalog) -> None:
        """Test extracting all CSS rules from catalog."""
        all_rules = []

        for layout in sample_catalog.layouts:
            all_rules.extend(layout.css_rules)

        for interaction in sample_catalog.interactions:
            all_rules.extend(interaction.css_rules)

        assert len(all_rules) >= 3  # 2 layouts + 1 interaction = 3 rules
        print(f"\nExtracted {len(all_rules)} CSS rules")
        for rule in all_rules:
            print(f"  {rule.selector}")

    def test_serialize_and_restore(self, sample_catalog: PatternCatalog) -> None:
        """Test full serialization roundtrip."""
        # Serialize
        data = sample_catalog.to_dict()
        json_str = json.dumps(data)

        # Restore
        restored_data = json.loads(json_str)

        # Verify structure preserved
        assert len(restored_data["components"]) == 6
        assert len(restored_data["layouts"]) == 2
        assert len(restored_data["interactions"]) == 2
        assert restored_data["colors"]["accent"] == "#6366f1"

        print(f"\nSerialized catalog: {len(json_str)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
