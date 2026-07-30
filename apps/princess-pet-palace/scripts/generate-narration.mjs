import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { NARRATION_CATALOG } from "../app/speech-guide.ts";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required to generate narration.");
}

const outputDirectory = fileURLToPath(new URL("../public/audio/narration/", import.meta.url));
await mkdir(outputDirectory, { recursive: true });

const instructions = [
  "Speak as a warm, playful preschool guide talking to one four-year-old child.",
  "Sound natural, affectionate, and gently delighted, with expressive intonation and tiny conversational pauses.",
  "Keep the pace calm and clear, pronounce single letter names distinctly, and make encouragement feel sincere.",
  "Do not sing, whisper, shout, or sound like an announcer.",
].join(" ");

for (const cue of Object.values(NARRATION_CATALOG)) {
  const outputPath = fileURLToPath(new URL(`../public${cue.src}`, import.meta.url));
  try {
    const existing = await stat(outputPath);
    if (existing.size > 1_000) {
      console.log(`kept ${cue.id}`);
      continue;
    }
  } catch {
    // Generate missing files below.
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: cue.text,
      instructions,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    let errorCode = response.statusText;
    try {
      const payload = await response.json();
      errorCode = payload?.error?.code ?? payload?.error?.type ?? errorCode;
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    const safeDetail = `${response.status} ${errorCode}`;
    throw new Error(`Narration generation failed for ${cue.id}: ${safeDetail}`);
  }

  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  console.log(`generated ${cue.id}`);
}

console.log(`Narration library ready: ${Object.keys(NARRATION_CATALOG).length} clips.`);
