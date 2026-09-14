import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { groundWalkthroughScenes } from './spec';

const palette = { background: '#090909', surface: '#141414', line: '#303030', text: '#f4f1e8', muted: '#a29e94', amber: '#d99a42', green: '#74b988', red: '#d46f68' };
const font = 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';

const Scene: React.FC<React.PropsWithChildren<{ eyebrow?: string }>> = ({ eyebrow, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  return <AbsoluteFill style={{ background: palette.background, color: palette.text, fontFamily: font, padding: 100 }}>
    <div style={{ opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)` }}>
      {eyebrow ? <div style={{ color: palette.amber, fontSize: 22, letterSpacing: 3, marginBottom: 32, textTransform: 'uppercase' }}>{eyebrow}</div> : null}
      {children}
    </div>
  </AbsoluteFill>;
};

const Opening = () => <Scene eyebrow="Ground for operators"><div style={{ fontSize: 82, fontWeight: 650, lineHeight: 1.07, maxWidth: 1500 }}>Both answers sound plausible.<br /><span style={{ color: palette.amber }}>But plausible isn't a decision.</span></div></Scene>;

const Install = () => <Scene eyebrow="01 / The operator difference">
  <div style={{ fontSize: 52, marginBottom: 46 }}>Without Ground, you become the second agent.</div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', gap: 24, alignItems: 'center' }}>
    <div style={{ border: `1px solid ${palette.red}`, background: palette.surface, padding: 34 }}>
      <div style={{ color: palette.red, fontSize: 20, letterSpacing: 2 }}>WITHOUT GROUND</div>
      <div style={{ fontSize: 29, lineHeight: 1.55, marginTop: 24 }}>Retrace the search<br />Check the config<br />Inspect the diff<br />Decode “done”</div>
    </div>
    <div style={{ color: palette.amber, fontSize: 50, textAlign: 'center' }}>→</div>
    <div style={{ border: `1px solid ${palette.green}`, background: '#102016', padding: 34 }}>
      <div style={{ color: palette.green, fontSize: 20, letterSpacing: 2 }}>WITH GROUND</div>
      <div style={{ fontSize: 38, lineHeight: 1.3, marginTop: 24 }}>Review the receipt.<br /><span style={{ color: palette.muted, fontSize: 25 }}>Keep your judgment for the decision.</span></div>
    </div>
  </div>
</Scene>;

const AgentSetup = () => {
  const frame = useCurrentFrame();
  const tools = [
    ['ground_analyze', 'current source tree'],
    ['ground_diff', 'changed work only'],
    ['ground_verify_fix', 'confirm the finding is gone'],
    ['ground_explain', 'show why Ground decided'],
  ];
  const active = Math.min(tools.length - 1, Math.max(0, Math.floor((frame - 80) / 80)));
  const pulse = interpolate(frame % 50, [0, 25, 49], [0.2, 1, 0.2]);
  return <Scene eyebrow="02 / Give the agent a paved path">
    <div style={{ fontSize: 46, marginBottom: 42 }}>MCP gives the agent access. Ground makes the evidence visible.</div>
    <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.5fr', gap: 100, alignItems: 'center', position: 'relative' }}>
      <div style={{ border: `2px solid ${palette.amber}`, background: palette.surface, padding: 34, minHeight: 290 }}>
        <div style={{ color: palette.amber, fontSize: 18, letterSpacing: 2 }}>MCP SERVER</div>
        <div style={{ fontSize: 42, fontWeight: 700, marginTop: 18 }}>ground-mcp</div>
        <div style={{ color: palette.muted, fontSize: 22, lineHeight: 1.45, marginTop: 28 }}>Registered once.<br />Available inside the agent’s normal tool loop.</div>
        <div style={{ width: 14, height: 14, borderRadius: 20, background: palette.green, boxShadow: `0 0 ${18 * pulse}px ${palette.green}`, marginTop: 34 }} />
      </div>
      <div style={{ position: 'absolute', left: '36%', right: '59%', top: '50%', height: 2, background: palette.line }}>
        <div style={{ position: 'absolute', right: -8, top: -6, width: 14, height: 14, borderTop: `2px solid ${palette.amber}`, borderRight: `2px solid ${palette.amber}`, transform: 'rotate(45deg)' }} />
      </div>
      <div style={{ display: 'grid', gap: 13 }}>
        {tools.map(([name, detail], index) => {
          const revealed = interpolate(frame, [60 + index * 45, 78 + index * 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const isActive = index === active;
          return <div key={name} style={{ opacity: revealed, transform: `translateX(${(1 - revealed) * 30}px)`, border: `1px solid ${isActive ? palette.amber : palette.line}`, background: isActive ? '#21180d' : palette.surface, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: isActive ? palette.amber : palette.text, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 24 }}>{name}</div>
            <div style={{ color: palette.muted, fontSize: 20 }}>{detail}</div>
          </div>;
        })}
        <div style={{ color: palette.green, fontSize: 21, marginTop: 10, opacity: interpolate(frame, [390, 430], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>→ structured JSON + explicit coverage status</div>
      </div>
    </div>
  </Scene>;
};

const AgentGuidance = () => {
  const frame = useCurrentFrame();
  const steps = [
    ['1', 'The tool says when', '“Before calling code dead, check its connections.”'],
    ['2', 'The repo sets the rule', '“Removal claims need Ground evidence.”'],
    ['3', 'The gate catches skips', 'BLOCKED → check connections next'],
  ];
  const active = Math.min(2, Math.floor(frame / 210));
  return <Scene eyebrow="03 / How Claude Code and Codex know when to use Ground">
    <div style={{ display: 'flex', gap: 18, marginBottom: 38 }}>
      {['CLAUDE CODE', 'CODEX'].map((agent) => <div key={agent} style={{ border: `1px solid ${palette.line}`, color: palette.muted, padding: '10px 18px', fontSize: 18, letterSpacing: 2 }}>{agent}</div>)}
      <div style={{ color: palette.text, fontSize: 35, marginLeft: 18 }}>same MCP contract</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1.5fr', alignItems: 'stretch', gap: 18 }}>
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}`, padding: 30 }}>
        <div style={{ color: palette.amber, fontSize: 17, letterSpacing: 2 }}>OPERATOR TASK</div>
        <div style={{ fontSize: 34, lineHeight: 1.25, marginTop: 20 }}>“Clean up dead code in the auth package.”</div>
        <div style={{ color: palette.muted, fontSize: 22, marginTop: 34 }}>The agent detects an intent:<br /><span style={{ color: palette.text }}>orphan / dead-code claim</span></div>
      </div>
      <div style={{ display: 'grid', placeItems: 'center', color: palette.amber, fontSize: 44 }}>→</div>
      <div style={{ display: 'grid', gap: 12 }}>
        {steps.map(([number, title, detail], index) => {
          const reached = frame >= index * 210;
          const isActive = index === active;
          return <div key={title} style={{ opacity: reached ? 1 : 0.25, transform: `translateX(${reached ? 0 : 30}px)`, transition: 'none', border: `1px solid ${isActive ? palette.amber : palette.line}`, background: isActive ? '#21180d' : palette.surface, padding: '21px 24px', display: 'grid', gridTemplateColumns: '44px 220px 1fr', alignItems: 'center', gap: 18 }}>
            <div style={{ color: palette.amber, fontSize: 20 }}>{number}</div>
            <div style={{ fontSize: 25, fontWeight: 650 }}>{title}</div>
            <div style={{ color: index === 2 && reached ? palette.red : palette.muted, fontSize: 20 }}>{detail}</div>
          </div>;
        })}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 44, fontSize: 25, textAlign: 'center' }}>
      <div style={{ color: active >= 0 ? palette.text : palette.muted }}>The agent sees the <span style={{ color: palette.amber }}>move</span></div>
      <div style={{ color: active >= 1 ? palette.text : palette.muted }}>The repo sets the <span style={{ color: palette.amber }}>standard</span></div>
      <div style={{ color: active >= 2 ? palette.text : palette.muted }}>Ground closes the <span style={{ color: palette.amber }}>loop</span></div>
    </div>
  </Scene>;
};

const Mechanics = () => {
  const frame = useCurrentFrame();
  const scopes = [
    ['FILE', 'private implementation'],
    ['PROJECT', 'local imports + config'],
    ['DEPENDENCY CLOSURE', 'local consumers'],
    ['MONOREPO', 'shared packages'],
    ['RUNTIME SYSTEM', 'entry points + external boundaries'],
  ];
  const progress = interpolate(frame, [45, 650], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const active = Math.min(scopes.length - 1, Math.floor(progress * scopes.length));
  return <Scene eyebrow="04 / The claim determines the scope">
    <div style={{ fontSize: 48, marginBottom: 54 }}>How far must Ground look before the claim is useful?</div>
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
      <div style={{ position: 'absolute', left: '4%', right: '4%', top: 48, height: 3, background: palette.line }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: palette.amber }} />
        <div style={{ position: 'absolute', left: `${progress * 100}%`, top: -8, width: 18, height: 18, borderRadius: 20, background: palette.amber, boxShadow: `0 0 22px ${palette.amber}`, transform: 'translateX(-9px)' }} />
      </div>
      {scopes.map(([label, detail], index) => {
        const reached = active >= index;
        return <div key={label} style={{ border: `1px solid ${reached ? palette.amber : palette.line}`, background: reached ? '#21180d' : palette.surface, padding: '78px 22px 24px', minHeight: 220 }}>
          <div style={{ color: reached ? palette.amber : palette.muted, fontSize: 19, letterSpacing: 1.4 }}>{label}</div>
          <div style={{ color: palette.text, fontSize: 23, lineHeight: 1.35, marginTop: 18 }}>{detail}</div>
        </div>;
      })}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 38, opacity: interpolate(frame, [600, 690], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
      <div style={{ borderTop: `2px solid ${palette.green}`, paddingTop: 18, color: palette.green, fontSize: 25 }}>Scope reached: runtime entry points</div>
      <div style={{ borderTop: `2px solid ${palette.line}`, paddingTop: 18, color: palette.muted, fontSize: 25 }}>Boundary named: deployed state not inspected</div>
    </div>
  </Scene>;
};

const WhyRust = () => {
  const frame = useCurrentFrame();
  return <Scene eyebrow="06 / Why Ground is built in Rust">
    <div style={{ fontSize: 48, marginBottom: 50 }}>Fast, local, and explicit.</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
      {[
        ['Native delivery', 'Prebuilt binaries target macOS, Linux, and Windows.'],
        ['Distinct evidence', 'Similarity, usage, and connectivity are separate computed types.'],
        ['Ground’s gate', 'The CLI and MCP path reject missing or contradictory evidence.'],
      ].map(([title, detail], index) => {
        const reveal = interpolate(frame, [90 + index * 130, 145 + index * 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return <div key={title} style={{ opacity: reveal, transform: `translateY(${(1 - reveal) * 20}px)`, background: palette.surface, border: `1px solid ${index === 2 ? palette.amber : palette.line}`, padding: 32, minHeight: 235 }}>
          <div style={{ color: index === 2 ? palette.amber : palette.text, fontSize: 34, fontWeight: 650 }}>{title}</div>
          <div style={{ color: palette.muted, fontSize: 24, lineHeight: 1.4, marginTop: 22 }}>{detail}</div>
        </div>;
      })}
    </div>
    <div style={{ color: palette.amber, fontSize: 30, marginTop: 42, opacity: interpolate(frame, [520, 600], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>Rust structures the pipeline. Ground enforces the rule.</div>
  </Scene>;
};

const ClaimGate = () => {
  const frame = useCurrentFrame();
  const blocked = frame < 440;
  const packetProgress = interpolate(frame, [260, 440], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <Scene eyebrow="05 / Watch Ground expand the search">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.55fr 1fr', alignItems: 'center', gap: 36, marginTop: 80 }}>
      <div style={{ background: palette.surface, border: `1px solid ${palette.line}`, padding: 34 }}>
        <div style={{ color: palette.muted, fontSize: 18, letterSpacing: 2 }}>AGENT INTUITION</div>
        <div style={{ fontSize: 38, lineHeight: 1.2, marginTop: 20 }}>“Nothing imports legacy-auth.ts. Delete it.”</div>
        <div style={{ color: palette.muted, fontFamily: 'ui-monospace, monospace', fontSize: 21, marginTop: 28 }}>ground_claim_orphan</div>
      </div>
      <div style={{ textAlign: 'center', border: `3px solid ${blocked ? palette.red : palette.green}`, color: blocked ? palette.red : palette.green, padding: '54px 12px', fontSize: 28, fontWeight: 750, transform: `scale(${blocked ? 1.05 : 1})` }}>
        {blocked ? 'BLOCKED' : 'KEEP FILE'}
        <div style={{ color: palette.muted, fontSize: 17, fontWeight: 400, marginTop: 16 }}>{blocked ? 'connection not checked' : 'runtime entry point'}</div>
      </div>
      <div style={{ opacity: packetProgress, transform: `translateX(${(1 - packetProgress) * 90}px)`, background: '#102016', border: `1px solid ${palette.green}`, padding: 34 }}>
        <div style={{ color: palette.green, fontSize: 18, letterSpacing: 2 }}>COMPUTED EVIDENCE</div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 23, lineHeight: 1.7, marginTop: 18 }}>ground_check_connections<br />wrangler.toml → main<br />main → legacy-auth.ts<br />evidence_id: conn_204</div>
      </div>
    </div>
    <div style={{ color: blocked ? palette.red : palette.green, textAlign: 'center', fontSize: 28, marginTop: 70 }}>{blocked ? 'Ground returns the next move: check the connection graph' : 'You see the reason without replaying the investigation.'}</div>
  </Scene>;
};

const Receipt = () => <Scene eyebrow="07 / Keep the receipt">
  <div style={{ fontSize: 72, fontWeight: 620, lineHeight: 1.08, marginBottom: 62 }}>Stop auditing confidence.<br />Start reviewing the receipt.</div>
  <div style={{ display: 'flex', gap: 20 }}>{['What it checked', 'What it could not check', 'Why the claim survived'].map((item, index) => <div key={item} style={{ flex: 1, borderTop: `3px solid ${index === 2 ? palette.amber : palette.line}`, paddingTop: 22, color: index === 2 ? palette.text : palette.muted, fontSize: 30 }}>{item}</div>)}</div>
</Scene>;

const Close = () => <Scene><div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}><div style={{ fontSize: 96, fontWeight: 750 }}>Ground</div><div style={{ color: palette.muted, fontSize: 34 }}>for Claude Code + Codex</div></div><div style={{ color: palette.amber, fontSize: 48, marginTop: 30 }}>The agent does the search. You make the decision.</div></Scene>;

export interface GroundOperatorWalkthroughProps { voiceoverPath?: string }

export const GroundOperatorWalkthrough: React.FC<GroundOperatorWalkthroughProps> = ({ voiceoverPath }) => <AbsoluteFill style={{ background: palette.background }}>
  {voiceoverPath ? <Audio src={staticFile(voiceoverPath)} /> : null}
  <Sequence from={groundWalkthroughScenes.opening.from} durationInFrames={groundWalkthroughScenes.opening.duration}><Opening /></Sequence>
  <Sequence from={groundWalkthroughScenes.install.from} durationInFrames={groundWalkthroughScenes.install.duration}><Install /></Sequence>
  <Sequence from={groundWalkthroughScenes.agentSetup.from} durationInFrames={groundWalkthroughScenes.agentSetup.duration}><AgentSetup /></Sequence>
  <Sequence from={groundWalkthroughScenes.agentGuidance.from} durationInFrames={groundWalkthroughScenes.agentGuidance.duration}><AgentGuidance /></Sequence>
  <Sequence from={groundWalkthroughScenes.mechanics.from} durationInFrames={groundWalkthroughScenes.mechanics.duration}><Mechanics /></Sequence>
  <Sequence from={groundWalkthroughScenes.claim.from} durationInFrames={groundWalkthroughScenes.claim.duration}><ClaimGate /></Sequence>
  <Sequence from={groundWalkthroughScenes.rust.from} durationInFrames={groundWalkthroughScenes.rust.duration}><WhyRust /></Sequence>
  <Sequence from={groundWalkthroughScenes.receipt.from} durationInFrames={groundWalkthroughScenes.receipt.duration}><Receipt /></Sequence>
  <Sequence from={groundWalkthroughScenes.close.from} durationInFrames={groundWalkthroughScenes.close.duration}><Close /></Sequence>
</AbsoluteFill>;
