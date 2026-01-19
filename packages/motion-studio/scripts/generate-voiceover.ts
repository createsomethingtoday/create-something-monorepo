#!/usr/bin/env npx ts-node
/**
 * Generate Voiceover Script
 * 
 * Parses SCRIPT.md files and generates audio via ElevenLabs API.
 * Outputs audio file and timing markers for AudioSync component.
 * 
 * Usage:
 *   pnpm --filter=motion-studio generate-voiceover seeing
 *   
 * Environment:
 *   ELEVENLABS_API_KEY - Your ElevenLabs API key
 */

import fs from 'fs';
import path from 'path';

// Script markup patterns
const MARKUP_PATTERNS = {
  SILENCE: /\[SILENCE\s*(\d+)?s?\]/gi,
  PAUSE: /\[PAUSE\s*(\d+)?s?\]/gi,
  BEAT: /\[BEAT\]/gi,
  SLOW: /\[SLOW\](.*?)\[\/SLOW\]/gis,
  QUOTE: /\[QUOTE\](.*?)\[\/QUOTE\]/gis,
  END: /\[END\]/gi,
};

// Default voice settings for ElevenLabs
const VOICE_SETTINGS = {
  voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - calm, direct
  modelId: 'eleven_monolingual_v1',
  stability: 0.5,
  similarityBoost: 0.75,
};

interface ScriptSegment {
  type: 'text' | 'silence' | 'pause' | 'beat';
  content?: string;
  duration?: number; // in seconds
}

interface TimingMarker {
  label: string;
  frame: number;
  timestamp: number; // in seconds
}

/**
 * Parse SCRIPT.md into segments
 */
function parseScript(scriptContent: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  
  // Extract only the voiceover section
  const voiceoverMatch = scriptContent.match(/## Voiceover Script\s*\n([\s\S]*?)(?=\n---|\n##|$)/);
  if (!voiceoverMatch) {
    console.error('Could not find "## Voiceover Script" section');
    return segments;
  }
  
  let content = voiceoverMatch[1];
  
  // Process line by line
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for silence
    const silenceMatch = trimmed.match(/\[SILENCE\s*(\d+)?s?\]/i);
    if (silenceMatch) {
      segments.push({
        type: 'silence',
        duration: parseInt(silenceMatch[1] || '2', 10),
      });
      continue;
    }
    
    // Check for pause
    const pauseMatch = trimmed.match(/\[PAUSE\s*(\d+)?s?\]/i);
    if (pauseMatch) {
      segments.push({
        type: 'pause',
        duration: parseInt(pauseMatch[1] || '1', 10),
      });
      continue;
    }
    
    // Check for beat
    if (/\[BEAT\]/i.test(trimmed)) {
      segments.push({
        type: 'beat',
        duration: 1.5,
      });
      continue;
    }
    
    // Check for end marker
    if (/\[END\]/i.test(trimmed)) {
      break;
    }
    
    // It's text content - strip inline markup
    let text = trimmed
      .replace(/\[PAUSE\s*\d*s?\]/gi, '...')
      .replace(/\[BEAT\]/gi, '...')
      .replace(/\[SLOW\]|\[\/SLOW\]/gi, '')
      .replace(/\[QUOTE\]|\[\/QUOTE\]/gi, '')
      .replace(/\*([^*]+)\*/g, '$1'); // Remove emphasis markers
    
    if (text && !text.match(/^\[.*\]$/)) {
      segments.push({
        type: 'text',
        content: text,
      });
    }
  }
  
  return segments;
}

/**
 * Generate SSML from segments for ElevenLabs
 */
function generateSSML(segments: ScriptSegment[]): string {
  let ssml = '<speak>';
  
  for (const segment of segments) {
    switch (segment.type) {
      case 'text':
        ssml += segment.content;
        break;
      case 'silence':
        ssml += `<break time="${segment.duration}s"/>`;
        break;
      case 'pause':
        ssml += `<break time="${segment.duration || 1}s"/>`;
        break;
      case 'beat':
        ssml += '<break time="1.5s"/>';
        break;
    }
  }
  
  ssml += '</speak>';
  return ssml;
}

/**
 * Generate plain text for ElevenLabs (fallback if SSML not supported)
 */
function generatePlainText(segments: ScriptSegment[]): string {
  return segments
    .filter(s => s.type === 'text')
    .map(s => s.content)
    .join(' ');
}

/**
 * Calculate timing markers from segments
 */
function calculateMarkers(segments: ScriptSegment[], fps: number = 30): TimingMarker[] {
  const markers: TimingMarker[] = [];
  let currentTime = 0;
  let markerIndex = 1;
  
  markers.push({ label: 'START', frame: 0, timestamp: 0 });
  
  for (const segment of segments) {
    if (segment.type === 'text') {
      // Estimate text duration (rough: 150 words per minute)
      const words = segment.content?.split(/\s+/).length || 0;
      const duration = (words / 150) * 60;
      
      markers.push({
        label: `VO_${markerIndex}`,
        frame: Math.round(currentTime * fps),
        timestamp: currentTime,
      });
      markerIndex++;
      currentTime += duration;
    } else if (segment.duration) {
      currentTime += segment.duration;
    }
  }
  
  markers.push({
    label: 'END',
    frame: Math.round(currentTime * fps),
    timestamp: currentTime,
  });
  
  return markers;
}

/**
 * Call ElevenLabs API to generate audio
 */
async function generateAudio(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.log('\n⚠️  ELEVENLABS_API_KEY not set. Skipping audio generation.');
    console.log('Set the environment variable to generate voiceover audio.');
    console.log('\nPlain text for manual recording:');
    console.log('─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50));
    return;
  }
  
  console.log('Generating audio via ElevenLabs...');
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_SETTINGS.voiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: VOICE_SETTINGS.modelId,
        voice_settings: {
          stability: VOICE_SETTINGS.stability,
          similarity_boost: VOICE_SETTINGS.similarityBoost,
        },
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
  }
  
  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
  
  console.log(`✓ Audio saved to ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  const commercialId = process.argv[2];
  
  if (!commercialId) {
    console.error('Usage: generate-voiceover <commercial-id>');
    console.error('Example: generate-voiceover seeing');
    process.exit(1);
  }
  
  // Paths
  const commercialsDir = path.join(__dirname, '..', 'src', 'commercials');
  const scriptPath = path.join(commercialsDir, commercialId, 'SCRIPT.md');
  const audioDir = path.join(__dirname, '..', 'audio', commercialId);
  const audioPath = path.join(audioDir, 'voiceover.mp3');
  const markersPath = path.join(audioDir, 'markers.json');
  
  // Check script exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
  }
  
  // Read and parse script
  console.log(`Reading script from ${scriptPath}...`);
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  const segments = parseScript(scriptContent);
  
  console.log(`Parsed ${segments.length} segments`);
  
  // Generate plain text
  const plainText = generatePlainText(segments);
  console.log(`\nVoiceover text (${plainText.split(/\s+/).length} words):`);
  console.log(plainText);
  
  // Calculate timing markers
  const markers = calculateMarkers(segments);
  
  // Ensure output directory exists
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  // Save markers
  fs.writeFileSync(markersPath, JSON.stringify(markers, null, 2));
  console.log(`\n✓ Markers saved to ${markersPath}`);
  
  // Generate audio
  await generateAudio(plainText, audioPath);
  
  console.log('\nDone!');
}

main().catch(console.error);
