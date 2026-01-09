/**
 * Processing Handler
 * Transcribes audio and generates summaries
 * "From sound to understanding"
 */

import type { Env, TranscriptionResult, SummaryResult } from '../types';

const WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo';
const WHISPER_LIMIT = 25 * 1024 * 1024; // 25MB Whisper API limit - larger files use AssemblyAI

/**
 * Process audio: transcribe with Whisper, summarize with Claude
 * Called via waitUntil for background processing
 * Supports chunked transcription for large files
 */
export async function processAudio(
  meetingId: string,
  audioBuffer: ArrayBuffer,
  audioKey: string,
  env: Env
): Promise<void> {
  try {
    // Transcribe with Whisper (chunked if necessary)
    const transcription = await transcribeAudioChunked(audioBuffer, env);

    // Generate summary with Claude
    const summary = await generateSummary(transcription.text, env);

    // Calculate duration (estimate from audio size if not available)
    const durationSeconds = estimateDuration(audioBuffer.byteLength, audioKey);

    // Update meeting record with results
    await env.DB.prepare(`
      UPDATE meetings SET
        transcript = ?,
        title = COALESCE(title, ?),
        summary = ?,
        action_items = ?,
        topics = ?,
        duration_seconds = ?,
        status = 'completed',
        processed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `)
      .bind(
        transcription.text,
        summary.title,
        summary.summary,
        JSON.stringify(summary.actionItems),
        JSON.stringify(summary.topics),
        durationSeconds,
        meetingId
      )
      .run();

    console.log(`Successfully processed meeting ${meetingId}`);
  } catch (error) {
    console.error(`Processing failed for meeting ${meetingId}:`, error);

    // Update status to failed
    await env.DB.prepare(`
      UPDATE meetings SET
        status = 'failed',
        error_message = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
      .bind(
        error instanceof Error ? error.message : 'Unknown error',
        meetingId
      )
      .run();

    throw error;
  }
}

/**
 * Transcribe audio - uses Whisper for small files, AssemblyAI for large files
 * Falls back to AssemblyAI if Whisper fails (e.g., m4a format issues)
 */
async function transcribeAudioChunked(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<TranscriptionResult> {
  const totalSize = audioBuffer.byteLength;
  console.log(`Transcribing audio: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

  // If file is small enough, try Cloudflare Workers AI (Whisper) first
  if (totalSize <= WHISPER_LIMIT) {
    console.log('Trying Cloudflare Workers AI (Whisper)');
    try {
      return await transcribeWithWhisper(audioBuffer, env);
    } catch (whisperError) {
      console.error('Whisper transcription failed:', whisperError);

      // Fall back to AssemblyAI if available
      if (env.ASSEMBLYAI_API_KEY) {
        console.log('Falling back to AssemblyAI');
        return transcribeWithAssemblyAI(audioBuffer, env);
      }

      // No fallback available, re-throw
      throw whisperError;
    }
  }

  // Large file: use AssemblyAI directly
  if (!env.ASSEMBLYAI_API_KEY) {
    throw new Error(`Audio file too large (${(totalSize / 1024 / 1024).toFixed(2)} MB) and no ASSEMBLYAI_API_KEY configured`);
  }

  console.log('File exceeds Whisper limit, using AssemblyAI');
  return transcribeWithAssemblyAI(audioBuffer, env);
}

/**
 * Transcribe using Cloudflare Workers AI (Whisper)
 */
async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<TranscriptionResult> {
  const base64Audio = bufferToBase64(audioBuffer);

  const response = await env.AI.run(WHISPER_MODEL, {
    audio: base64Audio,
  });

  return {
    text: response.text || '',
    vtt: response.vtt,
    word_count: response.word_count,
  };
}

/**
 * Transcribe using AssemblyAI (supports large files)
 */
async function transcribeWithAssemblyAI(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<TranscriptionResult> {
  const apiKey = env.ASSEMBLYAI_API_KEY;

  // Step 1: Upload audio to AssemblyAI
  console.log('Uploading audio to AssemblyAI...');
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBuffer,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`AssemblyAI upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json() as { upload_url: string };
  console.log('Audio uploaded, starting transcription...');

  // Step 2: Start transcription
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: uploadResult.upload_url,
      language_detection: true,
    }),
  });

  if (!transcriptResponse.ok) {
    const error = await transcriptResponse.text();
    throw new Error(`AssemblyAI transcription start failed: ${error}`);
  }

  const transcriptResult = await transcriptResponse.json() as { id: string; status: string };
  const transcriptId = transcriptResult.id;
  console.log(`Transcription started: ${transcriptId}`);

  // Step 3: Poll for completion (max 10 minutes)
  const maxWaitTime = 10 * 60 * 1000; // 10 minutes
  const pollInterval = 5000; // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await sleep(pollInterval);

    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.text();
      throw new Error(`AssemblyAI status check failed: ${error}`);
    }

    const status = await statusResponse.json() as {
      status: string;
      text: string | null;
      words: Array<{ text: string }> | null;
      error: string | null;
    };

    console.log(`Transcription status: ${status.status}`);

    if (status.status === 'completed') {
      const wordCount = status.words?.length || status.text?.split(/\s+/).length || 0;
      console.log(`AssemblyAI transcription complete: ${status.text?.length || 0} chars, ${wordCount} words`);

      return {
        text: status.text || '',
        word_count: wordCount,
      };
    }

    if (status.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${status.error}`);
    }
  }

  throw new Error('AssemblyAI transcription timed out after 10 minutes');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateSummary(
  transcript: string,
  env: Env
): Promise<SummaryResult> {
  // If no API key, return basic extraction
  if (!env.ANTHROPIC_API_KEY) {
    console.log('No ANTHROPIC_API_KEY, using basic extraction');
    return extractBasicSummary(transcript);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Analyze this meeting transcript and provide:
1. A concise title (5-10 words)
2. A summary (2-3 paragraphs capturing key points)
3. Action items (as a JSON array of strings)
4. Topics discussed (as a JSON array of strings)

Respond in JSON format only, no markdown:
{
  "title": "...",
  "summary": "...",
  "actionItems": ["...", "..."],
  "topics": ["...", "..."]
}

Transcript:
${transcript.slice(0, 100000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return extractBasicSummary(transcript);
    }

    const result = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const textContent = result.content.find((c) => c.type === 'text');
    if (!textContent) {
      return extractBasicSummary(transcript);
    }

    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SummaryResult;
    }
  } catch (error) {
    console.error('Failed to generate summary with Claude:', error);
  }

  return extractBasicSummary(transcript);
}

function extractBasicSummary(transcript: string): SummaryResult {
  // Basic extraction without AI
  const words = transcript.split(/\s+/);
  const title =
    words.length > 8
      ? words.slice(0, 8).join(' ') + '...'
      : words.join(' ') || 'Untitled Meeting';

  // Extract sentences that look like action items
  const actionItemPatterns = [
    /(?:will|should|need to|going to|action item|todo|to-do)[^.!?]*[.!?]/gi,
  ];

  const actionItems: string[] = [];
  for (const pattern of actionItemPatterns) {
    const matches = transcript.match(pattern);
    if (matches) {
      actionItems.push(...matches.slice(0, 5));
    }
  }

  return {
    title,
    summary: transcript.slice(0, 500) + (transcript.length > 500 ? '...' : ''),
    actionItems: actionItems.slice(0, 10),
    topics: [],
  };
}

function estimateDuration(sizeBytes: number, key: string): number {
  // Rough estimates based on format and typical bitrates
  const format = key.split('.').pop()?.toLowerCase() || 'mp3';

  const bitratesKbps: Record<string, number> = {
    mp3: 128,
    wav: 1411,
    webm: 96,
    m4a: 128,
    ogg: 112,
    flac: 900,
  };

  const bitrate = bitratesKbps[format] || 128;
  return Math.round((sizeBytes * 8) / (bitrate * 1000));
}
