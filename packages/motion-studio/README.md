# @create-something/motion-studio

Vox-style motion graphics generation using Canon components and Remotion.

> "The tool recedes; the explanation remains."

## Philosophy

Motion Studio implements **purposeful motion** - animation that serves the explanation, never decorates it. Every transition, reveal, and data point earns its moment on screen.

Built on:
- **Canon Design System** - Consistent tokens for color, typography, spacing, animation
- **Remotion** - Programmatic video rendering in React
- **Vox Style** - Clean, data-driven visual storytelling

## AI-native scene compiler

Motion Studio also compiles short, addressable AI-native scenes. The scene file
is the source of truth for elements, beats, render cells, dependencies, and cost
policy; provider prompts and final video files are derived artifacts.

```bash
# Compile the scene and show the maximum draft spend before generation.
pnpm motion:plan -- \
  --scene packages/agency/content/assets/brand/example/source/scene.json \
  --quality draft

# Identify the cells affected by a beat edit and price only those cells.
pnpm motion:edit -- \
  --scene packages/agency/content/assets/brand/example/source/scene.json \
  --beat proof-resolution \
  --quality draft

# Assemble cached and regenerated cells through the scene's transition policy.
pnpm motion:assemble -- --scene path/to/scene.json --receipt path/to/assembly.json

# Fail closed when duration, dimensions, frame rate, frame count, audio, or
# subtitle-stream policy does not match the scene.
pnpm motion:verify -- \
  --scene path/to/scene.json \
  --video path/to/final.mp4 \
  --receipt path/to/verification.json
```

Import the public interface from the focused subpath:

```ts
import {
  compileScene,
  planEdit,
  planRender,
} from '@create-something/motion-studio/scene';
```

The current pilot contract is intentionally narrow: 1280x720, 16:9, 15–20
seconds, 12 authored poses per second delivered at 24 fps, and player-rendered
captions only. Cached cells cost nothing to reuse. Sora cells are estimated at
their configured duration and model before a render is authorized.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/Root.tsx`, `src/scene/index.ts`, `src/scene/cli.ts` |
| Boot command | `pnpm build:scene` |
| Smoke command | `pnpm check:scene && pnpm test:scene` |
| Validation surfaces | Scene compiler tests, render/edit cost receipts, assembly receipt, ffprobe media receipt, contact sheets, and transcription evidence |
| UI validation path | Open the final 16:9 MP4 and inspect the whole-scene and seam contact sheets; use Remotion Studio for deterministic composition changes |
| Escalation rule | Stop before publication, secret mutation, an over-budget render, or an edit that cannot preserve stable element and beat identity |

## Installation

```bash
# Within the monorepo
pnpm add @create-something/motion-studio

# Install Remotion dependencies
pnpm add remotion @remotion/cli @remotion/player
```

## Quick Start

### Using Primitives Directly

```tsx
import { KineticText, AnimatedChart, FadeIn } from '@create-something/motion-studio/primitives';
import { AbsoluteFill } from 'remotion';

export const MyScene = () => (
  <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
    <KineticText
      text="The Subtractive Triad"
      reveal="word-by-word"
      startFrame={0}
      style="display"
    />
    
    <AnimatedChart
      type="bar"
      data={[
        { label: 'DRY', value: 85 },
        { label: 'Rams', value: 90 },
        { label: 'Heidegger', value: 75 },
      ]}
      buildStyle="bar-by-bar"
      startFrame={30}
    />
  </AbsoluteFill>
);
```

### Using Compositions

```tsx
import { ExplainerIntro, ConceptBreakdown, ExplainerVideo } from '@create-something/motion-studio/compositions';
import { Composition } from 'remotion';

export const RemotionRoot = () => (
  <>
    <Composition
      id="SubtractivTriad"
      component={ExplainerVideo}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        theme: 'ltd',
        scenes: [
          {
            type: 'intro',
            durationInFrames: 120,
            props: {
              hook: 'What if the best code is the code you don't write?',
              subtitle: 'The Subtractive Triad',
            },
          },
          {
            type: 'breakdown',
            durationInFrames: 180,
            props: {
              title: 'Three Levels of Discipline',
              concepts: [
                { name: 'DRY', description: 'Eliminate duplication', icon: '🔄' },
                { name: 'Rams', description: 'Eliminate excess', icon: '✂️' },
                { name: 'Heidegger', description: 'Eliminate disconnection', icon: '🔗' },
              ],
            },
          },
        ],
      }}
    />
  </>
);
```

### Using the Motion Agent

```python
from create_something_agents.agents.motion_agent import MotionGraphicsAgent, MotionAgentConfig, Theme

agent = MotionGraphicsAgent(MotionAgentConfig(
    task="""
    Create a 60-second explainer about the Subtractive Triad:
    - Hook: "What if the best code is the code you don't write?"
    - Explain DRY, Rams, Heidegger levels
    - Show how they connect
    """,
    target_duration=60,
    theme=Theme.LTD,
))

result = await agent.run()
print(result["remotion_config"])
```

## Primitives

### KineticText

Animated typography with word-by-word, letter-by-letter, or full reveals.

```tsx
<KineticText
  text="Less, but better"
  reveal="word-by-word"
  startFrame={0}
  style="headline"
  highlightWords={['better']}
/>
```

### AnimatedChart

Data visualizations that build incrementally.

```tsx
<AnimatedChart
  type="horizontal-bar"
  data={adoptionData}
  buildStyle="bar-by-bar"
  startFrame={30}
/>
```

### AnnotatedImage

Images with animated callouts and labels.

```tsx
<AnnotatedImage
  src="/architecture-diagram.png"
  annotations={[
    { x: 0.3, y: 0.4, label: 'DRY Layer', revealFrame: 45 },
  ]}
/>
```

### LayeredReveal

Multi-layer parallax compositions.

```tsx
<LayeredReveal
  layers={[
    { content: <Background />, depth: 0.2 },
    { content: <Subject />, depth: 0.5 },
  ]}
  direction="zoom-out"
/>
```

### FilmGrain / Vignette

Texture overlays for warmth and depth.

```tsx
<FilmGrain intensity={0.1} animated />
<Vignette intensity={0.25} size={40} />
```

## Compositions

Pre-built scene templates:

| Composition | Use Case |
|-------------|----------|
| `ExplainerIntro` | Opening hooks, key statements |
| `DataVisualization` | Charts with insights |
| `ConceptBreakdown` | Multi-part explanations |
| `ComparisonScene` | Before/after, A/B |
| `TimelineScene` | Chronological progressions |
| `ExplainerVideo` | Full video with scene sequencing |

## Themes

Built-in themes matching CREATE SOMETHING properties:

- `dark` - Default Vox-style dark theme
- `light` - Light variant
- `space` - createsomething.space (blue accent)
- `io` - createsomething.io (green accent)
- `agency` - createsomething.agency (amber accent)
- `ltd` - createsomething.ltd (purple accent)

## Rendering

```bash
# Start Remotion Studio (development)
pnpm --filter motion-studio dev

# Render to video
pnpm --filter motion-studio render SubtractivTriad out/subtractive-triad.mp4

# Render a still frame
pnpm --filter motion-studio render:still SubtractivTriad --frame=60 out/thumbnail.png
```

## Vox Style Reference

The Vox style is characterized by:

- **Kinetic typography** - Text reveals with purpose, not decoration
- **Clean data visualization** - Charts that build incrementally
- **Layered parallax** - Depth through multi-layer compositions
- **Film grain texture** - Warmth that softens digital precision
- **Snappy easing** - Responsive but controlled spring physics
- **Occasional 12fps** - "Choppy emphasis" for stylistic moments

## Canon Alignment

This package embodies the Subtractive Triad:

- **DRY**: Reuse Canon components, don't rebuild
- **Rams**: Every animation earns its existence
- **Heidegger**: Motion graphics serve the whole ecosystem

## License

MIT © Create Something
