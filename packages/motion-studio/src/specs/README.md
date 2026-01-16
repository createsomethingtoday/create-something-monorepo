# Animation Specs

Shared animation specifications that define **what** happens, not **how**.

Both Svelte (web) and Remotion (video) renderers interpret these specs for their respective mediums.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ANIMATION SPECS                          │
│  (TypeScript definitions + JSON-like data structures)       │
│                                                             │
│  • types.ts - Schema for all animations                     │
│  • tool-receding.ts - Heidegger's ready-to-hand             │
│  • ide-vs-terminal.ts - Chrome to canvas                    │
└─────────────────────────────────────────────────────────────┘
                    │                     │
                    ▼                     ▼
     ┌──────────────────────┐  ┌──────────────────────┐
     │   SVELTE RENDERER    │  │  REMOTION RENDERER   │
     │                      │  │                      │
     │ LessonRemotion.svelte│  │ ToolReceding.tsx     │
     │ (packages/lms)       │  │ IDEvsTerminal.tsx    │
     │                      │  │ (packages/motion-    │
     │ For: Web             │  │  studio)             │
     │ Interactive          │  │                      │
     │ Scroll-triggered     │  │ For: Video export    │
     │                      │  │ Frame-by-frame       │
     │                      │  │ MP4/WebM output      │
     └──────────────────────┘  └──────────────────────┘
```

## Design Philosophy

### The Spec Describes WHAT, Not HOW

Specs define:
- **Phases** - Semantic divisions of the animation timeline
- **Elements** - What objects exist in the scene
- **Keyframes** - When properties change and to what values
- **Reveal** - Final text that appears

Renderers decide:
- Exact easing curves
- Performance optimizations
- Platform-specific behaviors
- Interactive vs non-interactive

### Shared Design Tokens

Both renderers use the same design tokens:

| Token Category | Location | Usage |
|----------------|----------|-------|
| Colors | `motion-studio/src/styles` | Monochrome palette |
| Typography | `motion-studio/src/styles` | Font families, sizes |
| Animation | `motion-studio/src/styles` | Easing, duration |
| Spacing | `motion-studio/src/styles` | Layout values |

### Why Not One Renderer?

1. **Different constraints**: Web needs interaction, video needs frame-perfect output
2. **Different runtimes**: Svelte reactivity vs React/Remotion composition
3. **Right tool for the job**: Canon principle - don't force one tool to do both

## Spec Format

```typescript
interface AnimationSpec {
  id: string;
  name: string;
  description: string;
  
  duration: number; // Total duration in ms
  fps?: number;     // For video rendering
  
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  
  phases: AnimationPhase[];  // Semantic timeline divisions
  elements: AnimationElement[]; // Scene objects
  
  reveal?: {
    text: string;
    style: 'fade' | 'mask' | 'typewriter';
    startPhase: number; // 0-1 progress
  };
}
```

## Adding New Animations

1. Create spec file: `packages/motion-studio/src/specs/my-animation.ts`
2. Export from `index.ts`
3. Add Svelte implementation in `packages/lms` (for web)
4. Add Remotion implementation in `packages/motion-studio` (for video)

Both implementations should:
- Reference the same phase labels
- Use the same keyframe timing
- Render the same reveal text
- Produce visually consistent output
