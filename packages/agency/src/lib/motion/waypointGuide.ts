/** Nearest semantic pose follows the rendered journey, including reversal. */
export function waypointPose(progress: number): number {
  return progress < .25 ? 0 : progress < .75 ? 1 : 2;
}

/** Interruptible waypoint transport. Rendering and animation stay with the caller. */
export function createWaypointGuide(
  render: (progress: number) => void,
  animate: (from: number, to: number, update: (progress: number) => void) => () => void
) {
  let progress = 0;
  let stage = 0;
  let blocked = true;
  let cancel = () => {};
  let generation = 0;
  const settle = () => {
    generation++;
    cancel();
    progress = stage / 2;
    render(progress);
  };
  return {
    select(next: number) {
      if (next === stage) return;
      stage = Math.max(0, Math.min(2, next));
      generation++;
      cancel();
      if (blocked) { settle(); return; }
      const current = generation;
      cancel = animate(progress, stage / 2, value => {
        if (current !== generation) return;
        progress = value;
        render(value);
      });
    },
    block(value: boolean) { blocked = value; if (value) settle(); },
    refresh: settle,
    destroy() { generation++; cancel(); }
  };
}
