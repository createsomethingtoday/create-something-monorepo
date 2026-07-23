export const WORKFLOW_FILM_FORMAT = 'workflow-film/v1' as const;

export type WorkflowActor = 'system' | 'agent' | 'function' | 'human';
export type WorkflowExecutionMode = 'observe' | 'mcp' | 'programmatic' | 'judgment';
export type WorkflowRunState =
  | 'signal'
  | 'running'
  | 'waiting'
  | 'continued'
  | 'stopped'
  | 'completed';

export type WorkflowReceipt = {
  id: string;
  state: WorkflowRunState;
  label: string;
  evidence: string;
  owner: string;
};

export type WorkflowStopPolicy = {
  state: 'stopped';
  receiptLabel: string;
  checkpoint: string;
};

export type WorkflowGate = {
  id: string;
  blocking: true;
  owner: string;
  prompt: string;
  safeWorkWhileWaiting: readonly string[];
  onApprove: {
    state: 'continued';
    receiptLabel: string;
  };
  onReject: WorkflowStopPolicy;
  onTimeout: WorkflowStopPolicy & {
    afterMinutes: number;
    escalation: string;
  };
};

export type WorkflowFilmEvent = {
  id: string;
  minute: number;
  clock: string;
  actor: WorkflowActor;
  execution: WorkflowExecutionMode;
  state: WorkflowRunState;
  title: string;
  summary: string;
  capability?: string;
  rationale?: string;
  receipt: WorkflowReceipt;
  gate?: WorkflowGate;
};

export type WorkflowFilmScene = {
  id: string;
  start: number;
  duration: number;
  label: string;
  title: string;
  caption: string;
  eventIds: readonly string[];
  focusEventId: string;
};

export type WorkflowFilmSpec = {
  format: typeof WORKFLOW_FILM_FORMAT;
  compositionId: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  workflow: {
    id: string;
    title: string;
    startMinuteOfDay: number;
    dayStart: string;
    dayEnd: string;
    spanMinutes: number;
  };
  scenes: readonly WorkflowFilmScene[];
  events: readonly WorkflowFilmEvent[];
  closingLabel: string;
  closingLines: readonly string[];
  closingPromise: string;
  callToAction: string;
  destination: string;
  music: {
    title: string;
    credit: string;
    character: string;
    asset: string;
    bpm: number;
    beatFrames: number;
    hitFrames: Record<string, number>;
  };
};

const actorMode: Record<WorkflowActor, WorkflowExecutionMode> = {
  system: 'observe',
  agent: 'mcp',
  function: 'programmatic',
  human: 'judgment'
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const validateWorkflowFilmSpec = (value: unknown): string[] => {
  const errors: string[] = [];
  if (!isRecord(value)) return ['Workflow film spec must be an object'];

  const spec = value as unknown as WorkflowFilmSpec;
  if (spec.format !== WORKFLOW_FILM_FORMAT) {
    errors.push(`Workflow film format must be ${WORKFLOW_FILM_FORMAT}`);
  }
  if (!spec.compositionId?.trim()) errors.push(`Workflow film must declare a composition id`);
  if (spec.fps !== 30 || spec.width !== 1080 || spec.height !== 1920) {
    errors.push(`Workflow film must be 1080x1920 at 30 fps`);
  }
  if (!Number.isInteger(spec.durationInFrames) || spec.durationInFrames <= 0) {
    errors.push(`Workflow film must declare a positive integer frame duration`);
  }
  if (!spec.workflow?.id?.trim() || !spec.workflow?.title?.trim()) {
    errors.push(`Workflow film must declare a workflow id and title`);
  }
  if (
    !Number.isInteger(spec.workflow?.startMinuteOfDay) ||
    spec.workflow.startMinuteOfDay < 0 ||
    spec.workflow.startMinuteOfDay > 1439
  ) {
    errors.push(`Workflow-film startMinuteOfDay must be an integer from 0 through 1439`);
  }
  if (!Number.isFinite(spec.workflow?.spanMinutes) || spec.workflow.spanMinutes <= 0) {
    errors.push(`Workflow-film run must declare a positive span in minutes`);
  }
  if (
    !spec.safeArea ||
    Object.values(spec.safeArea).some((inset) => !Number.isFinite(inset) || inset < 48)
  ) {
    errors.push(`Workflow-film safe-area insets must each be at least 48 pixels`);
  }

  const scenes: readonly WorkflowFilmScene[] = Array.isArray(spec.scenes) ? spec.scenes : [];
  let expectedStart = 0;
  for (const scene of scenes) {
    if (scene.start !== expectedStart) {
      errors.push(`${scene.id} starts at ${scene.start}; expected ${expectedStart}`);
    }
    if (scene.duration <= 0) errors.push(`${scene.id} must have a positive duration`);
    if (!scene.caption.trim()) errors.push(`${scene.id} must include sound-off narration`);
    if (scene.caption.length > 120) errors.push(`${scene.id} caption exceeds 120 characters`);
    expectedStart = scene.start + scene.duration;
  }
  if (expectedStart !== spec.durationInFrames) {
    errors.push(`Workflow-film scenes end at ${expectedStart}; expected ${spec.durationInFrames}`);
  }

  const events: readonly WorkflowFilmEvent[] = Array.isArray(spec.events) ? spec.events : [];
  const eventIds = new Set<string>();
  const receiptIds = new Set<string>();
  let previousMinute = -1;
  for (const event of events) {
    if (eventIds.has(event.id)) errors.push(`Duplicate workflow event id: ${event.id}`);
    eventIds.add(event.id);
    if (event.minute < previousMinute)
      errors.push(`Workflow events are not time ordered at ${event.id}`);
    previousMinute = event.minute;
    if (event.title.length > 48) errors.push(`${event.id} title exceeds 48 characters`);
    if (event.summary.length > 110) errors.push(`${event.id} summary exceeds 110 characters`);
    if (actorMode[event.actor] !== event.execution) {
      errors.push(
        `${event.id} uses ${event.execution}; ${event.actor} events require ${actorMode[event.actor]}`
      );
    }
    if (!event.receipt) {
      errors.push(`${event.id} must emit a receipt`);
    } else {
      if (receiptIds.has(event.receipt.id)) {
        errors.push(`Duplicate workflow receipt id: ${event.receipt.id}`);
      }
      receiptIds.add(event.receipt.id);
      if (event.receipt.state !== event.state) {
        errors.push(`${event.id} receipt state must match its event state`);
      }
      if (!event.receipt.evidence.trim() || !event.receipt.owner.trim()) {
        errors.push(`${event.id} receipt must record evidence and owner`);
      }
    }
    if (event.rationale && /chain.of.thought|hidden reasoning/i.test(event.rationale)) {
      errors.push(`${event.id} must not claim hidden reasoning disclosure`);
    }
  }

  const waiting = events.filter((event) => event.state === 'waiting');
  for (const waitingEvent of waiting) {
    const gate = waitingEvent.gate;
    if (!gate) {
      errors.push(`${waitingEvent.id} must declare a blocking gate`);
      continue;
    }
    if (gate.blocking !== true) errors.push(`Workflow-film gate must be blocking`);
    if (gate.safeWorkWhileWaiting.length < 2) {
      errors.push(`Workflow-film gate must name at least two safe tasks during the wait`);
    }
    if (gate.onApprove.state !== 'continued') {
      errors.push(`Workflow-film approval path must continue`);
    }
    if (gate.onReject.state !== 'stopped' || gate.onTimeout.state !== 'stopped') {
      errors.push(`Workflow-film rejection and timeout paths must stop`);
    }
    if (gate.onTimeout.afterMinutes <= 0 || !gate.onTimeout.escalation.trim()) {
      errors.push(`Workflow-film timeout path must set a deadline and escalation`);
    }
    if (!gate.onReject.checkpoint.trim() || !gate.onTimeout.checkpoint.trim()) {
      errors.push(`Workflow-film stop paths must leave resumable checkpoints`);
    }

    const continuedMinute = events.find(
      (event) => event.state === 'continued' && event.minute > waitingEvent.minute
    )?.minute;
    const safeWorkDuringWait = events.some(
      (event) =>
        event.state === 'running' &&
        event.minute > waitingEvent.minute &&
        continuedMinute !== undefined &&
        event.minute < continuedMinute
    );
    if (!safeWorkDuringWait) {
      errors.push(`${waitingEvent.id} must allow safe work before a later continuation`);
    }
  }

  if (events[0]?.minute !== 0 || events.at(-1)?.minute !== spec.workflow?.spanMinutes) {
    errors.push(`Workflow-film first and last events must span the declared day`);
  }

  for (const scene of scenes) {
    for (const eventId of scene.eventIds) {
      if (!eventIds.has(eventId)) errors.push(`${scene.id} references unknown event ${eventId}`);
    }
    if (!scene.eventIds.includes(scene.focusEventId)) {
      errors.push(`${scene.id} focus event must belong to the scene`);
    }
  }

  if (!spec.closingLabel?.trim()) errors.push(`Workflow film must declare a closing label`);
  if (!Array.isArray(spec.closingLines) || spec.closingLines.length < 2) {
    errors.push(`Workflow film must declare at least two closing lines`);
  } else if (spec.closingLines.some((line) => !line.trim() || line.length > 34)) {
    errors.push(`Workflow-film closing lines must be nonempty and at most 34 characters`);
  } else if (spec.closingLines.join(' ') !== spec.closingPromise) {
    errors.push(`Workflow-film closing lines must reproduce the closing promise`);
  }
  if (!spec.closingPromise?.trim() || !spec.callToAction?.trim() || !spec.destination?.trim()) {
    errors.push(`Workflow film must declare a closing promise, call to action, and destination`);
  }

  if (
    !spec.music?.title?.trim() ||
    !spec.music.credit?.trim() ||
    !spec.music.character?.trim() ||
    !spec.music.asset?.trim() ||
    spec.music.bpm <= 0 ||
    spec.music.beatFrames <= 0
  ) {
    errors.push(`Workflow film must declare music metadata, an asset, BPM, and beat grid`);
  } else {
    if (spec.durationInFrames % spec.music.beatFrames !== 0) {
      errors.push(`Workflow-film duration must end on the declared beat grid`);
    }
    for (const [label, frame] of Object.entries(spec.music.hitFrames ?? {})) {
      if (
        !Number.isInteger(frame) ||
        frame < 0 ||
        frame >= spec.durationInFrames ||
        frame % spec.music.beatFrames !== 0
      ) {
        errors.push(`${label} music hit must be an in-bounds frame on the beat grid`);
      }
    }
  }

  return errors;
};
