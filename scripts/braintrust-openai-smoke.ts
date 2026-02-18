#!/usr/bin/env tsx

import { initLogger, wrapOpenAI, flush } from 'braintrust';
import { OpenAI } from 'openai';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required (set it in your shell env).`);
  }
  return value;
}

initLogger({
  projectName: process.env.BRAINTRUST_PROJECT_NAME ?? 'Create Something',
  apiKey: requireEnv('BRAINTRUST_API_KEY')
});

const client = wrapOpenAI(
  new OpenAI({
    apiKey: requireEnv('OPENAI_API_KEY')
  })
);

async function main() {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const prompt = process.env.OPENAI_PROMPT ?? 'What is 1+1?';

  const result = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });

  console.log(result.choices[0]?.message?.content ?? '');
  await flush();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

