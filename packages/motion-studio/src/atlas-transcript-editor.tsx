import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

export type AtlasTranscriptRenderClip = {
  id: string;
  nodeId: string;
  kind: 'video' | 'caption' | 'overlay';
  from: number;
  durationInFrames: number;
  label: string;
  sourceUri?: string;
  sourceStartFrom?: number;
};

export type AtlasTranscriptRenderProps = {
  projectId: string;
  revisionId: string;
  clips: AtlasTranscriptRenderClip[];
  durationInFrames: number;
  width: number;
  height: number;
  title?: string;
};

export const ATLAS_TRANSCRIPT_RENDER_DEFAULT_PROPS: AtlasTranscriptRenderProps = {
  projectId: 'synthetic-project',
  revisionId: 'revision-1',
  durationInFrames: 150,
  width: 1920,
  height: 1080,
  title: 'Atlas transcript edit',
  clips: [
    {
      id: 'video:synthetic-opening',
      nodeId: 'clip:synthetic-opening',
      kind: 'video',
      from: 0,
      durationInFrames: 90,
      label: 'Synthetic opening clip'
    },
    {
      id: 'caption:synthetic-opening',
      nodeId: 'clip:synthetic-opening',
      kind: 'caption',
      from: 0,
      durationInFrames: 90,
      label: 'Synthetic caption'
    },
    {
      id: 'video:synthetic-closing',
      nodeId: 'clip:synthetic-closing',
      kind: 'video',
      from: 90,
      durationInFrames: 60,
      label: 'Synthetic closing clip'
    }
  ]
};

const palette = {
  background: '#0d0d0c',
  foreground: '#f8f4eb',
  muted: '#a5a299',
  video: '#d7ff5f',
  caption: '#89c7ff',
  overlay: '#ecabff'
} as const;

function clipColor(kind: AtlasTranscriptRenderClip['kind']): string {
  return palette[kind];
}

export const AtlasTranscriptTimeline: React.FC<AtlasTranscriptRenderProps> = ({
  clips,
  projectId,
  revisionId,
  title = 'Atlas transcript edit'
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const videoClips = clips.filter((clip) => clip.kind === 'video');
  const active = videoClips.find((clip) => frame >= clip.from && frame < clip.from + clip.durationInFrames);

  return (
    <AbsoluteFill style={{ background: palette.background, color: palette.foreground, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ padding: 56, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: palette.muted }}>
        <span>{title}</span>
        <span>{projectId} · {revisionId}</span>
      </div>
      {videoClips.map((clip) => (
      <Sequence key={clip.id} from={clip.from} durationInFrames={clip.durationInFrames} name={clip.nodeId}>
          {clip.sourceUri?.startsWith('http://127.0.0.1:') ? (
            <OffthreadVideo
              src={clip.sourceUri}
              startFrom={clip.sourceStartFrom ?? 0}
              endAt={(clip.sourceStartFrom ?? 0) + clip.durationInFrames}
              style={{ height: '100%', objectFit: 'cover', width: '100%' }}
            />
          ) : (
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', padding: 120 }}>
              <div style={{ border: `6px solid ${clipColor(clip.kind)}`, borderRadius: 24, padding: 64, width: '78%' }}>
                <div style={{ color: clipColor(clip.kind), fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>clip node</div>
                <div style={{ fontSize: 60, marginTop: 22 }}>{clip.label}</div>
                <div style={{ color: palette.muted, fontFamily: 'monospace', fontSize: 28, marginTop: 36 }}>{clip.nodeId}</div>
              </div>
            </AbsoluteFill>
          )}
        </Sequence>
      ))}
      {clips.filter((clip) => clip.kind !== 'video').map((clip) => (
        <Sequence key={clip.id} from={clip.from} durationInFrames={clip.durationInFrames} name={clip.id}>
          <div style={{ position: 'absolute', bottom: 78, left: 96, right: 96, textAlign: 'center', fontSize: 36, color: clipColor(clip.kind) }}>
            {clip.label}
          </div>
        </Sequence>
      ))}
      <div style={{ position: 'absolute', bottom: 28, right: 56, color: palette.muted, fontFamily: 'monospace', fontSize: 22 }}>
        frame {frame} · {fps}fps · {width}px · {active?.nodeId ?? 'no active clip'}
      </div>
    </AbsoluteFill>
  );
};

export function atlasTranscriptDurationInFrames(props: AtlasTranscriptRenderProps): number {
  const lastClip = props.clips.reduce(
    (last, clip) => Math.max(last, clip.from + clip.durationInFrames),
    0
  );
  return Math.max(1, props.durationInFrames, lastClip);
}
