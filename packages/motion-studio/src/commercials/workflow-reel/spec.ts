export const WORKFLOW_REEL_SPEC = {
  compositionId: 'CreateSomethingWorkflowReel',
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 900,
  safeArea: {
    top: 150,
    right: 80,
    bottom: 280,
    left: 80
  },
  scenes: {
    signal: {
      start: 0,
      duration: 150,
      label: 'Signal',
      caption: 'A customer request arrives.'
    },
    scatter: {
      start: 150,
      duration: 180,
      label: 'Friction',
      caption: 'The request crosses tools. Ownership and approval disappear into the gaps.'
    },
    map: {
      start: 330,
      duration: 180,
      label: 'Map',
      caption: 'CREATE SOMETHING turns a vague handoff into a visible workflow.'
    },
    decision: {
      start: 510,
      duration: 150,
      label: 'Decision',
      caption: 'Clear work runs. Risky work waits for the right person.'
    },
    proof: {
      start: 660,
      duration: 120,
      label: 'Proof',
      caption: 'Owner, decision, action, and outcome stay attached.'
    },
    close: {
      start: 780,
      duration: 120,
      label: 'CREATE SOMETHING',
      caption: 'Map one workflow.'
    }
  },
  closingPromise: 'Less chasing. Clear decisions. Proof that work moved.',
  callToAction: 'Map one workflow.',
  destination: 'createsomething.agency/map',
  music: {
    title: 'Proof in Motion',
    credit: 'Original score for CREATE SOMETHING',
    character: 'modal tenor quartet',
    asset: 'audio/workflow-reel/proof-in-motion-jazz.mp3',
    bpm: 120,
    beatFrames: 15,
    hitFrames: {
      signal: 0,
      scatter: 150,
      map: 330,
      decision: 510,
      approval: 600,
      proof: 660,
      receipt: 720,
      close: 780,
      cta: 840
    }
  }
} as const;

export type WorkflowReelSceneName = keyof typeof WORKFLOW_REEL_SPEC.scenes;
