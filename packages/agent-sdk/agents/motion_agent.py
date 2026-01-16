"""
Motion Graphics Agent

Transforms natural language prompts into Vox-style motion graphics.
The agent plans scenes, selects primitives, and orchestrates rendering.

"The tool recedes; the explanation remains."

Example:
    agent = MotionGraphicsAgent(AgentConfig(
        task="Create a 60-second explainer about the Subtractive Triad"
    ))
    result = await agent.run()
"""

import json
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

# Agent SDK imports
try:
    from ..agent import CreateSomethingAgent, AgentConfig
    from ..tools import BashTool, FileReadTool, FileWriteTool
except ImportError:
    # Fallback for standalone testing
    CreateSomethingAgent = object
    AgentConfig = dict
    BashTool = FileReadTool = FileWriteTool = None


class SceneType(str, Enum):
    """Available scene types in motion-studio"""
    INTRO = "intro"
    DATA = "data"
    BREAKDOWN = "breakdown"
    COMPARISON = "comparison"
    TIMELINE = "timeline"


class ChartType(str, Enum):
    """Chart types for data visualization"""
    BAR = "bar"
    HORIZONTAL_BAR = "horizontal-bar"
    PIE = "pie"
    LINE = "line"


class Theme(str, Enum):
    """Available themes from Canon"""
    DARK = "dark"
    LIGHT = "light"
    SPACE = "space"
    IO = "io"
    AGENCY = "agency"
    LTD = "ltd"


@dataclass
class SceneSpec:
    """Specification for a single scene"""
    type: SceneType
    duration_seconds: float
    props: dict[str, Any]
    narration: Optional[str] = None


@dataclass
class VideoPlan:
    """Complete video plan"""
    title: str
    scenes: list[SceneSpec]
    theme: Theme = Theme.DARK
    fps: int = 30
    total_duration_seconds: float = 0
    
    def __post_init__(self):
        self.total_duration_seconds = sum(s.duration_seconds for s in self.scenes)
    
    def to_remotion_config(self) -> dict:
        """Convert to Remotion composition config"""
        scenes = []
        for scene in self.scenes:
            scenes.append({
                "type": scene.type.value,
                "durationInFrames": int(scene.duration_seconds * self.fps),
                "props": {
                    **scene.props,
                    "theme": self.theme.value,
                },
            })
        
        return {
            "id": self.title.lower().replace(" ", "-"),
            "scenes": scenes,
            "fps": self.fps,
            "durationInFrames": int(self.total_duration_seconds * self.fps),
            "width": 1920,
            "height": 1080,
        }
    
    def to_json(self) -> str:
        """Serialize to JSON"""
        return json.dumps(self.to_remotion_config(), indent=2)


@dataclass
class MotionAgentConfig:
    """Configuration for the motion graphics agent"""
    # Natural language task/prompt
    task: str
    
    # Target duration in seconds
    target_duration: int = 60
    
    # Output format
    output_format: str = "video"  # "video" | "web" | "frames"
    
    # Theme
    theme: Theme = Theme.DARK
    
    # Pacing
    pacing: str = "moderate"  # "fast" | "moderate" | "slow"
    
    # Whether to include narration script
    include_narration: bool = True
    
    # Output path for rendered video
    output_path: Optional[str] = None
    
    # Model for planning
    model: str = "claude-sonnet-4-20250514"


class MotionGraphicsAgent:
    """
    Agent that creates Vox-style motion graphics from natural language.
    
    Workflow:
    1. Parse prompt → extract subject, key concepts, data
    2. Plan scenes → select primitives, determine sequence
    3. Generate composition → Remotion scene description
    4. Render → output video or web animation
    """
    
    # Scene type selection heuristics
    CONTENT_PATTERNS = {
        "comparison": r"(?:vs\.?|versus|compare|difference|before.*after|old.*new)",
        "timeline": r"(?:history|timeline|evolution|journey|over time|years?|dates?)",
        "data": r"(?:percent|statistics|data|numbers|chart|graph|metrics|\d+%)",
        "hook": r"(?:what if|imagine|consider|ever wondered|question)",
    }
    
    # Default scene durations (seconds)
    SCENE_DURATIONS = {
        SceneType.INTRO: 4,
        SceneType.DATA: 6,
        SceneType.BREAKDOWN: 5,
        SceneType.COMPARISON: 5,
        SceneType.TIMELINE: 6,
    }
    
    # Pacing multipliers
    PACING_MULTIPLIERS = {
        "fast": 0.7,
        "moderate": 1.0,
        "slow": 1.3,
    }
    
    def __init__(self, config: MotionAgentConfig):
        self.config = config
        self.plan: Optional[VideoPlan] = None
    
    async def run(self) -> dict[str, Any]:
        """
        Execute the motion graphics generation workflow.
        
        Returns:
            Dict containing video plan, composition config, and optionally
            the rendered output path.
        """
        # Step 1: Analyze the prompt
        analysis = self._analyze_prompt(self.config.task)
        
        # Step 2: Plan scenes
        self.plan = self._plan_scenes(analysis)
        
        # Step 3: Generate Remotion config
        remotion_config = self.plan.to_remotion_config()
        
        # Step 4: Render (if requested)
        output_path = None
        if self.config.output_format == "video" and self.config.output_path:
            output_path = await self._render_video(remotion_config)
        
        return {
            "plan": {
                "title": self.plan.title,
                "scenes": [
                    {
                        "type": s.type.value,
                        "duration": s.duration_seconds,
                        "narration": s.narration,
                    }
                    for s in self.plan.scenes
                ],
                "total_duration": self.plan.total_duration_seconds,
            },
            "remotion_config": remotion_config,
            "output_path": output_path,
        }
    
    def _analyze_prompt(self, prompt: str) -> dict[str, Any]:
        """
        Analyze the prompt to extract key information.
        
        Returns:
            Dict with subject, concepts, suggested_scenes, etc.
        """
        prompt_lower = prompt.lower()
        
        # Detect content patterns
        detected_patterns = []
        for pattern_name, regex in self.CONTENT_PATTERNS.items():
            if re.search(regex, prompt_lower, re.IGNORECASE):
                detected_patterns.append(pattern_name)
        
        # Extract potential concepts (capitalized terms, quoted phrases)
        concepts = []
        
        # Quoted terms
        quoted = re.findall(r'"([^"]+)"', prompt)
        concepts.extend(quoted)
        
        # Capitalized terms (potential proper nouns/concepts)
        capitalized = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', prompt)
        concepts.extend([c for c in capitalized if len(c) > 2])
        
        # Deduplicate
        concepts = list(dict.fromkeys(concepts))[:5]
        
        # Try to extract a title
        title = concepts[0] if concepts else "Explainer Video"
        
        # Detect if there's data/numbers
        has_data = bool(re.search(r'\d+%?|\bdata\b|\bstats\b|\bmetrics\b', prompt_lower))
        
        return {
            "title": title,
            "concepts": concepts,
            "patterns": detected_patterns,
            "has_data": has_data,
            "raw_prompt": prompt,
        }
    
    def _plan_scenes(self, analysis: dict[str, Any]) -> VideoPlan:
        """
        Plan the video scenes based on analysis.
        
        This is the core planning logic that maps content to visual scenes.
        """
        scenes: list[SceneSpec] = []
        pacing_mult = self.PACING_MULTIPLIERS.get(self.config.pacing, 1.0)
        
        # Always start with an intro/hook
        hook_text = self._generate_hook(analysis)
        scenes.append(SceneSpec(
            type=SceneType.INTRO,
            duration_seconds=self.SCENE_DURATIONS[SceneType.INTRO] * pacing_mult,
            props={
                "hook": hook_text,
                "subtitle": analysis["title"],
                "highlightWords": analysis["concepts"][:2],
            },
            narration=hook_text,
        ))
        
        # Add concept breakdown if we have concepts
        if len(analysis["concepts"]) > 1:
            concept_specs = [
                {"name": c, "description": f"Key aspect of {analysis['title']}", "icon": "•"}
                for c in analysis["concepts"][:4]
            ]
            scenes.append(SceneSpec(
                type=SceneType.BREAKDOWN,
                duration_seconds=self.SCENE_DURATIONS[SceneType.BREAKDOWN] * pacing_mult,
                props={
                    "title": f"Understanding {analysis['title']}",
                    "concepts": concept_specs,
                    "layout": "horizontal" if len(concept_specs) <= 3 else "grid",
                },
                narration=f"Let's break down the key components of {analysis['title']}.",
            ))
        
        # Add comparison if pattern detected
        if "comparison" in analysis["patterns"]:
            scenes.append(SceneSpec(
                type=SceneType.COMPARISON,
                duration_seconds=self.SCENE_DURATIONS[SceneType.COMPARISON] * pacing_mult,
                props={
                    "title": "A Different Approach",
                    "left": {"label": "Traditional", "content": "Old way", "points": []},
                    "right": {"label": "New", "content": "Better way", "points": []},
                },
                narration="Compare the traditional approach with the new paradigm.",
            ))
        
        # Add timeline if pattern detected
        if "timeline" in analysis["patterns"]:
            events = [
                {"year": "Past", "title": "Origins", "description": "Where it started"},
                {"year": "Present", "title": "Current State", "description": "Where we are"},
                {"year": "Future", "title": "Direction", "description": "Where it's going"},
            ]
            scenes.append(SceneSpec(
                type=SceneType.TIMELINE,
                duration_seconds=self.SCENE_DURATIONS[SceneType.TIMELINE] * pacing_mult,
                props={
                    "title": f"The Evolution of {analysis['title']}",
                    "events": events,
                    "orientation": "horizontal",
                },
                narration="Let's trace the evolution over time.",
            ))
        
        # Add data visualization if has_data
        if analysis["has_data"] or "data" in analysis["patterns"]:
            # Placeholder data - in real usage this would come from the prompt
            sample_data = [
                {"label": "Category A", "value": 75},
                {"label": "Category B", "value": 60},
                {"label": "Category C", "value": 45},
                {"label": "Category D", "value": 30},
            ]
            scenes.append(SceneSpec(
                type=SceneType.DATA,
                duration_seconds=self.SCENE_DURATIONS[SceneType.DATA] * pacing_mult,
                props={
                    "title": f"{analysis['title']} by the Numbers",
                    "chartType": "horizontal-bar",
                    "data": sample_data,
                    "buildStyle": "bar-by-bar",
                },
                narration="Let's look at the data behind this.",
            ))
        
        # Conclusion
        conclusion_text = self._generate_conclusion(analysis)
        scenes.append(SceneSpec(
            type=SceneType.INTRO,
            duration_seconds=self.SCENE_DURATIONS[SceneType.INTRO] * pacing_mult,
            props={
                "hook": conclusion_text,
                "subtitle": "Key Takeaway",
                "highlightWords": [analysis["title"]],
            },
            narration=conclusion_text,
        ))
        
        # Scale scenes to fit target duration
        scenes = self._scale_to_duration(scenes, self.config.target_duration)
        
        return VideoPlan(
            title=analysis["title"],
            scenes=scenes,
            theme=self.config.theme,
            fps=30,
        )
    
    def _generate_hook(self, analysis: dict[str, Any]) -> str:
        """Generate an engaging opening hook."""
        title = analysis["title"]
        
        # Simple hook templates
        hooks = [
            f"What if everything you knew about {title.lower()} was incomplete?",
            f"There's a hidden principle behind every great {title.lower()}.",
            f"The secret to {title.lower()} isn't what you think.",
        ]
        
        # Use first concept to personalize if available
        if "hook" in analysis["patterns"]:
            return analysis["raw_prompt"].split(".")[0] + "."
        
        return hooks[0]
    
    def _generate_conclusion(self, analysis: dict[str, Any]) -> str:
        """Generate a concluding statement."""
        title = analysis["title"]
        concepts = analysis["concepts"]
        
        if concepts:
            return f"{title}: where {', '.join(concepts[:2])} come together."
        return f"That's the essence of {title}."
    
    def _scale_to_duration(
        self, 
        scenes: list[SceneSpec], 
        target_seconds: float
    ) -> list[SceneSpec]:
        """Scale scene durations to fit target total duration."""
        current_total = sum(s.duration_seconds for s in scenes)
        if current_total == 0:
            return scenes
        
        scale_factor = target_seconds / current_total
        
        for scene in scenes:
            scene.duration_seconds = round(scene.duration_seconds * scale_factor, 1)
        
        return scenes
    
    async def _render_video(self, config: dict) -> str:
        """
        Render the video using Remotion.
        
        This would invoke the Remotion CLI to render the composition.
        """
        # Write config to temp file
        config_path = "/tmp/motion-studio-config.json"
        with open(config_path, "w") as f:
            json.dump(config, f)
        
        output_path = self.config.output_path or "/tmp/motion-output.mp4"
        
        # In a real implementation, this would call:
        # npx remotion render --config motion-studio-config.json --output output.mp4
        
        return output_path
    
    def get_narration_script(self) -> str:
        """Get the full narration script for the video."""
        if not self.plan:
            return ""
        
        script_parts = []
        for i, scene in enumerate(self.plan.scenes, 1):
            if scene.narration:
                script_parts.append(f"[Scene {i} - {scene.type.value}]")
                script_parts.append(scene.narration)
                script_parts.append("")
        
        return "\n".join(script_parts)


# Example usage and CLI entry point
async def main():
    """Example usage of the motion graphics agent."""
    config = MotionAgentConfig(
        task="""
        Create a 60-second explainer about the Subtractive Triad:
        - Hook: "What if the best code is the code you don't write?"
        - Explain DRY, Rams, Heidegger levels
        - Show how they connect in a hermeneutic circle
        - End with the meta-principle
        """,
        target_duration=60,
        theme=Theme.LTD,
        pacing="moderate",
    )
    
    agent = MotionGraphicsAgent(config)
    result = await agent.run()
    
    print("=== Video Plan ===")
    print(json.dumps(result["plan"], indent=2))
    
    print("\n=== Remotion Config ===")
    print(json.dumps(result["remotion_config"], indent=2))
    
    print("\n=== Narration Script ===")
    print(agent.get_narration_script())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
