import { z } from 'zod';
import {
  MANSFIELD_FIELDHOUSE_84X50,
  calibrateCourt,
  courtLineDistances,
  courtZone,
  projectCourtPoint,
  type CourtCalibrationPoint
} from './court.js';
import { capturedFilmAnalysisSchema } from './film.js';

export const FILM_COURT_CALIBRATION_PROFILE = MANSFIELD_FIELDHOUSE_84X50.profile;

const pointSchema = z.tuple([z.number(), z.number()]);
const calibrationPointSchema = z.object({ id: z.string().min(1), image: pointSchema, court: pointSchema });
const cameraStateSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  floorContactMethod: z.enum(['segmentation-mask-bottom', 'source-footpoint']),
  keypoints: z.array(calibrationPointSchema).min(4),
  heldOut: z.array(calibrationPointSchema).min(2)
});

export const filmCourtCalibrationManifestSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_COURT_CALIBRATION_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  personDetectionExecuted: z.literal(false),
  cameraStates: z.array(cameraStateSchema).min(1)
});

export function applyFilmCourtCalibration(sourceInput: unknown, manifestInput: unknown, analyzedAt = new Date().toISOString()) {
  const source = capturedFilmAnalysisSchema.parse(sourceInput);
  const manifest = filmCourtCalibrationManifestSchema.parse(manifestInput);
  if (source.analysis.revision !== 3) throw new Error('Mansfield court calibration must derive from immutable revision 3.');
  if (manifest.sourceSha256 !== source.source.sha256) throw new Error('Court calibration manifest does not match the source video fingerprint.');

  const states = manifest.cameraStates.toSorted((left, right) => left.startMs - right.startMs);
  for (let index = 0; index < states.length; index += 1) {
    const state = states[index]!;
    if (state.endMs < state.startMs) throw new Error(`Camera state ${state.id} ends before it starts.`);
    if (index && state.startMs <= states[index - 1]!.endMs) throw new Error(`Camera state ${state.id} overlaps ${states[index - 1]!.id}.`);
  }
  const calibratedStates = states.map((state) => {
    const calibration = calibrateCourt({
      profile: manifest.profile,
      keypoints: state.keypoints as CourtCalibrationPoint[],
      heldOut: state.heldOut as CourtCalibrationPoint[]
    });
    if (!calibration.validation.passed) throw new Error(`Camera state ${state.id} fails the one-foot p95 held-out calibration gate.`);
    return { ...state, calibration };
  });

  let calibratedCoordinates = 0;
  let estimatedCoordinates = 0;
  const frames = source.frames.map((frame) => {
    const state = calibratedStates.find((candidate) => frame.timeMs >= candidate.startMs && frame.timeMs <= candidate.endMs);
    return {
      ...frame,
      players: frame.players.map((player) => {
        const isResolvedTarget = player.team === 'target' && frame.targetStatus === 'resolved';
        if (!state || !player.image) {
          if (isResolvedTarget) estimatedCoordinates += 1;
          return player;
        }
        const projected = projectCourtPoint(state.calibration, player.image);
        if (!projected.insideCourt) {
          if (isResolvedTarget) estimatedCoordinates += 1;
          return player;
        }
        if (isResolvedTarget) calibratedCoordinates += 1;
        return {
          ...player,
          court: projected.court,
          projection: 'calibrated' as const,
          zone: courtZone(projected.court, MANSFIELD_FIELDHOUSE_84X50),
          courtGeometry: {
            profile: manifest.profile,
            cameraStateId: state.id,
            floorContactMethod: state.floorContactMethod,
            uncertaintyFeet: state.calibration.validation.p95ErrorFeet,
            nearestMarkings: courtLineDistances(projected.court, MANSFIELD_FIELDHOUSE_84X50).slice(0, 3)
          }
        };
      })
    };
  });
  if (!calibratedCoordinates) throw new Error('Court calibration produced no source-backed player #13 coordinates.');
  const maximumStateP95ErrorFeet = Math.max(...calibratedStates.map((state) => state.calibration.validation.p95ErrorFeet));

  return capturedFilmAnalysisSchema.parse({
    ...source,
    analysis: {
      ...source.analysis,
      revision: 4,
      derivedFromRevision: 3,
      analyzedAt,
      personDetectionExecuted: false,
      courtCalibrationVerification: {
        profile: manifest.profile,
        method: 'source-camera-state-homography-held-out-v2',
        sourceSha256: source.source.sha256,
        requiredP95ErrorFeet: 1,
        passingCameraStates: calibratedStates.length,
        calibratedCoordinates,
        estimatedCoordinates,
        maximumStateP95ErrorFeet,
        personDetectionExecuted: false
      }
    },
    frames
  });
}
