import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Composition,
  registerRoot,
  useCurrentFrame,
  delayRender,
  continueRender,
  cancelRender
} from 'remotion';
import { Renderer } from '../../mapping-canvas/src/lib/animation/render';
import {
  newProject,
  validateProject,
  type Project
} from '../../mapping-canvas/src/lib/animation/model';
const DrawAnimation: React.FC<{ project: Project }> = ({ project }) => {
  const ref = useRef<HTMLCanvasElement>(null),
    renderer = useRef(new Renderer()),
    frame = useCurrentFrame();
  const [handle] = useState(() => delayRender('Decode embedded Draw artwork'));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    renderer.current
      .prepare(project.assets)
      .then(() => {
        if (active) setLoaded(true);
      })
      .catch(cancelRender);
    return () => {
      active = false;
    };
  }, [project.assets]);
  useLayoutEffect(() => {
    if (loaded && ref.current) {
      renderer.current.paint(ref.current.getContext('2d')!, project, frame / project.fps);
      continueRender(handle);
    }
  }, [loaded, project, frame, handle]);
  return (
    <canvas
      ref={ref}
      width={project.width}
      height={project.height}
      style={{ width: project.width, height: project.height }}
    />
  );
};
const Root: React.FC = () => (
  <Composition
    id="DrawAnimation"
    component={DrawAnimation}
    width={1280}
    height={720}
    fps={24}
    durationInFrames={120}
    defaultProps={{ project: newProject() }}
    calculateMetadata={({ props }) => {
      validateProject(props.project);
      return {
        width: props.project.width,
        height: props.project.height,
        fps: props.project.fps,
        durationInFrames: Math.ceil(props.project.duration * props.project.fps)
      };
    }}
  />
);
registerRoot(Root);
