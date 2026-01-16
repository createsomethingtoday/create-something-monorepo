/**
 * IDEvsTerminal - Animated transformation from IDE to Terminal
 * 
 * From chrome to canvas. Watch the interface dissolve.
 * 
 * Animation sequence:
 * - Frame 0-30: VS Code-like interface with panels, tabs, sidebar
 * - Frame 30-90: Elements dissolve one by one (sidebar, tabs, status bar)
 * - Frame 90-120: Pure black terminal with blinking cursor
 * - Frame 120-150: Text appears: "The blank canvas"
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from 'remotion';
import { KineticText } from '../../primitives/KineticText';
import { voxPresets, typography, colors } from '../../styles';

interface IDEvsTerminalProps {
  theme?: keyof typeof voxPresets;
}

export const IDEvsTerminal: React.FC<IDEvsTerminalProps> = ({ theme = 'ltd' }) => {
  const frame = useCurrentFrame();
  const palette = voxPresets[theme];

  // Dissolve timings
  const sidebarOpacity = interpolate(frame, [30, 45], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const tabsOpacity = interpolate(frame, [40, 55], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const statusBarOpacity = interpolate(frame, [50, 65], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const lineNumbersOpacity = interpolate(frame, [55, 70], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const minimapOpacity = interpolate(frame, [60, 75], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const editorBgOpacity = interpolate(frame, [70, 90], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Terminal fade in
  const terminalOpacity = interpolate(frame, [85, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  // Cursor blink
  const cursorVisible = frame > 95 && Math.floor(frame / 15) % 2 === 0;

  // Final text
  const textOpacity = interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      {/* IDE Container */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 60,
          right: 60,
          bottom: 60,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            background: colors.neutral[900],
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            opacity: tabsOpacity,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27ca40' }} />
          <span style={{ 
            marginLeft: 20, 
            fontFamily: typography.fontFamily.sans, 
            fontSize: 12, 
            color: colors.neutral[400] 
          }}>
            Visual Studio Code
          </span>
        </div>

        {/* Main content area */}
        <div style={{ display: 'flex', height: 'calc(100% - 36px - 24px)' }}>
          {/* Sidebar */}
          <div
            style={{
              width: 48,
              background: colors.neutral[900],
              borderRight: `1px solid ${colors.neutral[800]}`,
              opacity: sidebarOpacity,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: 16,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: 24,
                  height: 24,
                  background: colors.neutral[700],
                  borderRadius: 4,
                }}
              />
            ))}
          </div>

          {/* File explorer */}
          <div
            style={{
              width: 200,
              background: colors.neutral[900],
              borderRight: `1px solid ${colors.neutral[800]}`,
              opacity: sidebarOpacity,
              padding: 12,
            }}
          >
            <div style={{ fontFamily: typography.fontFamily.sans, fontSize: 11, color: colors.neutral[500], marginBottom: 8 }}>
              EXPLORER
            </div>
            {['src', '  components', '    App.tsx', '    index.ts', '  styles', 'package.json'].map((item, i) => (
              <div
                key={i}
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 12,
                  color: colors.neutral[400],
                  padding: '4px 0',
                  paddingLeft: item.startsWith('  ') ? (item.startsWith('    ') ? 24 : 12) : 0,
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
                height: 36,
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
                  fontSize: 12,
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
                  fontSize: 12,
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
                  width: 50,
                  background: colors.neutral[900],
                  padding: '12px 8px',
                  textAlign: 'right',
                  opacity: lineNumbersOpacity,
                }}
              >
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      lineHeight: '20px',
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
                  background: colors.neutral[850] || colors.neutral[900],
                  padding: 12,
                  opacity: editorBgOpacity,
                }}
              >
                <pre style={{ 
                  fontFamily: typography.fontFamily.mono, 
                  fontSize: 12, 
                  lineHeight: '20px',
                  color: colors.neutral[300],
                  margin: 0,
                }}>
{`import React from 'react';

const App = () => {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
};

export default App;`}
                </pre>
              </div>

              {/* Minimap */}
              <div
                style={{
                  width: 80,
                  background: colors.neutral[900],
                  opacity: minimapOpacity,
                  padding: 8,
                }}
              >
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 3,
                      marginBottom: 2,
                      background: colors.neutral[700],
                      width: `${30 + Math.random() * 50}%`,
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
            background: colors.neutral[800],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontFamily: typography.fontFamily.mono,
            fontSize: 11,
            color: colors.neutral[400],
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
            justifyContent: 'flex-start',
            padding: 24,
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
                height: 18,
                background: cursorVisible ? '#fff' : 'transparent',
                marginLeft: 8,
                verticalAlign: 'text-bottom',
              }}
            />
          </span>
        </div>
      </div>

      {/* Final text */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: textOpacity,
        }}
      >
        <KineticText
          text="The blank canvas."
          reveal="mask"
          startFrame={120}
          duration={20}
          style="headline"
          color={palette.foreground}
          align="center"
        />
      </div>

      {/* Phase label */}
      <div
        style={{
          position: 'absolute',
          top: 20,
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
        {frame < 30 && 'IDE — Chrome everywhere'}
        {frame >= 30 && frame < 90 && 'DISSOLVING — Removing what obscures'}
        {frame >= 90 && 'TERMINAL — Only the canvas remains'}
      </div>
    </AbsoluteFill>
  );
};

export default IDEvsTerminal;
