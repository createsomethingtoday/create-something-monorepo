import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
  createTranscriptEditorProject,
  validateTranscriptEditorProject,
  type InitializeTranscriptEditorProjectInput,
  type TranscriptEditorProject
} from '@create-something/atlas-composition';

import { getStudioHome, readSession, writeSession } from './store.js';
import type { AtlasSession } from './types.js';

export type CreateAtlasMediaProjectInput = Omit<
  TranscriptEditorProject,
  'schema' | 'atlasSessionId'
>;
export type TimestampedTranscriptLine = Omit<
  InitializeTranscriptEditorProjectInput['transcriptSegments'][number],
  'assetId' | 'id'
>;

function parseTimestamp(value: string): number {
  const parts = value.trim().split(':');
  const seconds = Number(parts.pop());
  const minutes = parts.length ? Number(parts.pop()) : 0;
  const hours = parts.length ? Number(parts.pop()) : 0;
  if (parts.length || !Number.isFinite(seconds) || !Number.isFinite(minutes) || !Number.isFinite(hours) || seconds < 0 || minutes < 0 || hours < 0) {
    throw new Error(`Invalid timestamp: ${value.trim()}`);
  }
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1_000_000);
}

/** Parses local-only `00:00.000 --> 00:03.500 | Transcript text` lines. */
export function parseTimestampedTranscript(text: string): TimestampedTranscriptLine[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('At least one timestamped transcript line is required.');
  return lines.map((line) => {
    const match = line.match(/^(.+?)\s*-->\s*(.+?)\s*\|\s*(.+)$/);
    if (!match) throw new Error('Each transcript line must use `00:00.000 --> 00:03.500 | Text`.');
    const startUs = parseTimestamp(match[1]);
    const endUs = parseTimestamp(match[2]);
    if (endUs <= startUs) throw new Error('Transcript end time must be after its start time.');
    return { startUs, endUs, text: match[3].trim() };
  });
}

export function getAtlasMediaProjectPath(projectId: string, cwd = process.cwd()): string {
  return path.join(getStudioHome(cwd), 'media-projects', projectId, 'project.v1.json');
}

async function ensureMediaProjectDir(projectId: string, cwd = process.cwd()): Promise<void> {
  await mkdir(path.dirname(getAtlasMediaProjectPath(projectId, cwd)), { recursive: true });
}

function assertProjectForSession(project: TranscriptEditorProject, session: AtlasSession): void {
  if (project.atlasSessionId !== session.id) {
    throw new Error(`Media project ${project.id} belongs to a different Atlas session.`);
  }
  const validation = validateTranscriptEditorProject(project);
  if (!validation.ok) {
    throw new Error(`Invalid media project: ${validation.issues.join(' ')}`);
  }
}

export async function createAtlasMediaProject(
  sessionId: string,
  input: CreateAtlasMediaProjectInput,
  cwd = process.cwd()
): Promise<{ project: TranscriptEditorProject; session: AtlasSession }> {
  const session = await readSession(sessionId, cwd);
  if (session.mediaProject) {
    throw new Error(`Atlas session ${sessionId} already has media project ${session.mediaProject.projectId}.`);
  }
  const project: TranscriptEditorProject = {
    ...input,
    proposals: input.proposals ?? [],
    receipts: input.receipts ?? [],
    schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
    atlasSessionId: session.id
  };
  assertProjectForSession(project, session);
  const projectPath = getAtlasMediaProjectPath(project.id, cwd);
  if (existsSync(projectPath)) throw new Error(`Media project already exists: ${project.id}`);
  await ensureMediaProjectDir(project.id, cwd);
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
  const updatedSession = await writeSession(
    {
      ...session,
      mediaProject: {
        schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
        projectId: project.id,
        currentRevisionId: project.currentRevisionId,
        updatedAt: new Date().toISOString()
      }
    },
    cwd
  );
  return { project, session: updatedSession };
}

export async function initializeAtlasMediaProject(
  sessionId: string,
  input: Omit<InitializeTranscriptEditorProjectInput, 'atlasSessionId'>,
  cwd = process.cwd()
): Promise<{ project: TranscriptEditorProject; session: AtlasSession }> {
  const project = createTranscriptEditorProject({ ...input, atlasSessionId: sessionId });
  const { atlasSessionId: _atlasSessionId, schema: _schema, ...createInput } = project;
  return createAtlasMediaProject(sessionId, createInput, cwd);
}

export async function readAtlasMediaProject(
  sessionId: string,
  cwd = process.cwd()
): Promise<TranscriptEditorProject> {
  const session = await readSession(sessionId, cwd);
  if (!session.mediaProject) throw new Error(`Atlas session ${sessionId} has no media project.`);
  const raw = await readFile(getAtlasMediaProjectPath(session.mediaProject.projectId, cwd), 'utf8');
  const project = JSON.parse(raw) as TranscriptEditorProject;
  assertProjectForSession(project, session);
  if (project.currentRevisionId !== session.mediaProject.currentRevisionId) {
    throw new Error(`Media project ${project.id} revision does not match its Atlas session reference.`);
  }
  return project;
}

export async function writeAtlasMediaProject(
  sessionId: string,
  project: TranscriptEditorProject,
  cwd = process.cwd()
): Promise<{ project: TranscriptEditorProject; session: AtlasSession }> {
  const session = await readSession(sessionId, cwd);
  if (session.mediaProject?.projectId !== project.id) {
    throw new Error(`Media project ${project.id} is not attached to Atlas session ${sessionId}.`);
  }
  assertProjectForSession(project, session);
  await ensureMediaProjectDir(project.id, cwd);
  await writeFile(getAtlasMediaProjectPath(project.id, cwd), `${JSON.stringify(project, null, 2)}\n`, 'utf8');
  const updatedSession = await writeSession(
    {
      ...session,
      mediaProject: {
        schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
        projectId: project.id,
        currentRevisionId: project.currentRevisionId,
        updatedAt: new Date().toISOString()
      }
    },
    cwd
  );
  return { project, session: updatedSession };
}
