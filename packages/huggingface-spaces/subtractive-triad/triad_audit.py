"""
Subtractive Triad Audit - Core Analysis Engine

The Subtractive Triad applies one principle—subtractive revelation—at three scales:
1. DRY (Implementation): "Have I built this before?" → Unify
2. Rams (Artifact): "Does this earn its existence?" → Remove
3. Heidegger (System): "Does this serve the whole?" → Reconnect

Truth emerges through disciplined removal at every level of abstraction.
"""

import re
import ast
from dataclasses import dataclass, field
from typing import Optional
from collections import defaultdict
from difflib import SequenceMatcher


@dataclass
class Violation:
    """A single violation found during analysis."""
    level: str  # 'dry', 'rams', 'heidegger'
    severity: str  # 'critical', 'high', 'medium', 'low'
    message: str
    location: Optional[str] = None
    suggestion: Optional[str] = None


@dataclass
class LevelResult:
    """Results for a single level of the triad."""
    score: float  # 0-10
    violations: list[Violation] = field(default_factory=list)
    commendations: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


@dataclass
class AuditResult:
    """Complete audit result across all three levels."""
    dry: LevelResult
    rams: LevelResult
    heidegger: LevelResult
    overall_score: float
    summary: str

    @property
    def total_violations(self) -> int:
        return len(self.dry.violations) + len(self.rams.violations) + len(self.heidegger.violations)


def analyze_dry(code: str, filename: str = "code.py") -> LevelResult:
    """
    DRY Analysis: "Have I built this before?"

    Detects:
    - Duplicate code blocks (similar sequences)
    - Repeated string literals
    - Duplicate constant definitions
    - Similar function patterns
    """
    violations = []
    commendations = []
    metrics = {
        "duplicate_blocks": 0,
        "repeated_literals": 0,
        "duplication_percentage": 0.0
    }

    lines = code.split('\n')

    # --- Detect repeated string literals ---
    string_pattern = r'["\']([^"\']{10,})["\']'
    strings = re.findall(string_pattern, code)
    string_counts = defaultdict(int)
    for s in strings:
        string_counts[s] += 1

    repeated = {s: count for s, count in string_counts.items() if count >= 3}
    metrics["repeated_literals"] = len(repeated)

    for literal, count in repeated.items():
        truncated = literal[:40] + "..." if len(literal) > 40 else literal
        violations.append(Violation(
            level="dry",
            severity="medium",
            message=f'String literal repeated {count} times: "{truncated}"',
            suggestion="Extract to a constant or configuration"
        ))

    # --- Detect duplicate code blocks (5+ similar lines) ---
    min_block_size = 5
    seen_blocks = {}

    for i in range(len(lines) - min_block_size + 1):
        block = '\n'.join(lines[i:i + min_block_size]).strip()
        if len(block) < 50:  # Skip trivial blocks
            continue

        # Normalize whitespace for comparison
        normalized = re.sub(r'\s+', ' ', block)

        if normalized in seen_blocks:
            original_line = seen_blocks[normalized]
            if abs(i - original_line) > min_block_size:  # Not overlapping
                metrics["duplicate_blocks"] += 1
                violations.append(Violation(
                    level="dry",
                    severity="high",
                    message=f"Duplicate code block found",
                    location=f"Lines {original_line + 1}-{original_line + min_block_size} and {i + 1}-{i + min_block_size}",
                    suggestion="Extract to a shared function or module"
                ))
        else:
            seen_blocks[normalized] = i

    # --- Detect similar function bodies ---
    try:
        tree = ast.parse(code)
        functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]

        for i, func1 in enumerate(functions):
            for func2 in functions[i + 1:]:
                body1 = ast.dump(func1.body[0]) if func1.body else ""
                body2 = ast.dump(func2.body[0]) if func2.body else ""

                similarity = SequenceMatcher(None, body1, body2).ratio()
                if similarity > 0.8 and len(body1) > 100:
                    violations.append(Violation(
                        level="dry",
                        severity="medium",
                        message=f"Functions '{func1.name}' and '{func2.name}' are {int(similarity * 100)}% similar",
                        suggestion="Consider extracting shared logic to a helper function"
                    ))
    except SyntaxError:
        pass  # Not valid Python, skip AST analysis

    # --- Calculate score ---
    total_lines = len(lines)
    duplicate_lines = metrics["duplicate_blocks"] * min_block_size
    metrics["duplication_percentage"] = (duplicate_lines / max(total_lines, 1)) * 100

    penalty = min(5, metrics["duplication_percentage"] / 5)
    penalty += min(2, len(repeated) * 0.5)
    score = max(0, 10 - penalty)

    # --- Commendations ---
    if metrics["duplicate_blocks"] == 0 and len(repeated) == 0:
        commendations.append("No significant duplication detected - code is well-factored")

    return LevelResult(score=round(score, 1), violations=violations,
                       commendations=commendations, metrics=metrics)


def analyze_rams(code: str, filename: str = "code.py") -> LevelResult:
    """
    Rams Analysis: "Does this earn its existence?"

    Dieter Rams' principle: Weniger, aber besser (Less, but better)

    Detects:
    - Unused imports
    - Unused variables/functions
    - Dead code (unreachable)
    - Overly complex expressions
    - Empty/stub functions
    - Excessive comments (code should be self-documenting)
    """
    violations = []
    commendations = []
    metrics = {
        "unused_imports": 0,
        "unused_variables": 0,
        "dead_functions": 0,
        "complexity_issues": 0,
        "lines_of_code": 0,
        "comment_ratio": 0.0
    }

    lines = code.split('\n')
    metrics["lines_of_code"] = len([l for l in lines if l.strip() and not l.strip().startswith('#')])

    # --- Count comments ---
    comment_lines = len([l for l in lines if l.strip().startswith('#')])
    metrics["comment_ratio"] = comment_lines / max(len(lines), 1)

    if metrics["comment_ratio"] > 0.3:
        violations.append(Violation(
            level="rams",
            severity="low",
            message=f"High comment ratio ({int(metrics['comment_ratio'] * 100)}%) - code may not be self-documenting",
            suggestion="Refactor to make code intentions clear through naming and structure"
        ))

    try:
        tree = ast.parse(code)

        # --- Collect all defined names ---
        defined_names = set()
        used_names = set()
        imported_names = set()
        function_names = set()
        called_functions = set()

        for node in ast.walk(tree):
            # Track imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    imported_names.add(name)
                    defined_names.add(name)
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    imported_names.add(name)
                    defined_names.add(name)

            # Track function definitions
            elif isinstance(node, ast.FunctionDef):
                function_names.add(node.name)
                defined_names.add(node.name)
                # Check for empty/stub functions
                if len(node.body) == 1:
                    if isinstance(node.body[0], ast.Pass):
                        violations.append(Violation(
                            level="rams",
                            severity="medium",
                            message=f"Empty function '{node.name}' - does it earn its existence?",
                            location=f"Line {node.lineno}",
                            suggestion="Implement or remove"
                        ))
                    elif isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant):
                        if node.body[0].value.value == "...":
                            violations.append(Violation(
                                level="rams",
                                severity="low",
                                message=f"Stub function '{node.name}' with ellipsis",
                                location=f"Line {node.lineno}",
                                suggestion="Implement or document why it exists"
                            ))

            # Track variable assignments
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        defined_names.add(target.id)

            # Track name usage
            elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                used_names.add(node.id)

            # Track function calls
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    called_functions.add(node.func.id)
                elif isinstance(node.func, ast.Attribute):
                    called_functions.add(node.func.attr)

        # --- Find unused imports ---
        unused_imports = imported_names - used_names
        # Filter out common false positives
        unused_imports = {name for name in unused_imports
                         if not name.startswith('_') and name not in ['typing', 'annotations']}

        metrics["unused_imports"] = len(unused_imports)
        for name in unused_imports:
            violations.append(Violation(
                level="rams",
                severity="medium",
                message=f"Unused import: '{name}'",
                suggestion="Remove if not needed"
            ))

        # --- Find potentially unused functions (not called internally) ---
        # Exclude special methods and likely public API
        internal_functions = {f for f in function_names
                            if not f.startswith('_') and f not in called_functions}
        # Only flag if there are many internal unused functions (likely dead code)
        if len(internal_functions) > 3:
            metrics["dead_functions"] = len(internal_functions)
            for name in list(internal_functions)[:3]:  # Limit to 3 examples
                violations.append(Violation(
                    level="rams",
                    severity="low",
                    message=f"Function '{name}' not called internally - verify it's needed",
                    suggestion="Remove if dead code, or document if public API"
                ))

        # --- Check for overly complex expressions ---
        for node in ast.walk(tree):
            # Nested ternaries
            if isinstance(node, ast.IfExp):
                if isinstance(node.body, ast.IfExp) or isinstance(node.orelse, ast.IfExp):
                    metrics["complexity_issues"] += 1
                    violations.append(Violation(
                        level="rams",
                        severity="medium",
                        message="Nested ternary expression - hard to read",
                        location=f"Line {node.lineno}",
                        suggestion="Refactor to if/else statement for clarity"
                    ))

            # Deeply nested structures (>4 levels)
            if isinstance(node, (ast.If, ast.For, ast.While, ast.With)):
                depth = 0
                parent = node
                for ancestor in ast.walk(tree):
                    if isinstance(ancestor, (ast.If, ast.For, ast.While, ast.With)):
                        depth += 1
                if depth > 4:
                    metrics["complexity_issues"] += 1
                    violations.append(Violation(
                        level="rams",
                        severity="high",
                        message="Deeply nested code structure (>4 levels)",
                        location=f"Line {node.lineno}",
                        suggestion="Extract inner logic to separate functions"
                    ))
                    break

    except SyntaxError:
        pass  # Not valid Python

    # --- Calculate score ---
    penalty = min(3, metrics["unused_imports"] * 0.5)
    penalty += min(2, metrics["dead_functions"] * 0.3)
    penalty += min(2, metrics["complexity_issues"] * 0.5)
    score = max(0, 10 - penalty)

    # --- Commendations ---
    if metrics["unused_imports"] == 0:
        commendations.append("All imports are used - no dead weight")
    if metrics["complexity_issues"] == 0:
        commendations.append("Code complexity is well-managed")

    return LevelResult(score=round(score, 1), violations=violations,
                       commendations=commendations, metrics=metrics)


def analyze_heidegger(code: str, filename: str = "code.py") -> LevelResult:
    """
    Heidegger Analysis: "Does this serve the whole?"

    The hermeneutic circle: parts must serve the whole, and the whole
    gives meaning to the parts.

    Detects:
    - Orphaned code (functions that don't connect to anything)
    - Missing module documentation
    - Inconsistent naming conventions
    - Violation of single responsibility
    - Import structure (is this module well-connected?)
    """
    violations = []
    commendations = []
    metrics = {
        "has_docstring": False,
        "naming_consistency": 0.0,
        "cohesion_score": 0.0,
        "import_count": 0,
        "export_count": 0
    }

    lines = code.split('\n')

    # --- Check for module docstring ---
    stripped = code.strip()
    if stripped.startswith('"""') or stripped.startswith("'''"):
        metrics["has_docstring"] = True
        commendations.append("Module has documentation - context for understanding")
    else:
        violations.append(Violation(
            level="heidegger",
            severity="low",
            message="Missing module docstring",
            suggestion="Add a docstring explaining the module's purpose in the whole"
        ))

    try:
        tree = ast.parse(code)

        # --- Analyze naming conventions ---
        function_names = []
        class_names = []
        variable_names = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                function_names.append(node.name)
            elif isinstance(node, ast.ClassDef):
                class_names.append(node.name)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        variable_names.append(target.id)

        # Check snake_case for functions
        snake_case_funcs = sum(1 for f in function_names if re.match(r'^[a-z_][a-z0-9_]*$', f) or f.startswith('_'))
        # Check PascalCase for classes
        pascal_case_classes = sum(1 for c in class_names if re.match(r'^[A-Z][a-zA-Z0-9]*$', c))

        total_named = len(function_names) + len(class_names)
        if total_named > 0:
            correct = snake_case_funcs + pascal_case_classes
            metrics["naming_consistency"] = correct / total_named

            if metrics["naming_consistency"] < 0.8:
                violations.append(Violation(
                    level="heidegger",
                    severity="medium",
                    message=f"Inconsistent naming conventions ({int(metrics['naming_consistency'] * 100)}% consistent)",
                    suggestion="Use snake_case for functions, PascalCase for classes"
                ))

        # --- Analyze imports (connection to the whole) ---
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)

        metrics["import_count"] = len(imports)

        # Standard library vs third-party analysis
        stdlib_pattern = r'^(os|sys|re|json|typing|collections|itertools|functools|pathlib|datetime|math|random|copy|io|abc|dataclasses|enum|contextlib|warnings|logging|unittest|ast|inspect)'
        stdlib_imports = [i for i in imports if re.match(stdlib_pattern, i.split('.')[0])]

        if len(imports) > 15:
            violations.append(Violation(
                level="heidegger",
                severity="medium",
                message=f"High import count ({len(imports)}) - module may have too many responsibilities",
                suggestion="Consider splitting into focused modules"
            ))

        # --- Check for cohesion (do functions relate to each other?) ---
        # Simple heuristic: do function names share common prefixes/themes?
        if len(function_names) >= 3:
            # Extract potential themes from function names
            words = []
            for name in function_names:
                parts = name.replace('_', ' ').split()
                words.extend(parts)

            word_counts = defaultdict(int)
            for word in words:
                if len(word) > 2:  # Skip short words
                    word_counts[word] += 1

            # If there's a dominant theme, cohesion is good
            if word_counts:
                max_count = max(word_counts.values())
                metrics["cohesion_score"] = max_count / len(function_names)

                if metrics["cohesion_score"] < 0.3 and len(function_names) > 5:
                    violations.append(Violation(
                        level="heidegger",
                        severity="low",
                        message="Low function cohesion - functions may not form a coherent whole",
                        suggestion="Group related functions into focused modules"
                    ))

        # --- Check for public API clarity ---
        public_functions = [f for f in function_names if not f.startswith('_')]
        private_functions = [f for f in function_names if f.startswith('_') and not f.startswith('__')]

        metrics["export_count"] = len(public_functions)

        if len(public_functions) > 10:
            violations.append(Violation(
                level="heidegger",
                severity="medium",
                message=f"Large public API ({len(public_functions)} functions) - hard to understand module's role",
                suggestion="Consider which functions are truly public API vs internal helpers"
            ))

    except SyntaxError:
        violations.append(Violation(
            level="heidegger",
            severity="critical",
            message="Code has syntax errors - cannot serve the whole if it doesn't run",
            suggestion="Fix syntax errors first"
        ))

    # --- Calculate score ---
    penalty = 0
    if not metrics["has_docstring"]:
        penalty += 1
    if metrics["naming_consistency"] < 0.8:
        penalty += 1.5
    if metrics["import_count"] > 15:
        penalty += 1
    if metrics["cohesion_score"] < 0.3 and metrics["export_count"] > 5:
        penalty += 1.5

    score = max(0, 10 - penalty)

    # --- Commendations ---
    if metrics["naming_consistency"] >= 0.9:
        commendations.append("Consistent naming - parts speak the same language")
    if 3 <= metrics["import_count"] <= 10:
        commendations.append("Balanced imports - well-connected without over-coupling")

    return LevelResult(score=round(score, 1), violations=violations,
                       commendations=commendations, metrics=metrics)


def audit(code: str, filename: str = "code.py") -> AuditResult:
    """
    Run complete Subtractive Triad audit on code.

    Returns analysis at all three levels:
    - DRY (30% weight): Implementation discipline
    - Rams (30% weight): Artifact discipline
    - Heidegger (40% weight): System discipline
    """
    dry_result = analyze_dry(code, filename)
    rams_result = analyze_rams(code, filename)
    heidegger_result = analyze_heidegger(code, filename)

    # Weighted overall score (Heidegger weighted higher - system coherence matters most)
    overall = (dry_result.score * 0.3 +
               rams_result.score * 0.3 +
               heidegger_result.score * 0.4)

    # Generate summary
    total_violations = (len(dry_result.violations) +
                       len(rams_result.violations) +
                       len(heidegger_result.violations))

    if overall >= 9:
        summary = "Excellent - code embodies subtractive discipline"
    elif overall >= 7:
        summary = "Good - minor improvements possible through removal"
    elif overall >= 5:
        summary = "Fair - several opportunities for simplification"
    else:
        summary = "Needs work - significant excess to remove"

    return AuditResult(
        dry=dry_result,
        rams=rams_result,
        heidegger=heidegger_result,
        overall_score=round(overall, 1),
        summary=summary
    )


def format_report(result: AuditResult) -> str:
    """Format audit result as markdown report."""
    lines = [
        "# Subtractive Triad Audit Report",
        "",
        f"**Overall Score: {result.overall_score}/10** - {result.summary}",
        "",
        "---",
        "",
        "## DRY - \"Have I built this before?\"",
        f"**Score: {result.dry.score}/10**",
        "",
    ]

    if result.dry.commendations:
        for c in result.dry.commendations:
            lines.append(f"- {c}")
        lines.append("")

    if result.dry.violations:
        lines.append("### Violations")
        for v in result.dry.violations:
            severity_icon = {"critical": "", "high": "", "medium": "", "low": ""}
            lines.append(f"- **{v.severity.upper()}**: {v.message}")
            if v.location:
                lines.append(f"  - Location: {v.location}")
            if v.suggestion:
                lines.append(f"  - Suggestion: {v.suggestion}")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## Rams - \"Does this earn its existence?\"",
        f"**Score: {result.rams.score}/10**",
        "",
    ])

    if result.rams.commendations:
        for c in result.rams.commendations:
            lines.append(f"- {c}")
        lines.append("")

    if result.rams.violations:
        lines.append("### Violations")
        for v in result.rams.violations:
            lines.append(f"- **{v.severity.upper()}**: {v.message}")
            if v.location:
                lines.append(f"  - Location: {v.location}")
            if v.suggestion:
                lines.append(f"  - Suggestion: {v.suggestion}")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## Heidegger - \"Does this serve the whole?\"",
        f"**Score: {result.heidegger.score}/10**",
        "",
    ])

    if result.heidegger.commendations:
        for c in result.heidegger.commendations:
            lines.append(f"- {c}")
        lines.append("")

    if result.heidegger.violations:
        lines.append("### Violations")
        for v in result.heidegger.violations:
            lines.append(f"- **{v.severity.upper()}**: {v.message}")
            if v.location:
                lines.append(f"  - Location: {v.location}")
            if v.suggestion:
                lines.append(f"  - Suggestion: {v.suggestion}")
        lines.append("")

    lines.extend([
        "---",
        "",
        "*The Subtractive Triad: Truth emerges through disciplined removal.*",
        "",
        "*Created by [CREATE SOMETHING](https://createsomething.ltd)*"
    ])

    return '\n'.join(lines)
