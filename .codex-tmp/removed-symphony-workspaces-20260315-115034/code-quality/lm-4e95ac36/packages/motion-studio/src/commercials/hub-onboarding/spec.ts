/**
 * Hub Onboarding Commercial Specification
 *
 * 80-second learner-first explainer for receiving and connecting a Hub MCP.
 * Audience: new client users, written to a senior-in-high-school reading level.
 */

export const HUB_ONBOARDING_SPEC = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 2400,

  product: {
    name: '.agency Hub',
    title: 'Hub MCP Onboarding',
    tagline: 'Connect once. Start safely.',
    url: 'createsomething.agency/mcp-access',
    host: 'Codex',
  },

  credentials: {
    displayName: 'Studio Ops Lane',
    laneKey: 'studio-ops',
    hubUrl: 'https://studio-ops.mcp.createsomething.agency/mcp',
    bridgeUrl: 'https://notion.createsomething.agency/studio-ops',
    tokenPrefix: 'cs_live_91af2c4d',
    boundHost: 'Codex',
    accessMode: 'Read + write',
    accountId: 'acct_01h7m4r3',
    tenantId: 'tenant_studio_ops',
  },

  firstAction: {
    prompt: 'What tools do I have access to in this Hub?',
    steps: [
      {
        tool: 'hub_search_proxy_tools',
        label: 'Find the right tool',
        detail: 'Start with a safe lookup so the Hub shows what is visible to you.',
      },
      {
        tool: 'hub_describe_proxy_tool',
        label: 'Check what it needs',
        detail: 'Read the input shape before you run anything real.',
      },
      {
        tool: 'hub_execute_proxy_tool',
        label: 'Run the approved action',
        detail: 'Only the tool you are allowed to use will run.',
      },
    ],
  },

  governance: {
    safe: {
      title: 'Safe actions',
      copy: 'Run fast when the action stays inside approved rules.',
      example: 'List visible tools',
    },
    review: {
      title: 'Review actions',
      copy: 'Pause and ask for approval before the risky part runs.',
      example: 'Change a production record',
    },
    blocked: {
      title: 'Blocked actions',
      copy: 'Stop with a reason when the action should not happen at all.',
      example: 'Delete an entire workspace',
    },
  },

  reconnect: {
    title: 'Connection expired',
    detail: 'Your host token is out of date or the downstream auth link broke.',
    steps: [
      {
        tool: '__connection_status',
        label: 'Check the connection',
        detail: 'Ask the Hub what is broken before you change anything.',
      },
      {
        tool: '__get_connect_link',
        label: 'Get the repair link',
        detail: 'The Hub gives you the exact link to reconnect.',
      },
      {
        tool: 'Reconnect in browser',
        label: 'Repair the auth path',
        detail: 'Finish the sign-in step for the service that expired.',
      },
      {
        tool: 'Retry your action',
        label: 'Run the same request again',
        detail: 'Once auth is healthy, the original path works again.',
      },
    ],
  },

  colors: {
    bgBase: '#04070c',
    bgTop: '#08111d',
    bgBottom: '#05080e',
    panel: 'rgba(10, 18, 30, 0.86)',
    panelSoft: 'rgba(14, 22, 36, 0.62)',
    panelMuted: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(131, 160, 201, 0.18)',
    borderStrong: 'rgba(131, 160, 201, 0.34)',
    line: 'rgba(131, 160, 201, 0.22)',
    grid: 'rgba(89, 120, 163, 0.08)',
    glow: 'rgba(103, 212, 255, 0.2)',
    fgPrimary: '#f7fbff',
    fgSecondary: 'rgba(247, 251, 255, 0.78)',
    fgMuted: 'rgba(247, 251, 255, 0.56)',
    fgQuiet: 'rgba(247, 251, 255, 0.4)',
    accent: '#67d4ff',
    accentSoft: 'rgba(103, 212, 255, 0.14)',
    accentStrong: '#97e6ff',
    success: '#79f7ae',
    successSoft: 'rgba(121, 247, 174, 0.16)',
    warning: '#ffca63',
    warningSoft: 'rgba(255, 202, 99, 0.16)',
    error: '#ff8787',
    errorSoft: 'rgba(255, 135, 135, 0.14)',
  },

  scenes: {
    intro: { start: 0, duration: 240 },
    laneAssignment: { start: 240, duration: 150 },
    tokenSetup: { start: 390, duration: 150 },
    hostConfig: { start: 540, duration: 360 },
    firstAction: { start: 900, duration: 420 },
    governance: { start: 1320, duration: 420 },
    reconnect: { start: 1740, duration: 420 },
    close: { start: 2160, duration: 240 },
  },

  voxTreatment: {
    posterizeFrameRate: 18,
    grainIntensity: 0.03,
    vignetteIntensity: 0.18,
    chromaticAberration: 0.35,
    backgroundTint: '#04070c',
  },
} as const;

export type HubOnboardingSpec = typeof HUB_ONBOARDING_SPEC;

export default HUB_ONBOARDING_SPEC;
