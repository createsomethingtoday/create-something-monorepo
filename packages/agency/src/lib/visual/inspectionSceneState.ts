const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/** One reversible state calculation shared by scroll, direct links and the static view. */
export function inspectionState(progress: number) {
  const p = clamp(progress);
  const opening = ease((p - 1 / 3) * 3);
  return {
    progress: p,
    stage: Math.min(3, Math.floor(p * 3 + 0.15)),
    selection: ease(p * 3),
    lidLift: opening * 2.35,
    layerLift: opening * 0.95,
    finding: ease((p - 2 / 3) * 3)
  };
}
