/**
 * Upload Handler
 * Receives audio files, stores in R2, queues for processing
 * "From sound to understanding through the queue"
 */

import type { Env, UploadRequest, UploadResponse, ProcessingMessage } from '../types';

export async function handleUpload(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Expect multipart form data with audio file
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse<UploadResponse>(
        { success: false, message: 'Expected multipart/form-data with audio file' },
        400
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const metadataJson = formData.get('metadata') as string | null;

    if (!audioFile) {
      return jsonResponse<UploadResponse>(
        { success: false, message: 'No audio file provided' },
        400
      );
    }

    // Parse metadata
    let metadata: UploadRequest = {};
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson);
      } catch {
        return jsonResponse<UploadResponse>(
          { success: false, message: 'Invalid metadata JSON' },
          400
        );
      }
    }

    // Generate meeting ID
    const meetingId = crypto.randomUUID();
    const recordedAt = metadata.recordedAt || new Date().toISOString();

    // Determine audio format from file
    const audioFormat = getAudioFormat(audioFile.name, audioFile.type);
    const audioKey = `${recordedAt.slice(0, 10)}/${meetingId}.${audioFormat}`;

    // Store audio in R2
    const audioBuffer = await audioFile.arrayBuffer();
    await env.STORAGE.put(audioKey, audioBuffer, {
      httpMetadata: {
        contentType: audioFile.type || `audio/${audioFormat}`,
      },
      customMetadata: {
        meetingId,
        recordedAt,
        originalName: audioFile.name,
      },
    });

    // Create meeting record in D1 with 'processing' status
    await env.DB.prepare(`
      INSERT INTO meetings (
        id, recorded_at, title, project_id, property, tags, participants,
        audio_key, audio_size_bytes, audio_format, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')
    `)
      .bind(
        meetingId,
        recordedAt,
        metadata.title || null,
        metadata.projectId || null,
        metadata.property || null,
        metadata.tags ? JSON.stringify(metadata.tags) : null,
        metadata.participants ? JSON.stringify(metadata.participants) : null,
        audioKey,
        audioBuffer.byteLength,
        audioFormat
      )
      .run();

    // Queue for async processing (no timeout issues)
    const message: ProcessingMessage = {
      meetingId,
      audioKey,
    };
    await env.PROCESSING_QUEUE.send(message);

    console.log(`Queued meeting ${meetingId} for processing`);

    return jsonResponse<UploadResponse>({
      success: true,
      meetingId,
      message: 'Meeting uploaded and queued for processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return jsonResponse<UploadResponse>(
      {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
}

function getAudioFormat(filename: string, mimeType: string): string {
  // Try to get from filename extension
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && ['mp3', 'wav', 'webm', 'm4a', 'ogg', 'flac'].includes(ext)) {
    return ext;
  }

  // Fall back to mime type
  const mimeMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  };

  return mimeMap[mimeType] || 'mp3';
}

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
