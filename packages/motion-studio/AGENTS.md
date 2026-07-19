# Agents: @create-something/motion-studio

Motion Studio owns programmatic motion graphics and the narrow AI-native scene
compiler tracked by CRE-1333.

## Agent Entry

- Start with `README.md` for the package boundary and operator commands.
- Use `src/scene/index.ts` for scene compilation, invalidation, cost planning,
  deterministic assembly, and verification.
- Use `src/index.ts` and `src/Root.tsx` for the existing Remotion surface.

## Ownership

| Tier | This package owns | This package does not own |
| --- | --- | --- |
| Database | Scene shapes, beat dependencies, render-cell manifests, cost policies, and verification receipts | Marketing publication state or provider credentials |
| Automation | Scene compilation, edit invalidation, cost preflight, ffmpeg assembly, and ffprobe verification | Sora account administration or campaign distribution |
| Judgment | Fail-closed format and budget checks | Brand approval, publication approval, or permission to exceed scene policy |

## Rules

- Keep the scene manifest as the source of truth; prompts and videos are derived artifacts.
- Preserve stable element, beat, and render-cell IDs across edits.
- Price a render before making a provider call and rerender only invalidated cells.
- Keep provider credentials in Infisical and never write secret values to receipts.
- Keep captions player-rendered for the current pilot; do not burn text into media.
- Do not authorize publication from a successful local render or verification receipt.

## Validation

```bash
pnpm --filter @create-something/motion-studio validate
pnpm --filter @create-something/motion-studio test:scene
pnpm --filter @create-something/motion-studio check:scene
pnpm exports @create-something/motion-studio compileScene
git diff --check
```

Escalate when a requested edit exceeds the scene budget, requires changing a
published asset, or cannot preserve element identity through an isolated render
cell.
