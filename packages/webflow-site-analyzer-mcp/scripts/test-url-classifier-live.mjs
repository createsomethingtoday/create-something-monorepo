/**
 * Live integration test for URL classifier with OpenAI.
 * Requires WEBFLOW_OPENAI_API_KEY in environment (load from Infisical first).
 *
 * Run: infisical run -- node scripts/test-url-classifier-live.mjs
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { classifyUrls, classifyUrlsDeterministic } = require('../dist/url-classifier.js');

const MEETUP_W_URLS = [
  'https://meetup-w-wcopilot.webflow.io/',
  'https://meetup-w-wcopilot.webflow.io/home-1',
  'https://meetup-w-wcopilot.webflow.io/home-2',
  'https://meetup-w-wcopilot.webflow.io/events',
  'https://meetup-w-wcopilot.webflow.io/event/inspire-innovate-a-journey-of-possibilities',
  'https://meetup-w-wcopilot.webflow.io/about-us',
  'https://meetup-w-wcopilot.webflow.io/our-speakers',
  'https://meetup-w-wcopilot.webflow.io/speaker/karen-dorwart',
  'https://meetup-w-wcopilot.webflow.io/sponsors',
  'https://meetup-w-wcopilot.webflow.io/faq',
  'https://meetup-w-wcopilot.webflow.io/pricing',
  'https://meetup-w-wcopilot.webflow.io/contact-us',
  'https://meetup-w-wcopilot.webflow.io/news',
  'https://meetup-w-wcopilot.webflow.io/news-posts/top-event-trends-shaping-the-future-of-experiences',
  'https://meetup-w-wcopilot.webflow.io/news-categories/fintech',
  'https://meetup-w-wcopilot.webflow.io/coming-soon',
  'https://meetup-w-wcopilot.webflow.io/templates/licensing',
  'https://meetup-w-wcopilot.webflow.io/search',
  'https://meetup-w-wcopilot.webflow.io/templates/changelog',
  'https://meetup-w-wcopilot.webflow.io/templates/style-guide',
  'https://meetup-w-wcopilot.webflow.io/404',
  'https://meetup-w-wcopilot.webflow.io/password',
];

const START_URL = MEETUP_W_URLS[0];

async function main() {
  const hasGroqKey = Boolean(process.env.WEBFLOW_GROQ_API_KEY);
  const hasOpenAIKey = Boolean(process.env.WEBFLOW_OPENAI_API_KEY);
  const hasKey = hasGroqKey || hasOpenAIKey;
  const provider = hasGroqKey ? 'Groq (llama-3.3-70b)' : hasOpenAIKey ? 'OpenAI (gpt-4o-mini)' : 'none';
  console.log(`GROQ_API_KEY: ${hasGroqKey ? 'set' : 'NOT SET'}`);
  console.log(`WEBFLOW_OPENAI_API_KEY: ${hasOpenAIKey ? 'set' : 'NOT SET'}`);
  console.log(`Provider: ${provider}\n`);

  // Deterministic baseline
  console.log('== Deterministic Classification ==');
  const detStart = Date.now();
  const deterministic = classifyUrlsDeterministic(MEETUP_W_URLS, START_URL);
  const detMs = Date.now() - detStart;
  for (const c of deterministic) {
    const path = new URL(c.url).pathname;
    console.log(`  ${c.priority.padEnd(8)} ${c.classification.padEnd(22)} ${path}`);
  }
  console.log(`  (${detMs}ms)\n`);

  if (!hasKey) {
    console.log('Skipping LLM test — no GROQ_API_KEY or WEBFLOW_OPENAI_API_KEY set.');
    console.log('Run: infisical run -- node scripts/test-url-classifier-live.mjs');
    return;
  }

  // LLM classification
  console.log(`== LLM Classification (${provider}) ==`);
  const llmStart = Date.now();
  const llmResults = await classifyUrls(MEETUP_W_URLS, START_URL, { useLLM: true });
  const llmMs = Date.now() - llmStart;
  for (const c of llmResults) {
    const path = new URL(c.url).pathname;
    console.log(`  ${c.priority.padEnd(8)} ${c.classification.padEnd(22)} (conf=${c.confidence}) ${path}`);
  }
  console.log(`  (${llmMs}ms)\n`);

  // Comparison
  console.log('== Comparison ==');
  let matches = 0;
  let diffs = 0;
  for (let i = 0; i < MEETUP_W_URLS.length; i++) {
    const det = deterministic[i];
    const llm = llmResults[i];
    const path = new URL(det.url).pathname;
    if (det.classification === llm.classification) {
      matches++;
    } else {
      diffs++;
      console.log(`  DIFF ${path}: det=${det.classification} llm=${llm.classification}`);
    }
  }
  console.log(`  ${matches} agree, ${diffs} differ`);
  console.log(`  Deterministic: ${detMs}ms, LLM: ${llmMs}ms`);
}

main().catch(console.error);
