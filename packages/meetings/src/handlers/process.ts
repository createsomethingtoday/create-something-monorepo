/**
 * Processing Handler
 * Transcribes audio and generates summaries
 * "From sound to understanding"
 */

import type { Env, TranscriptionResult, SummaryResult } from '../types';

const WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo';

/**
 * Process audio: transcribe with Whisper, summarize with Claude
 * Called via waitUntil for background processing
 */
export async function processAudio(
  meetingId: string,
  audioBuffer: ArrayBuffer,
  audioKey: string,
  env: Env
): Promise<void> {
  try {
    // Transcribe with Whisper
    const transcription = await transcribeAudio(audioBuffer, env);

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

async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<TranscriptionResult> {
  console.log(`Transcribing audio: ${audioBuffer.byteLength} bytes`);

  // Whisper has a ~25MB limit, check file size
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (audioBuffer.byteLength > maxSize) {
    throw new Error(`Audio file too large: ${audioBuffer.byteLength} bytes (max: ${maxSize})`);
  }

  // whisper-large-v3-turbo requires Base64-encoded audio
  // https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-workers-ai-whisper-with-chunking/
  const base64Audio = bufferToBase64(audioBuffer);

  console.log(`Sending base64 audio (${base64Audio.length} chars) to Whisper`);

  const response = await env.AI.run(WHISPER_MODEL, {
    audio: base64Audio,
  });

  console.log(`Whisper response received: ${response.text?.length || 0} chars`);

  return {
    text: response.text || '',
    vtt: response.vtt,
    word_count: response.word_count,
  };
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
