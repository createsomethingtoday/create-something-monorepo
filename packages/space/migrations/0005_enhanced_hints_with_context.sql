-- Migration: Enhance hints with "When & Why" context to complete the hermeneutic circle
-- This upgrades hints from simple suggestions to structured learning with performance context

UPDATE papers
SET code_lessons = (
  SELECT json_group_array(
    json_object(
      'id', value->>'$.id',
      'title', value->>'$.title',
      'description', value->>'$.description',
      'starterCode', value->>'$.starterCode',
      'solution', value->>'$.solution',
      'hints', json(value->>'$.hints'),
      'alternativeApproaches', CASE
        WHEN value->>'$.id' = '1' THEN json('[
          {
            "approach": "You can also use env.KV.get() - both CACHE and KV point to the same namespace in this tutorial",
            "when": "Use either env.CACHE or env.KV - they are aliases to the same KV binding",
            "tradeoff": "No performance difference - it is just a naming convention. Choose what is clearer for your use case."
          }
        ]')
        WHEN value->>'$.id' = '2' THEN json('[
          {
            "approach": "You can use regular string concatenation instead of template literals: ''Hello, '' + name + ''!''",
            "when": "Use template literals for readability, especially with multiple variables",
            "tradeoff": "Template literals are clearer but slightly larger in bundle size. For simple cases, the difference is negligible (<1 byte)."
          }
        ]')
        WHEN value->>'$.id' = '3' THEN json('[
          {
            "approach": "You can filter keys by prefix: env.CACHE.list({ prefix: ''user-'' })",
            "when": "Use when you only need keys starting with a specific prefix (e.g., all user keys)",
            "tradeoff": "Prefix filtering is faster and cheaper than listing all keys then filtering in JavaScript."
          },
          {
            "approach": "You can limit results: env.CACHE.list({ limit: 10 })",
            "when": "Use when you have many keys and only need a subset",
            "tradeoff": "Reduces API cost and response time. Default limit is 1000 keys per call."
          },
          {
            "approach": "You can iterate through keys: keys.keys.map(k => k.name).join('', '')",
            "when": "Use when you need just the key names as a simple string",
            "tradeoff": "More compact output, but loses metadata (expiration time, etc.)"
          }
        ]')
        WHEN value->>'$.id' = '4' THEN json('[
          {
            "approach": "You can check if a key exists before deleting: if (await env.CACHE.get(''key'')) { await env.CACHE.delete(''key''); }",
            "when": "Use when you want to avoid unnecessary delete operations",
            "tradeoff": "Requires 2 operations (get + delete) instead of 1. Only worth it if deletes are rare and you want to avoid billing for deletes that do nothing."
          }
        ]')
        WHEN value->>'$.id' = '5' THEN json('[
          {
            "approach": "You can use object destructuring: const { name, score } = JSON.parse(stored)",
            "when": "Use when you only need specific fields from the object",
            "tradeoff": "Cleaner code, same performance. Destructuring happens after parsing, so no speed difference."
          },
          {
            "approach": "You can combine in one line: JSON.parse(await env.CACHE.get(''user''))",
            "when": "Use for concise code when you do not need the intermediate ''stored'' variable",
            "tradeoff": "More compact but harder to debug if parsing fails. Same performance."
          }
        ]')
        WHEN value->>'$.id' = '6' THEN json('[
          {
            "approach": "You can use a switch statement instead of if/else: switch(url.pathname) { case ''/set'': ... }",
            "when": "Use switch for 4+ paths or when you need fall-through behavior between cases",
            "tradeoff": "Cleaner code for many paths, but identical performance for 2-3 paths. V8 optimizes both equally."
          },
          {
            "approach": "You can store the counter as JSON: { count: 0 }",
            "when": "Use when you need to store multiple related fields together (e.g., counter + timestamp)",
            "tradeoff": "More flexible data structure but slower due to JSON.stringify/parse overhead (~0.1-0.2ms per operation). For simple counters, strings are faster."
          },
          {
            "approach": "You can use url.searchParams to accept query parameters: /set?value=5",
            "when": "Use when you want to make the counter value configurable via URL",
            "tradeoff": "More flexible API but requires input validation. Use parseInt(url.searchParams.get(''value'')) with error handling."
          }
        ]')
        ELSE json(value->>'$.alternativeApproaches')
      END,
      'performanceNote', CASE
        WHEN value->>'$.id' = '1' THEN 'KV reads are globally distributed and typically take 10-50ms. Data is eventually consistent across regions.'
        WHEN value->>'$.id' = '2' THEN 'KV writes propagate globally in ~60 seconds. Reads in the same region see new values immediately.'
        WHEN value->>'$.id' = '3' THEN 'list() operations are slower than get() (~50-100ms). Avoid listing in hot paths - cache the results if needed.'
        WHEN value->>'$.id' = '4' THEN 'delete() is fast (~10-30ms) but propagates globally like put(). The key becomes immediately unavailable in the same region.'
        WHEN value->>'$.id' = '5' THEN 'JSON.stringify() and JSON.parse() are fast (~0.1ms for small objects). For large objects (>100KB), consider streaming or chunking the data.'
        WHEN value->>'$.id' = '6' THEN 'Routing with if/else vs switch has identical performance for <10 paths (~0.001ms). Choose based on readability. For 100+ paths, use a Map lookup instead.'
        ELSE NULL
      END,
      'expectedOutput', value->>'$.expectedOutput',
      'order', value->>'$.order'
    )
  )
  FROM json_each(code_lessons)
)
WHERE slug = 'cloudflare-kv-quick-start';
