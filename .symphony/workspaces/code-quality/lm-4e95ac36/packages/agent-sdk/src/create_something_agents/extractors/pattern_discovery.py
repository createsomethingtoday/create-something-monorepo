"""
Pattern Discovery

Discover and learn new patterns from extractions.
When the library doesn't have a good match, the system can propose new patterns.

Philosophy: The library grows through use, not just curation.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING

from .types import PatternCategory, Component
from .pattern_library import (
    PatternLibrary,
    CanonicalPattern,
    PatternSignature,
    get_pattern_library,
)

if TYPE_CHECKING:
    from .types import PatternCatalog


@dataclass
class DiscoveredPattern:
    """A pattern discovered during extraction that doesn't match the library."""

    id: str
    suggested_name: str
    suggested_category: PatternCategory
    source_components: list[Component]  # Components that share this pattern
    common_classes: list[str]  # Classes that appear across sources
    common_css_properties: dict[str, list[str]]  # Properties with their common values
    common_structure: list[str]  # Structural hints derived from sources
    confidence: float  # How confident we are this is a real pattern
    discovered_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "proposed"  # proposed, confirmed, rejected

    def to_canonical_pattern(self) -> CanonicalPattern:
        """Convert discovered pattern to a canonical pattern."""
        return CanonicalPattern(
            id=self.id,
            name=self.suggested_name,
            category=self.suggested_category,
            description=f"Discovered pattern from {len(self.source_components)} components",
            signature=PatternSignature(
                class_hints=self.common_classes[:10],
                css_property_hints=self.common_css_properties,
                structure_hints=self.common_structure,
            ),
            tags=[self.suggested_category.value, "discovered"],
            confidence_threshold=0.5,  # Lower threshold for discovered patterns
        )


class PatternDiscovery:
    """
    Discovers new patterns from extractions.

    Works by:
    1. Tracking components that don't match existing library patterns well
    2. Clustering similar unmatched components
    3. Proposing new patterns based on clusters
    4. Allowing confirmation/rejection to refine the library
    """

    def __init__(self, library: PatternLibrary | None = None) -> None:
        self.library = library or get_pattern_library()
        self._unmatched_components: list[Component] = []
        self._discovered_patterns: dict[str, DiscoveredPattern] = {}
        self._discovery_counter = 0

    def process_extraction(
        self,
        catalog: "PatternCatalog",
        match_threshold: float = 0.5,
    ) -> list[DiscoveredPattern]:
        """
        Process an extraction catalog, identifying potential new patterns.

        Components that don't match any library pattern well are candidates
        for pattern discovery.
        """
        newly_discovered: list[DiscoveredPattern] = []

        for component in catalog.components:
            # Try to match against library
            matches = self.library.match_component(
                html=component.html,
                css_classes=component.tags,  # Using tags as proxy for classes
                css_properties={
                    rule.selector: str(rule.properties)
                    for rule in component.css_rules
                },
                element_type="",
            )

            best_match_score = matches[0][1] if matches else 0.0

            if best_match_score < match_threshold:
                # Poor match - candidate for discovery
                self._unmatched_components.append(component)

        # Try to cluster unmatched components into new patterns
        if len(self._unmatched_components) >= 2:
            discovered = self._cluster_into_patterns()
            for pattern in discovered:
                if pattern.id not in self._discovered_patterns:
                    self._discovered_patterns[pattern.id] = pattern
                    newly_discovered.append(pattern)

        return newly_discovered

    def _cluster_into_patterns(self) -> list[DiscoveredPattern]:
        """
        Cluster unmatched components into potential new patterns.

        Uses simple heuristics:
        - Components with similar class names
        - Components with similar structure
        - Components assigned similar categories by the LLM
        """
        discovered: list[DiscoveredPattern] = []

        # Group by LLM-assigned category
        by_category: dict[PatternCategory, list[Component]] = {}
        for comp in self._unmatched_components:
            if comp.category not in by_category:
                by_category[comp.category] = []
            by_category[comp.category].append(comp)

        for category, components in by_category.items():
            if len(components) < 2:
                continue

            # Find common characteristics
            all_tags: list[list[str]] = [c.tags for c in components]
            common_tags = self._find_common_strings(all_tags)

            if not common_tags:
                continue

            # Build discovered pattern
            self._discovery_counter += 1
            pattern_id = f"discovered-{category.value}-{self._discovery_counter}"

            # Derive structure hints from components
            structure_hints = self._derive_structure_hints(components)

            # Collect common CSS properties
            common_css = self._derive_common_css(components)

            discovered.append(
                DiscoveredPattern(
                    id=pattern_id,
                    suggested_name=f"{category.value.title()} Pattern (Discovered)",
                    suggested_category=category,
                    source_components=components,
                    common_classes=common_tags,
                    common_css_properties=common_css,
                    common_structure=structure_hints,
                    confidence=min(0.9, 0.3 + 0.1 * len(components)),  # More sources = more confidence
                )
            )

        return discovered

    def _find_common_strings(self, string_lists: list[list[str]]) -> list[str]:
        """Find strings that appear in multiple lists."""
        if not string_lists:
            return []

        # Count occurrences across lists
        counts: dict[str, int] = {}
        for strings in string_lists:
            seen_in_list: set[str] = set()
            for s in strings:
                s_lower = s.lower()
                if s_lower not in seen_in_list:
                    counts[s_lower] = counts.get(s_lower, 0) + 1
                    seen_in_list.add(s_lower)

        # Return strings that appear in at least half the lists
        threshold = max(2, len(string_lists) // 2)
        return [s for s, count in counts.items() if count >= threshold]

    def _derive_structure_hints(self, components: list[Component]) -> list[str]:
        """Derive structural hints from component HTML."""
        hints: list[str] = []

        # Check for common HTML elements
        element_checks = [
            ("<h1", "contains h1"),
            ("<h2", "contains h2"),
            ("<h3", "contains h3"),
            ("<img", "contains image"),
            ("<svg", "contains icon"),
            ("<button", "contains button"),
            ("<a ", "contains link"),
            ("<form", "contains form"),
            ("<input", "contains input"),
            ("<ul", "contains list"),
            ("<blockquote", "contains quote"),
        ]

        for check, hint in element_checks:
            count = sum(1 for c in components if check in c.html.lower())
            if count >= len(components) // 2:  # Present in at least half
                hints.append(hint)

        return hints

    def _derive_common_css(
        self, components: list[Component]
    ) -> dict[str, list[str]]:
        """Derive common CSS properties from components."""
        property_values: dict[str, list[str]] = {}

        for comp in components:
            for rule in comp.css_rules:
                for prop, value in rule.properties.items():
                    if prop not in property_values:
                        property_values[prop] = []
                    if value not in property_values[prop]:
                        property_values[prop].append(value)

        # Keep properties that appear in multiple components
        common: dict[str, list[str]] = {}
        for prop, values in property_values.items():
            if len(values) >= 2:  # At least 2 different uses
                common[prop] = values[:5]  # Limit to 5 values

        return common

    def confirm_pattern(self, pattern_id: str) -> bool:
        """
        Confirm a discovered pattern and add it to the library.

        Returns True if pattern was confirmed and added.
        """
        if pattern_id not in self._discovered_patterns:
            return False

        pattern = self._discovered_patterns[pattern_id]
        pattern.status = "confirmed"

        # Convert to canonical and add to library
        canonical = pattern.to_canonical_pattern()
        self.library.add_pattern(canonical)

        return True

    def reject_pattern(self, pattern_id: str) -> bool:
        """
        Reject a discovered pattern.

        Returns True if pattern was rejected.
        """
        if pattern_id not in self._discovered_patterns:
            return False

        pattern = self._discovered_patterns[pattern_id]
        pattern.status = "rejected"
        return True

    def get_proposed_patterns(self) -> list[DiscoveredPattern]:
        """Get all patterns with 'proposed' status."""
        return [
            p for p in self._discovered_patterns.values() if p.status == "proposed"
        ]

    def get_all_discovered(self) -> list[DiscoveredPattern]:
        """Get all discovered patterns regardless of status."""
        return list(self._discovered_patterns.values())

    def clear_unmatched(self) -> None:
        """Clear the unmatched components buffer."""
        self._unmatched_components = []

    def export_discoveries(self) -> dict:
        """Export all discovered patterns as a dictionary."""
        return {
            "discovered_patterns": [
                {
                    "id": p.id,
                    "name": p.suggested_name,
                    "category": p.suggested_category.value,
                    "common_classes": p.common_classes,
                    "common_css": p.common_css_properties,
                    "structure_hints": p.common_structure,
                    "confidence": p.confidence,
                    "status": p.status,
                    "discovered_at": p.discovered_at,
                    "source_count": len(p.source_components),
                }
                for p in self._discovered_patterns.values()
            ]
        }

    def import_discoveries(self, data: dict) -> int:
        """
        Import previously exported discoveries.

        Returns count of patterns imported.
        """
        count = 0
        for p_data in data.get("discovered_patterns", []):
            pattern = DiscoveredPattern(
                id=p_data["id"],
                suggested_name=p_data["name"],
                suggested_category=PatternCategory(p_data["category"]),
                source_components=[],  # Can't restore components
                common_classes=p_data["common_classes"],
                common_css_properties=p_data["common_css"],
                common_structure=p_data["structure_hints"],
                confidence=p_data["confidence"],
                discovered_at=p_data.get("discovered_at", ""),
                status=p_data.get("status", "proposed"),
            )
            self._discovered_patterns[pattern.id] = pattern
            count += 1
        return count


class PatternLearningAgent:
    """
    Agent that actively learns patterns from multiple extractions.

    Workflow:
    1. Process multiple template extractions
    2. Identify recurring patterns not in library
    3. Propose new patterns to user/admin
    4. Upon confirmation, add to library
    5. Library grows more accurate over time
    """

    def __init__(
        self,
        library: PatternLibrary | None = None,
        auto_confirm_threshold: float = 0.85,
    ) -> None:
        self.library = library or get_pattern_library()
        self.discovery = PatternDiscovery(self.library)
        self.auto_confirm_threshold = auto_confirm_threshold
        self._processed_count = 0

    def learn_from_catalog(
        self,
        catalog: "PatternCatalog",
        auto_confirm: bool = False,
    ) -> dict:
        """
        Learn from a single catalog extraction.

        Returns summary of learning session.
        """
        self._processed_count += 1

        # Process the extraction for new patterns
        newly_discovered = self.discovery.process_extraction(catalog)

        # Auto-confirm high-confidence patterns if enabled
        auto_confirmed: list[str] = []
        if auto_confirm:
            for pattern in newly_discovered:
                if pattern.confidence >= self.auto_confirm_threshold:
                    self.discovery.confirm_pattern(pattern.id)
                    auto_confirmed.append(pattern.id)

        return {
            "catalog_id": catalog.id,
            "components_processed": len(catalog.components),
            "newly_discovered": len(newly_discovered),
            "auto_confirmed": auto_confirmed,
            "proposed_patterns": [p.id for p in self.discovery.get_proposed_patterns()],
            "library_size": len(self.library.all_patterns()),
            "total_processed": self._processed_count,
        }

    def learn_from_catalogs(
        self,
        catalogs: list["PatternCatalog"],
        auto_confirm: bool = False,
    ) -> dict:
        """
        Learn from multiple catalogs.

        Processing multiple templates together improves pattern discovery
        by finding recurring patterns across sources.
        """
        total_components = 0
        all_discovered: list[str] = []
        all_confirmed: list[str] = []

        for catalog in catalogs:
            result = self.learn_from_catalog(catalog, auto_confirm=False)
            total_components += result["components_processed"]
            all_discovered.extend(result["proposed_patterns"])

        # After processing all, auto-confirm high-confidence patterns
        if auto_confirm:
            for pattern in self.discovery.get_proposed_patterns():
                if pattern.confidence >= self.auto_confirm_threshold:
                    self.discovery.confirm_pattern(pattern.id)
                    all_confirmed.append(pattern.id)

        return {
            "catalogs_processed": len(catalogs),
            "total_components": total_components,
            "patterns_discovered": len(set(all_discovered)),
            "patterns_confirmed": all_confirmed,
            "proposed_patterns": [p.id for p in self.discovery.get_proposed_patterns()],
            "library_size": len(self.library.all_patterns()),
        }

    def get_learning_summary(self) -> str:
        """Get a human-readable summary of learning progress."""
        proposed = self.discovery.get_proposed_patterns()
        all_discovered = self.discovery.get_all_discovered()
        confirmed = [p for p in all_discovered if p.status == "confirmed"]
        rejected = [p for p in all_discovered if p.status == "rejected"]

        lines = [
            "# Pattern Learning Summary",
            "",
            f"**Catalogs Processed:** {self._processed_count}",
            f"**Library Size:** {len(self.library.all_patterns())} patterns",
            "",
            "## Discovered Patterns",
            f"- Proposed: {len(proposed)}",
            f"- Confirmed: {len(confirmed)}",
            f"- Rejected: {len(rejected)}",
            "",
        ]

        if proposed:
            lines.append("### Proposed Patterns (Awaiting Review)")
            for p in proposed:
                lines.append(
                    f"- **{p.suggested_name}** ({p.suggested_category.value}) "
                    f"- confidence: {p.confidence:.0%}"
                )

        return "\n".join(lines)
