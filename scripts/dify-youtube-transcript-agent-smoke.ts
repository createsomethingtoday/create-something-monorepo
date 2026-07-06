#!/usr/bin/env tsx

import {
  answerContains,
  buildDifyClientConfig,
  callDifyChat,
  observationsContain,
  usedForbiddenTool,
  usedTool,
  type DifyChatInput
} from '../evals/langfuse/dify/shared.js';

const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=sEQ1ecQq0HI';
const DEFAULT_VIDEO_TITLE = 'What a Billion Database Rows Look Like in Real Life';
const DEFAULT_VIDEO_METHOD = 'supadata';
const DEFAULT_VIDEO_SEGMENT_COUNT = 154;

function parseArgs(argv: string[]): { videoUrl: string } {
  let videoUrl = process.env.DIFY_AGENT_SMOKE_VIDEO_URL?.trim() || DEFAULT_VIDEO_URL;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--':
        break;
      case '--video-url':
        if (!next) throw new Error('Missing value for --video-url.');
        videoUrl = next.trim();
        i += 1;
        break;
      case '--help':
      case '-h':
        console.log(`Usage:
  pnpm dify:youtube-transcript:smoke [--video-url <youtube-url>]

Environment:
  DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY
  DIFY_AGENT_INFISICAL_ENV=prod
  DIFY_AGENT_INFISICAL_PATH=/dify/youtube-transcript-notion-agent
`);
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return { videoUrl };
}

async function main(): Promise<void> {
  const { videoUrl } = parseArgs(process.argv.slice(2));
  const config = buildDifyClientConfig();
  const input: DifyChatInput = {
    name: 'cli_smoke',
    query: `Extract the transcript for ${videoUrl} and reply with only the video title, extraction method, and segment count. Do not sync or write to Notion.`,
    shouldUseTool: 'extract_transcript',
    forbiddenTools: ['sync_video_to_notion', 'enrich_notion_page']
  };

  const output = await callDifyChat(input, config);
  const requiredToolUsed = usedTool(output, input.shouldUseTool);
  const forbiddenToolsUsed = (input.forbiddenTools ?? []).filter((tool) =>
    usedForbiddenTool(output, [tool])
  );
  const shouldCheckKnownContent = videoUrl === DEFAULT_VIDEO_URL;
  const expectedTitlePresent =
    !shouldCheckKnownContent ||
    answerContains(output, DEFAULT_VIDEO_TITLE) ||
    observationsContain(output, DEFAULT_VIDEO_TITLE);
  const expectedMethodPresent =
    !shouldCheckKnownContent ||
    answerContains(output, DEFAULT_VIDEO_METHOD) ||
    observationsContain(output, DEFAULT_VIDEO_METHOD);
  const expectedSegmentCountPresent =
    !shouldCheckKnownContent ||
    answerContains(output, DEFAULT_VIDEO_SEGMENT_COUNT) ||
    observationsContain(output, DEFAULT_VIDEO_SEGMENT_COUNT);
  const smokePassed =
    !output.skipped &&
    output.ok &&
    requiredToolUsed &&
    forbiddenToolsUsed.length === 0 &&
    expectedTitlePresent &&
    expectedMethodPresent &&
    expectedSegmentCountPresent;

  console.log(
    JSON.stringify(
      {
        ok: smokePassed,
        difyApiOk: output.ok,
        skipped: output.skipped,
        reason: output.reason,
        status: output.status,
        durationMs: output.durationMs,
        answer: output.answer,
        messageId: output.messageId,
        conversationId: output.conversationId,
        tools: output.toolCalls.map((call) => call.tool),
        requiredTool: input.shouldUseTool,
        requiredToolUsed,
        forbiddenToolsUsed,
        expectedContent: shouldCheckKnownContent
          ? {
              titlePresent: expectedTitlePresent,
              methodPresent: expectedMethodPresent,
              segmentCountPresent: expectedSegmentCountPresent
            }
          : undefined,
        usage: output.usage,
        error: output.error
      },
      null,
      2
    )
  );

  if (!smokePassed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
