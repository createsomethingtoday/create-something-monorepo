-- Example Executable Experiment: Cloudflare Workers KV Quick Start
-- This demonstrates the interactive experiment runtime feature

INSERT INTO papers (
  id,
  title,
  slug,
  category,
  description,
  excerpt_short,
  excerpt_long,
  content,
  html_content,
  is_executable,
  setup_instructions,
  terminal_commands,
  expected_output,
  environment_config,
  reading_time,
  difficulty_level,
  technical_focus,
  published,
  featured,
  created_at,
  updated_at,
  published_at
) VALUES (
  'cloudflare-kv-quick-start',
  'Cloudflare Workers KV Quick Start',
  'cloudflare-kv-quick-start',
  'infrastructure',
  'Learn how to interact with Cloudflare Workers KV storage through interactive commands. Practice reading, writing, and listing keys in a safe sandbox environment.',
  'Interactive guide to Cloudflare Workers KV storage',
  'Learn the fundamentals of Cloudflare Workers KV (Key-Value) storage through hands-on interactive commands. This experiment teaches you how to write data, read it back, list keys, and clean up in a sandboxed environment.',
  '# Cloudflare Workers KV Quick Start

This interactive experiment will teach you the fundamentals of Cloudflare Workers KV (Key-Value) storage.

## What is Cloudflare Workers KV?

Workers KV is a global, low-latency, key-value data store. It supports exceptionally high read volumes with low latency, making it possible to build highly dynamic APIs and websites that respond quickly.

## Key Features

- **Global distribution**: Data is automatically replicated across Cloudflare''s global network
- **Low latency**: Sub-50ms reads from anywhere in the world
- **High availability**: Built on Cloudflare''s proven infrastructure
- **Simple API**: Easy-to-use key-value interface

## What You''ll Learn

In this experiment, you will:

1. List available KV namespaces
2. Write data to a KV store
3. Read data back from KV
4. Store and retrieve JSON objects
5. Delete keys to clean up

All commands run in a safe, sandboxed environment where you can''t affect production data.

## Try It Now

Click the "Launch Interactive Terminal" button above to start the experiment!',
  '<h1>Cloudflare Workers KV Quick Start</h1><p>This interactive experiment will teach you the fundamentals of Cloudflare Workers KV (Key-Value) storage.</p>',
  1,
  'This experiment teaches you the fundamentals of Cloudflare Workers KV (Key-Value) storage. You''ll learn how to write data, read it back, list keys, and clean up. All commands run in a sandboxed environment.',
  '[
    {
      "id": "cmd-1",
      "command": "kv list",
      "description": "List all KV namespaces available in this Worker",
      "expected_output": "SESSIONS, CACHE",
      "order": 1
    },
    {
      "id": "cmd-2",
      "command": "kv write CACHE test-key ''Hello from CREATE SOMETHING SPACE!''",
      "description": "Write a test value to the CACHE namespace",
      "expected_output": "✓ Key ''test-key'' written successfully to CACHE",
      "order": 2
    },
    {
      "id": "cmd-3",
      "command": "kv read CACHE test-key",
      "description": "Read the value back from CACHE",
      "expected_output": "Hello from CREATE SOMETHING SPACE!",
      "order": 3
    },
    {
      "id": "cmd-4",
      "command": "kv write CACHE json-example ''{\"name\": \"test\", \"value\": 42}''",
      "description": "Store JSON data in KV",
      "expected_output": "✓ Key ''json-example'' written successfully",
      "order": 4
    },
    {
      "id": "cmd-5",
      "command": "kv read CACHE json-example --json",
      "description": "Read JSON data back (parsed)",
      "expected_output": "{name: ''test'', value: 42}",
      "order": 5
    },
    {
      "id": "cmd-6",
      "command": "kv delete CACHE test-key",
      "description": "Clean up by deleting the test key",
      "expected_output": "✓ Key ''test-key'' deleted from CACHE",
      "order": 6,
      "is_optional": true
    }
  ]',
  'You should see successful KV operations without errors. The final cleanup step is optional but recommended.',
  '{"kv_namespaces": ["SESSIONS", "CACHE"]}',
  10,
  'beginner',
  'Cloudflare Workers, KV Storage, Edge Computing',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
