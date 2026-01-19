/**
 * Seeing Commercial - Marketing video for learn.createsomething.space/seeing
 * 
 * A 60-second commercial that introduces the Subtractive Triad philosophy
 * and promotes the free "Seeing" course.
 * 
 * Target: Developers who want to write better code through perception
 * Message: "Before you can build well, you must perceive well."
 * 
 * Structure:
 * 1. Hook: The problem with modern development
 * 2. Philosophy: The Subtractive Triad
 * 3. Journey: Seeing → Dwelling
 * 4. CTA: Install and start learning
 */
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { Eye, RefreshCw, Scissors, Link, Terminal, GraduationCap, ChevronRight } from 'lucide-react';
import { KineticText } from '../../primitives/KineticText';
import { FadeIn } from '../../primitives/FadeIn';
import { ScaleIn } from '../../primitives/ScaleIn';
import { FilmGrain, Vignette } from '../../primitives/FilmGrain';
import { colors, typography, spacing, voxPresets } from '../../styles';

// Scene timing (at 30fps)
const SCENES = {
  // Act 1: The Problem (0-6s)
  hook: { start: 0, duration: 90 }, // 3s - Opening question
  problem: { start: 90, duration: 90 }, // 3s - The mess
  
  // Act 2: The Solution (6-26s)
  philosophy: { start: 180, duration: 90 }, // 3s - "Creation is subtraction"
  triad: { start: 270, duration: 270 }, // 9s - DRY, Rams, Heidegger
  framework: { start: 540, duration: 120 }, // 4s - How it works together
  
  // Act 3: The Journey (26-42s)
  seeingIntro: { start: 660, duration: 90 }, // 3s - Introduce Seeing
  seeingFeatures: { start: 750, duration: 180 }, // 6s - What you get
  dwelling: { start: 930, duration: 90 }, // 3s - Glimpse of mastery
  
  // Act 4: Call to Action (42-50s)
  install: { start: 1020, duration: 120 }, // 4s - Installation steps
  logo: { start: 1140, duration: 60 }, // 2s - Final logo
} as const;

const TOTAL_DURATION = 1200; // 40 seconds at 30fps

interface SeeingCommercialProps {
  theme?: keyof typeof voxPresets;
}

/**
 * Hook Scene - Opening question that draws viewers in
 */
const HookScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <KineticText
        text="What if the best code"
        reveal="unconcealment"
        startFrame={10}
        duration={35}
        style="display"
        color={palette.foreground}
        align="center"
      />
      <div style={{ height: spacing[4] }} />
      <KineticText
        text="is the code you don't write?"
        reveal="unconcealment"
        startFrame={45}
        duration={35}
        style="display"
        color={palette.foreground}
        align="center"
      />
      <FilmGrain intensity={0.06} animated />
      <Vignette intensity={0.25} size={40} />
    </AbsoluteFill>
  );
};

/**
 * Problem Scene - The mess developers face
 */
const ProblemScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const problems = [
    'Duplication hidden everywhere',
    'Features no one uses',
    'Systems that don\'t connect',
  ];
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <div
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.caption,
          color: palette.muted,
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
          marginBottom: spacing[6],
        }}
      >
        The Problem
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        {problems.map((problem, i) => {
          const startFrame = 15 + i * 20;
          const localFrame = frame - startFrame;
          const progress = spring({
            fps,
            frame: localFrame,
            config: { damping: 20, mass: 0.6, stiffness: 100 },
          });
          
          return (
            <div
              key={i}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.fontSize.h2,
                fontWeight: typography.fontWeight.medium,
                color: palette.foreground,
                opacity: Math.max(0, progress),
                transform: `translateX(${interpolate(progress, [0, 1], [-30, 0])}px)`,
              }}
            >
              {problem}
            </div>
          );
        })}
      </div>
      
      <FilmGrain intensity={0.08} animated />
      <Vignette intensity={0.3} size={35} />
    </AbsoluteFill>
  );
};

/**
 * Philosophy Scene - The meta-principle
 */
const PhilosophyScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <KineticText
        text="CREATION IS SUBTRACTION"
        reveal="decode"
        startFrame={5}
        duration={70}
        style="display"
        color={palette.foreground}
        align="center"
      />
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={45} />
    </AbsoluteFill>
  );
};

/**
 * Triad Scene - The three questions
 */
const TriadScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const triad = [
    {
      icon: RefreshCw,
      name: 'DRY',
      question: '"Have I built this before?"',
      action: 'Unify',
      delay: 0,
    },
    {
      icon: Scissors,
      name: 'Rams',
      question: '"Does this earn its existence?"',
      action: 'Remove',
      delay: 80,
    },
    {
      icon: Link,
      name: 'Heidegger',
      question: '"Does this serve the whole?"',
      action: 'Reconnect',
      delay: 160,
    },
  ];
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[12],
      }}
    >
      <div
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.caption,
          color: palette.muted,
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
          marginBottom: spacing[10],
        }}
      >
        The Subtractive Triad
      </div>
      
      <div style={{ display: 'flex', gap: spacing[8], justifyContent: 'center' }}>
        {triad.map((item, i) => {
          const localFrame = frame - item.delay;
          const progress = spring({
            fps,
            frame: localFrame,
            config: { damping: 18, mass: 0.5, stiffness: 100 },
          });
          
          const Icon = item.icon;
          
          return (
            <div
              key={i}
              style={{
                width: 340,
                padding: spacing[6],
                backgroundColor: `${palette.foreground}05`,
                border: `1px solid ${palette.foreground}10`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: spacing[3],
                opacity: Math.max(0, progress),
                transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
              }}
            >
              <Icon size={40} strokeWidth={1.5} color={palette.foreground} />
              
              <div
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.fontSize.h3,
                  fontWeight: typography.fontWeight.bold,
                  color: palette.foreground,
                }}
              >
                {item.name}
              </div>
              
              <div
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.fontSize.bodyLg,
                  color: palette.muted,
                  fontStyle: 'italic',
                }}
              >
                {item.question}
              </div>
              
              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: typography.fontSize.sm,
                  color: palette.foreground,
                  letterSpacing: typography.letterSpacing.wide,
                  textTransform: 'uppercase',
                  marginTop: spacing[2],
                }}
              >
                Action: {item.action}
              </div>
            </div>
          );
        })}
      </div>
      
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={50} />
    </AbsoluteFill>
  );
};

/**
 * Framework Scene - How it works together
 */
const FrameworkScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  
  // Connection line animation
  const lineProgress = interpolate(frame, [30, 90], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <KineticText
        text="Three questions, asked in order."
        reveal="mask"
        startFrame={5}
        duration={40}
        style="headline"
        color={palette.foreground}
        align="center"
      />
      
      <div style={{ height: spacing[8] }} />
      
      {/* Visual representation of flow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[4],
          marginTop: spacing[6],
        }}
      >
        {['DRY', 'Rams', 'Heidegger'].map((name, i) => (
          <React.Fragment key={name}>
            <FadeIn startFrame={45 + i * 15} duration={15}>
              <div
                style={{
                  padding: `${spacing[3]}px ${spacing[5]}px`,
                  border: `1px solid ${palette.foreground}30`,
                  borderRadius: 4,
                  fontFamily: typography.fontFamily.mono,
                  fontSize: typography.fontSize.body,
                  color: palette.foreground,
                }}
              >
                {name}
              </div>
            </FadeIn>
            {i < 2 && (
              <FadeIn startFrame={55 + i * 15} duration={10}>
                <ChevronRight size={24} color={palette.muted} />
              </FadeIn>
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div style={{ height: spacing[8] }} />
      
      <FadeIn startFrame={85} duration={20}>
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.h4,
            color: palette.muted,
            textAlign: 'center',
          }}
        >
          Reveal what obscures your code.
        </div>
      </FadeIn>
      
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={45} />
    </AbsoluteFill>
  );
};

/**
 * Seeing Intro Scene - Introduce the product
 */
const SeeingIntroScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const eyeScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 15, mass: 0.8, stiffness: 80 },
  });
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <div
        style={{
          transform: `scale(${Math.max(0, eyeScale)})`,
          marginBottom: spacing[6],
        }}
      >
        <Eye size={80} strokeWidth={1} color={palette.foreground} />
      </div>
      
      <KineticText
        text="Learn to See"
        reveal="threshold"
        startFrame={25}
        duration={10}
        style="display"
        color={palette.foreground}
        align="center"
      />
      
      <div style={{ height: spacing[4] }} />
      
      <FadeIn startFrame={40} duration={20}>
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.h4,
            color: palette.muted,
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          Before you can build well, you must perceive well.
        </div>
      </FadeIn>
      
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={45} />
    </AbsoluteFill>
  );
};

/**
 * Seeing Features Scene - What you get
 */
const SeeingFeaturesScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const features = [
    { icon: '01', text: 'Philosophy lessons' },
    { icon: '02', text: 'Triad commands (/dry, /rams, /heidegger)' },
    { icon: '03', text: 'Self-assessed reflections' },
    { icon: '04', text: 'Progress tracking' },
    { icon: '05', text: 'Gemini CLI (1,000 free/day)' },
  ];
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[12],
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: spacing[16],
          alignItems: 'flex-start',
        }}
      >
        {/* Left: Title and price */}
        <div style={{ flex: 1, maxWidth: 400 }}>
          <KineticText
            text="Seeing"
            reveal="mask"
            startFrame={5}
            duration={25}
            style="display"
            color={palette.foreground}
            align="left"
          />
          
          <FadeIn startFrame={30} duration={15}>
            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.fontSize.h1,
                fontWeight: typography.fontWeight.light,
                color: palette.foreground,
                marginTop: spacing[4],
              }}
            >
              Free
            </div>
          </FadeIn>
          
          <FadeIn startFrame={45} duration={15}>
            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.fontSize.body,
                color: palette.muted,
                marginTop: spacing[2],
              }}
            >
              Vorhandenheit — Present-at-hand.
              <br />
              You notice the tools, study the patterns.
            </div>
          </FadeIn>
        </div>
        
        {/* Right: Features */}
        <div style={{ flex: 1, maxWidth: 500 }}>
          {features.map((feature, i) => {
            const startFrame = 40 + i * 20;
            const localFrame = frame - startFrame;
            const progress = spring({
              fps,
              frame: localFrame,
              config: { damping: 20, mass: 0.5, stiffness: 120 },
            });
            
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[4],
                  marginBottom: spacing[4],
                  opacity: Math.max(0, progress),
                  transform: `translateX(${interpolate(progress, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: typography.fontSize.caption,
                    color: palette.muted,
                    width: 30,
                  }}
                >
                  {feature.icon}
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typography.fontSize.bodyLg,
                    color: palette.foreground,
                  }}
                >
                  {feature.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={50} />
    </AbsoluteFill>
  );
};

/**
 * Dwelling Scene - Glimpse of mastery
 */
const DwellingScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <FadeIn startFrame={5} duration={15}>
        <GraduationCap size={60} strokeWidth={1} color={palette.muted} />
      </FadeIn>
      
      <div style={{ height: spacing[4] }} />
      
      <KineticText
        text="Graduate when ready."
        reveal="typewriter"
        startFrame={20}
        duration={50}
        style="headline"
        color={palette.foreground}
        align="center"
      />
      
      <div style={{ height: spacing[4] }} />
      
      <FadeIn startFrame={70} duration={15}>
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.body,
            color: palette.muted,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          "Tools recede into transparent use."
        </div>
      </FadeIn>
      
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={45} />
    </AbsoluteFill>
  );
};

/**
 * Install Scene - Call to action
 */
const InstallScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const commands = [
    'npm install -g @google/gemini-cli',
    'gemini extensions install @createsomething/seeing',
    '/lesson what-is-creation',
  ];
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <Terminal size={48} strokeWidth={1.5} color={palette.muted} />
      
      <div style={{ height: spacing[6] }} />
      
      <KineticText
        text="Start Seeing"
        reveal="threshold"
        startFrame={10}
        duration={5}
        style="headline"
        color={palette.foreground}
        align="center"
      />
      
      <div style={{ height: spacing[8] }} />
      
      {/* Terminal commands */}
      <div
        style={{
          backgroundColor: colors.neutral[950],
          border: `1px solid ${colors.neutral[800]}`,
          borderRadius: 8,
          padding: spacing[6],
          minWidth: 600,
        }}
      >
        {commands.map((cmd, i) => {
          const startFrame = 25 + i * 25;
          const localFrame = frame - startFrame;
          
          // Typewriter effect
          const charsToShow = interpolate(localFrame, [0, 30], [0, cmd.length], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          
          const opacity = localFrame > 0 ? 1 : 0;
          
          return (
            <div
              key={i}
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.body,
                color: palette.foreground,
                marginBottom: i < commands.length - 1 ? spacing[3] : 0,
                opacity,
              }}
            >
              <span style={{ color: colors.neutral[500] }}>$ </span>
              <span>{cmd.slice(0, Math.floor(charsToShow))}</span>
              {charsToShow < cmd.length && charsToShow > 0 && (
                <span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>▌</span>
              )}
            </div>
          );
        })}
      </div>
      
      <FilmGrain intensity={0.05} animated />
      <Vignette intensity={0.2} size={45} />
    </AbsoluteFill>
  );
};

/**
 * Logo Scene - Final brand moment
 */
const LogoScene: React.FC<{ palette: typeof voxPresets[keyof typeof voxPresets] }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const logoProgress = spring({
    fps,
    frame: frame - 5,
    config: { damping: 20, mass: 0.8, stiffness: 60 },
  });
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      <div
        style={{
          opacity: Math.max(0, logoProgress),
          transform: `scale(${interpolate(logoProgress, [0, 1], [0.9, 1])})`,
        }}
      >
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.displayXl,
            fontWeight: typography.fontWeight.bold,
            color: palette.foreground,
            letterSpacing: typography.letterSpacing.tight,
            textTransform: 'uppercase',
          }}
        >
          CREATE SOMETHING
        </div>
        
        <div
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.h4,
            color: palette.muted,
            textAlign: 'center',
            letterSpacing: typography.letterSpacing.wider,
            marginTop: spacing[3],
          }}
        >
          .learn
        </div>
      </div>
      
      <FadeIn startFrame={30} duration={15}>
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.body,
            color: palette.muted,
            marginTop: spacing[8],
          }}
        >
          learn.createsomething.space/seeing
        </div>
      </FadeIn>
      
      <FilmGrain intensity={0.04} animated />
      <Vignette intensity={0.15} size={50} />
    </AbsoluteFill>
  );
};

/**
 * Main Commercial Composition
 */
export const SeeingCommercial: React.FC<SeeingCommercialProps> = ({ theme = 'ltd' }) => {
  const palette = voxPresets[theme];
  
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      {/* Act 1: The Problem */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration} name="Hook">
        <HookScene palette={palette} />
      </Sequence>
      
      <Sequence from={SCENES.problem.start} durationInFrames={SCENES.problem.duration} name="Problem">
        <ProblemScene palette={palette} />
      </Sequence>
      
      {/* Act 2: The Solution */}
      <Sequence from={SCENES.philosophy.start} durationInFrames={SCENES.philosophy.duration} name="Philosophy">
        <PhilosophyScene palette={palette} />
      </Sequence>
      
      <Sequence from={SCENES.triad.start} durationInFrames={SCENES.triad.duration} name="Triad">
        <TriadScene palette={palette} />
      </Sequence>
      
      <Sequence from={SCENES.framework.start} durationInFrames={SCENES.framework.duration} name="Framework">
        <FrameworkScene palette={palette} />
      </Sequence>
      
      {/* Act 3: The Journey */}
      <Sequence from={SCENES.seeingIntro.start} durationInFrames={SCENES.seeingIntro.duration} name="Seeing Intro">
        <SeeingIntroScene palette={palette} />
      </Sequence>
      
      <Sequence from={SCENES.seeingFeatures.start} durationInFrames={SCENES.seeingFeatures.duration} name="Seeing Features">
        <SeeingFeaturesScene palette={palette} />
      </Sequence>
      
      <Sequence from={SCENES.dwelling.start} durationInFrames={SCENES.dwelling.duration} name="Dwelling">
        <DwellingScene palette={palette} />
      </Sequence>
      
      {/* Act 4: Call to Action */}
      <Sequence from={SCENES.install.start} durationInFrames={SCENES.install.duration} name="Install">
        <InstallScene palette={palette} />
      </Sequence>
      
      <Sequence from={SCENES.logo.start} durationInFrames={SCENES.logo.duration} name="Logo">
        <LogoScene palette={palette} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const SEEING_COMMERCIAL_DURATION = TOTAL_DURATION;

export default SeeingCommercial;
