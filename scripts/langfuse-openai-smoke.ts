#!/usr/bin/env tsx

import { observeOpenAI } from 'langfuse';
import { OpenAI } from 'openai';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required (set it in your shell env).`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function endpointBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function langfuseBaseUrl(): string {
  return (
    optionalEnv('LANGFUSE_BASE_URL') ??
    optionalEnv('LANGFUSE_HOST') ??
    endpointBaseUrl(optionalEnv('LANGFUSE_MCP_ENDPOINT')) ??
    'https://us.cloud.langfuse.com'
  );
}

const client = observeOpenAI(
  new OpenAI({
    apiKey: requireEnv('OPENAI_API_KEY')
  }),
  {
    clientInitParams: {
      publicKey: requireEnv('LANGFUSE_PUBLIC_KEY'),
      secretKey: requireEnv('LANGFUSE_SECRET_KEY'),
      baseUrl: langfuseBaseUrl(),
    },
    traceName: 'langfuse-openai-smoke',
    metadata: {
      projectName: process.env.LANGFUSE_PROJECT_NAME ?? 'CREATE SOMETHING',
    },
  },
);

async function main() {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';
  const prompt = process.env.OPENAI_PROMPT ?? 'What is 1+1?';

  try {
    const result = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }]
    });

    console.log(result.choices[0]?.message?.content ?? '');
  } finally {
    await client.shutdownAsync();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
