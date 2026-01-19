/**
 * TriadScene - The three questions with kinetic typography
 * 
 * /dry → "Have I built this before?" → UNIFY
 * /rams → "Does this earn its existence?" → REMOVE  
 * /heidegger → "Does this serve the whole?" → RECONNECT
 * 
 * Motion transitions between each question.
 */
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { KineticHeadline, MotionTransition } from '../../shared/primitives';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

interface QuestionCardProps {
  command: string;
  question: string;
  action: string;
  startFrame: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  command,
  question,
  action,
  startFrame,
}) => {
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      {/* Command */}
      <KineticHeadline
        text={command}
        entrance="slide-up"
        exit="none"
        startFrame={0}
        entranceDuration={12}
        holdFrames={80}
        size="subhead"
        color={colors.neutral[500]}
        fontFamily="mono"
      />
      
      {/* Question */}
      <KineticHeadline
        text={question}
        entrance="slide-left"
        exit="none"
        startFrame={8}
        entranceDuration={15}
        holdFrames={72}
        size="display"
        color={colors.neutral[50]}
      />
      
      {/* Action */}
      <KineticHeadline
        text={action}
        entrance="scale-up"
        exit="none"
        startFrame={30}
        entranceDuration={12}
        holdFrames={50}
        size="headline"
        color={colors.neutral[300]}
        subtext=""
      />
    </AbsoluteFill>
  );
};

export const TriadScene: React.FC = () => {
  const scene = SPEC.scenes.triad;
  const triad = SPEC.triad;
  const questionDuration = 90; // 3s per question
  
  return (
    <AbsoluteFill>
      {/* "Three questions." intro */}
      <Sequence from={0} durationInFrames={60}>
        <MotionTransition type="slide-right" startFrame={0} duration={15}>
          <AbsoluteFill
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KineticHeadline
              text="Three questions."
              entrance="none"
              exit="push-left"
              startFrame={0}
              holdFrames={45}
              exitDuration={12}
              size="headline"
              color={colors.neutral[50]}
            />
          </AbsoluteFill>
        </MotionTransition>
      </Sequence>
      
      {/* Question 1: DRY */}
      <Sequence from={60} durationInFrames={questionDuration}>
        <MotionTransition type="wipe-left" startFrame={0} duration={15}>
          <QuestionCard
            command={triad[0].command}
            question={triad[0].question}
            action={triad[0].action}
            startFrame={0}
          />
        </MotionTransition>
      </Sequence>
      
      {/* Question 2: Rams */}
      <Sequence from={60 + questionDuration} durationInFrames={questionDuration}>
        <MotionTransition type="push-left" startFrame={0} duration={15}>
          <QuestionCard
            command={triad[1].command}
            question={triad[1].question}
            action={triad[1].action}
            startFrame={0}
          />
        </MotionTransition>
      </Sequence>
      
      {/* Question 3: Heidegger */}
      <Sequence from={60 + questionDuration * 2} durationInFrames={questionDuration}>
        <MotionTransition type="slide-right" startFrame={0} duration={15}>
          <QuestionCard
            command={triad[2].command}
            question={triad[2].question}
            action={triad[2].action}
            startFrame={0}
          />
        </MotionTransition>
      </Sequence>
    </AbsoluteFill>
  );
};

export default TriadScene;
