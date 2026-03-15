/**
 * IDEvsTerminal - Remotion composition for IDE to Terminal transformation
 * 
 * Renders from shared animation spec for consistency with Svelte version.
 * From chrome to canvas. Watch the interface dissolve.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { KineticText } from '../../primitives/KineticText';
import { voxPresets, typography, colors } from '../../styles';
import { ideVsTerminalSpec } from '../../specs/ide-vs-terminal';

interface IDEvsTerminalProps {
  theme?: keyof typeof voxPresets;
}

export const IDEvsTerminal: React.FC<IDEvsTerminalProps> = ({ theme = 'ltd' }) => {
  const frame = useCurrentFrame();
  const palette = voxPresets[theme];
  
  // Use spec values
  const spec = ideVsTerminalSpec;
  const totalFrames = (spec.duration / 1000) * (spec.fps ?? 30);
  const progress = frame / totalFrames;

  // Animation phases from spec
  const currentPhase = spec.phases.find(p => progress >= p.start && progress < p.end) 
    ?? spec.phases[spec.phases.length - 1];

  // Dissolve timings - sequential element removal
  const sidebarOpacity = interpolate(progress, [0, 0.1, 0.25], [1, 1, 0], { extrapolateRight: 'clamp' });
  const tabsOpacity = interpolate(progress, [0, 0.2, 0.35], [1, 1, 0], { extrapolateRight: 'clamp' });
  const statusBarOpacity = interpolate(progress, [0, 0.25, 0.4], [1, 1, 0], { extrapolateRight: 'clamp' });
  const lineNumbersOpacity = interpolate(progress, [0, 0.3, 0.45], [1, 1, 0], { extrapolateRight: 'clamp' });
  const minimapOpacity = interpolate(progress, [0, 0.35, 0.5], [1, 1, 0], { extrapolateRight: 'clamp' });
  const editorBgOpacity = interpolate(progress, [0, 0.4, 0.6], [1, 1, 0], { extrapolateRight: 'clamp' });

  // Terminal fade in
  const terminalOpacity = interpolate(progress, [0.5, 0.65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  // Cursor blink
  const cursorVisible = progress > 0.65 && Math.floor(frame / 15) % 2 === 0;

  // Reveal text
  const textOpacity = spec.reveal 
    ? interpolate(progress, [spec.reveal.startPhase, 1], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: spec.canvas.background }}>
      {/* IDE Container */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          right: 40,
          bottom: 40,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 28,
            background: colors.neutral[900],
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 6,
            opacity: tabsOpacity,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27ca40' }} />
          <span style={{ 
            marginLeft: 12, 
            fontFamily: typography.fontFamily.sans, 
            fontSize: 11, 
            color: colors.neutral[500] 
          }}>
            Visual Studio Code
          </span>
        </div>

        {/* Main content area */}
        <div style={{ display: 'flex', height: 'calc(100% - 52px)' }}>
          {/* Sidebar */}
          <div
            style={{
              width: 40,
              background: colors.neutral[900],
              borderRight: `1px solid ${colors.neutral[800]}`,
              opacity: sidebarOpacity,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0',
              gap: 12,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 20,
                  background: colors.neutral[700],
                  borderRadius: 3,
                }}
              />
            ))}
          </div>

          {/* File explorer */}
          <div
            style={{
              width: 140,
              background: colors.neutral[900],
              borderRight: `1px solid ${colors.neutral[800]}`,
              opacity: sidebarOpacity,
              padding: 8,
            }}
          >
            <div style={{ fontFamily: typography.fontFamily.sans, fontSize: 10, color: colors.neutral[600], marginBottom: 8, letterSpacing: '0.05em' }}>
              EXPLORER
            </div>
            {['src', '  components', '    App.tsx', '    index.ts', '  styles'].map((item, i) => (
              <div
                key={i}
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 11,
                  color: colors.neutral[400],
                  padding: '3px 0',
                  paddingLeft: item.startsWith('    ') ? 24 : item.startsWith('  ') ? 12 : 0,
                }}
              >
                {item.trim()}
              </div>
            ))}
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <div
              style={{
                height: 28,
                background: colors.neutral[900],
                borderBottom: `1px solid ${colors.neutral[800]}`,
                display: 'flex',
                opacity: tabsOpacity,
              }}
            >
              <div
                style={{
                  padding: '0 16px',
                  background: colors.neutral[800],
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 11,
                  color: colors.neutral[300],
                }}
              >
                App.tsx
              </div>
              <div
                style={{
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 11,
                  color: colors.neutral[500],
                }}
              >
                index.ts
              </div>
            </div>

            {/* Code area */}
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
              {/* Line numbers */}
              <div
                style={{
                  width: 40,
                  background: colors.neutral[900],
                  padding: '8px 4px',
                  textAlign: 'right',
                  opacity: lineNumbersOpacity,
                }}
              >
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 11,
                      lineHeight: '18px',
                      color: colors.neutral[600],
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code content */}
              <div
                style={{
                  flex: 1,
                  background: colors.neutral[900],
                  padding: 8,
                  opacity: editorBgOpacity,
                }}
              >
                <pre style={{ 
                  fontFamily: typography.fontFamily.mono, 
                  fontSize: 11, 
                  lineHeight: '18px',
                  color: colors.neutral[300],
                  margin: 0,
                }}>
{`import React from 'react';

const App = () => {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
};`}
                </pre>
              </div>

              {/* Minimap */}
              <div
                style={{
                  width: 60,
                  background: colors.neutral[900],
                  opacity: minimapOpacity,
                  padding: 8,
                }}
              >
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 2,
                      marginBottom: 2,
                      background: colors.neutral[700],
                      width: `${30 + Math.random() * 40}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div
          style={{
            height: 24,
            background: '#007acc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontFamily: typography.fontFamily.mono,
            fontSize: 11,
            color: '#fff',
            opacity: statusBarOpacity,
          }}
        >
          <span>main</span>
          <span>TypeScript React</span>
        </div>

        {/* Terminal overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000',
            opacity: terminalOpacity,
            display: 'flex',
            alignItems: 'flex-start',
            padding: 20,
          }}
        >
          <span
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: 14,
              color: '#fff',
            }}
          >
            $
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 16,
                background: cursorVisible ? '#fff' : 'transparent',
                marginLeft: 8,
                verticalAlign: 'text-bottom',
              }}
            />
          </span>
        </div>
      </div>

      {/* Reveal text */}
      {spec.reveal && textOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: textOpacity,
          }}
        >
          <KineticText
            text={spec.reveal.text}
            reveal="mask"
            startFrame={Math.floor(spec.reveal.startPhase * totalFrames)}
            duration={20}
            style="headline"
            color={palette.foreground}
            align="center"
          />
        </div>
      )}

      {/* Phase label */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.caption,
          color: palette.muted,
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
        }}
      >
        {currentPhase?.label}
      </div>
    </AbsoluteFill>
  );
};

export default IDEvsTerminal;
