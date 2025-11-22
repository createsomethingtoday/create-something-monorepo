-- Migration: Add performance measurement examples to complete hermeneutic circle
-- This enables learners to verify performance claims themselves

UPDATE papers 
SET code_lessons = '[
  {
    "id": 1,
    "title": "Lesson 1/6: Reading from KV",
    "description": "Learn how to read data from Workers KV using env.CACHE.get(). KV is a global, low-latency key-value data store that runs at the edge.",
    "starterCode": "export default {\n  async fetch(request, env) {\n    // TODO: Read the ''welcome-message'' key from KV\n    // HINT: Use env.CACHE.get(''key-name'')\n    \n    return new Response(''Replace this with the value from KV'');\n  }\n}",
    "solution": "export default {\n  async fetch(request, env) {\n    const value = await env.CACHE.get(''welcome-message'');\n    return new Response(value);\n  }\n}",
    "hints": [
      "Use env.CACHE.get(''key-name'') to read from KV",
      "Don''t forget the ''await'' keyword - KV operations are asynchronous",
      "The key you''re looking for is called ''welcome-message''"
    ],
    "alternativeApproaches": [
      {
        "approach": "You can also use env.KV.get() - both CACHE and KV point to the same namespace in this tutorial",
        "when": "Use either env.CACHE or env.KV - they''re aliases to the same KV binding",
        "tradeoff": "No performance difference - it''s just a naming convention. Choose what''s clearer for your use case."
      }
    ],
    "performanceNote": "KV reads are globally distributed and typically take 10-50ms. Data is eventually consistent across regions.",
    "measurementExample": "export default {\n  async fetch(request, env) {\n    const t0 = performance.now();\n    const value = await env.CACHE.get(''welcome-message'');\n    const t1 = performance.now();\n    \n    console.log(`KV read took ${(t1 - t0).toFixed(2)}ms`);\n    return new Response(value);\n  }\n}",
    "expectedOutput": "Welcome to Cloudflare Workers KV!",
    "order": 1
  },
  {
    "id": 2,
    "title": "Lesson 2/6: Writing to KV",
    "description": "Learn how to write data to Workers KV using env.CACHE.put(). Once stored, your data is replicated across Cloudflare''s global network.",
    "starterCode": "export default {\n  async fetch(request, env) {\n    // TODO: Write your name to the ''my-name'' key\n    // HINT: Use env.CACHE.put(''key'', ''value'')\n    \n    // TODO: Read your name back\n    // HINT: Use env.CACHE.get(''key'')\n    \n    return new Response(''Hello, World!'');\n  }\n}",
    "solution": "export default {\n  async fetch(request, env) {\n    await env.CACHE.put(''my-name'', ''Alice'');\n    const name = await env.CACHE.get(''my-name'');\n    return new Response(`Hello, ${name}!`);\n  }\n}",
    "hints": [
      "Use env.CACHE.put(''my-name'', ''Your Name'') to store your name",
      "After putting the value, use env.CACHE.get(''my-name'') to read it back",
      "Don''t forget ''await'' for both put() and get() operations",
      "Combine the retrieved name in a template string: `Hello, ${name}!`"
    ],
    "alternativeApproaches": [
      {
        "approach": "You can use regular string concatenation instead of template literals: ''Hello, '' + name + ''!''",
        "when": "Use template literals for readability, especially with multiple variables",
        "tradeoff": "Template literals are clearer but slightly larger in bundle size. For simple cases, the difference is negligible (<1 byte).",
        "measurementExample": "export default {\n  async fetch(request, env) {\n    const name = ''Alice'';\n    \n    // Measure template literal\n    const t0 = performance.now();\n    const result1 = `Hello, ${name}!`;\n    const t1 = performance.now();\n    \n    // Measure concatenation\n    const t2 = performance.now();\n    const result2 = ''Hello, '' + name + ''!'';\n    const t3 = performance.now();\n    \n    console.log(`Template: ${(t1-t0).toFixed(4)}ms, Concat: ${(t3-t2).toFixed(4)}ms`);\n    return new Response(result1);\n  }\n}"
      }
    ],
    "performanceNote": "KV writes propagate globally in ~60 seconds. Reads in the same region see new values immediately.",
    "measurementExample": "export default {\n  async fetch(request, env) {\n    const t0 = performance.now();\n    await env.CACHE.put(''my-name'', ''Alice'');\n    const t1 = performance.now();\n    \n    const t2 = performance.now();\n    const name = await env.CACHE.get(''my-name'');\n    const t3 = performance.now();\n    \n    console.log(`Write: ${(t1-t0).toFixed(2)}ms, Read: ${(t3-t2).toFixed(2)}ms`);\n    return new Response(`Hello, ${name}!`);\n  }\n}",
    "expectedOutput": "Hello, [Your Name]!",
    "order": 2
  },
  {
    "id": 3,
    "title": "Lesson 3/6: Listing Keys",
    "description": "Learn how to list all keys in your KV namespace using env.CACHE.list(). This is useful for discovering what data is stored.",
    "starterCode": "export default {\n  async fetch(request, env) {\n    // TODO: List all keys in the KV namespace\n    // HINT: Use env.CACHE.list()\n    \n    return new Response(''Display the keys here'');\n  }\n}",
    "solution": "export default {\n  async fetch(request, env) {\n    const keys = await env.CACHE.list();\n    return new Response(JSON.stringify(keys, null, 2));\n  }\n}",
    "hints": [
      "Use env.CACHE.list() to get all keys in the namespace",
      "The list() method returns an object with a ''keys'' array",
      "Use JSON.stringify(keys, null, 2) to format the output nicely",
      "Don''t forget ''await'' since list() is asynchronous"
    ],
    "alternativeApproaches": [
      {
        "approach": "You can filter keys by prefix: env.CACHE.list({ prefix: ''user-'' })",
        "when": "Use when you only need keys starting with a specific prefix (e.g., all user keys)",
        "tradeoff": "Prefix filtering is faster and cheaper than listing all keys then filtering in JavaScript.",
        "measurementExample": "export default {\n  async fetch(request, env) {\n    // Measure list all\n    const t0 = performance.now();\n    const all = await env.CACHE.list();\n    const filtered = all.keys.filter(k => k.name.startsWith(''user-''));\n    const t1 = performance.now();\n    \n    // Measure list with prefix\n    const t2 = performance.now();\n    const prefixed = await env.CACHE.list({ prefix: ''user-'' });\n    const t3 = performance.now();\n    \n    console.log(`List all + filter: ${(t1-t0).toFixed(2)}ms, Prefix: ${(t3-t2).toFixed(2)}ms`);\n    return new Response(JSON.stringify(prefixed, null, 2));\n  }\n}"
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
    ],
    "performanceNote": "list() operations are slower than get() (~50-100ms). Avoid listing in hot paths - cache the results if needed.",
    "measurementExample": "export default {\n  async fetch(request, env) {\n    // Compare list() vs get()\n    const t0 = performance.now();\n    const keys = await env.CACHE.list();\n    const t1 = performance.now();\n    \n    const t2 = performance.now();\n    const value = await env.CACHE.get(''welcome-message'');\n    const t3 = performance.now();\n    \n    console.log(`list(): ${(t1-t0).toFixed(2)}ms, get(): ${(t3-t2).toFixed(2)}ms`);\n    return new Response(JSON.stringify(keys, null, 2));\n  }\n}",
    "expectedOutput": "{\n  \"keys\": [...],\n  \"list_complete\": true\n}",
    "order": 3
  },
  {
    "id": 4,
    "title": "Lesson 4/6: Deleting Keys",
    "description": "Learn how to delete data from Workers KV using env.CACHE.delete(). Deleted keys return null when read.",
    "starterCode": "export default {\n  async fetch(request, env) {\n    // First, let''s create some temporary data\n    await env.CACHE.put(''temp-data'', ''temporary'');\n    \n    // TODO: Delete the ''temp-data'' key\n    // HINT: Use env.CACHE.delete(''key-name'')\n    \n    // TODO: Verify it was deleted by trying to read it\n    const result = await env.CACHE.get(''temp-data'');\n    \n    return new Response(''Check if deletion worked'');\n  }\n}",
    "solution": "export default {\n  async fetch(request, env) {\n    await env.CACHE.put(''temp-data'', ''temporary'');\n    await env.CACHE.delete(''temp-data'');\n    const result = await env.CACHE.get(''temp-data'');\n    return new Response(result === null ? ''Deleted!'' : ''Still exists'');\n  }\n}",
    "hints": [
      "Use env.CACHE.delete(''temp-data'') to delete the key",
      "After deleting, env.CACHE.get() will return null for that key",
      "Use a ternary operator to check: result === null ? ''Deleted!'' : ''Still exists''",
      "Don''t forget ''await'' for the delete() operation"
    ],
    "alternativeApproaches": [
      {
        "approach": "You can check if a key exists before deleting: if (await env.CACHE.get(''key'')) { await env.CACHE.delete(''key''); }",
        "when": "Use when you want to avoid unnecessary delete operations",
        "tradeoff": "Requires 2 operations (get + delete) instead of 1. Only worth it if deletes are rare and you want to avoid billing for deletes that do nothing.",
        "measurementExample": "export default {\n  async fetch(request, env) {\n    await env.CACHE.put(''temp'', ''data'');\n    \n    // Measure: check then delete\n    const t0 = performance.now();\n    if (await env.CACHE.get(''temp'')) {\n      await env.CACHE.delete(''temp'');\n    }\n    const t1 = performance.now();\n    \n    await env.CACHE.put(''temp'', ''data'');\n    \n    // Measure: just delete\n    const t2 = performance.now();\n    await env.CACHE.delete(''temp'');\n    const t3 = performance.now();\n    \n    console.log(`Check+delete: ${(t1-t0).toFixed(2)}ms, Delete: ${(t3-t2).toFixed(2)}ms`);\n    return new Response(''Deleted!'');\n  }\n}"
      }
    ],
    "performanceNote": "delete() is fast (~10-30ms) but propagates globally like put(). The key becomes immediately unavailable in the same region.",
    "measurementExample": "export default {\n  async fetch(request, env) {\n    await env.CACHE.put(''temp-data'', ''temporary'');\n    \n    const t0 = performance.now();\n    await env.CACHE.delete(''temp-data'');\n    const t1 = performance.now();\n    \n    const result = await env.CACHE.get(''temp-data'');\n    console.log(`Delete took ${(t1-t0).toFixed(2)}ms`);\n    return new Response(result === null ? ''Deleted!'' : ''Still exists'');\n  }\n}",
    "expectedOutput": "Deleted!",
    "order": 4
  },
  {
    "id": 5,
    "title": "Lesson 5/6: Working with JSON",
    "description": "Learn how to store and retrieve JSON objects in Workers KV. KV only stores strings, so you need to serialize objects with JSON.stringify() and parse them with JSON.parse().",
    "starterCode": "export default {\n  async fetch(request, env) {\n    // Create a user object\n    const user = { name: ''Alice'', score: 100 };\n    \n    // TODO: Store the user object in KV\n    // HINT: Use JSON.stringify() to convert the object to a string\n    \n    // TODO: Retrieve and parse the user object\n    // HINT: Use JSON.parse() to convert the string back to an object\n    \n    return new Response(''Display user info here'');\n  }\n}",
    "solution": "export default {\n  async fetch(request, env) {\n    const user = { name: ''Alice'', score: 100 };\n    await env.CACHE.put(''user'', JSON.stringify(user));\n    \n    const stored = await env.CACHE.get(''user'');\n    const parsed = JSON.parse(stored);\n    return new Response(`${parsed.name} has ${parsed.score} points`);\n  }\n}",
    "hints": [
      "Use JSON.stringify(user) to convert the object to a string before storing",
      "Store the stringified object: env.CACHE.put(''user'', JSON.stringify(user))",
      "Retrieve the string: const stored = await env.CACHE.get(''user'')",
      "Parse it back: const parsed = JSON.parse(stored)",
      "Access properties normally: parsed.name and parsed.score"
    ],
    "alternativeApproaches": [
      {
        "approach": "You can use object destructuring: const { name, score } = JSON.parse(stored)",
        "when": "Use when you only need specific fields from the object",
        "tradeoff": "Cleaner code, same performance. Destructuring happens after parsing, so no speed difference.",
        "measurementExample": "export default {\n  async fetch(request, env) {\n    const user = { name: ''Alice'', score: 100 };\n    await env.CACHE.put(''user'', JSON.stringify(user));\n    const stored = await env.CACHE.get(''user'');\n    \n    // Measure parse + assign\n    const t0 = performance.now();\n    const parsed = JSON.parse(stored);\n    const name1 = parsed.name;\n    const t1 = performance.now();\n    \n    // Measure parse + destructure\n    const t2 = performance.now();\n    const { name, score } = JSON.parse(stored);\n    const t3 = performance.now();\n    \n    console.log(`Parse+assign: ${(t1-t0).toFixed(4)}ms, Destructure: ${(t3-t2).toFixed(4)}ms`);\n    return new Response(`${name} has ${score} points`);\n  }\n}"
      },
      {
        "approach": "You can combine in one line: JSON.parse(await env.CACHE.get(''user''))",
        "when": "Use for concise code when you don''t need the intermediate ''stored'' variable",
        "tradeoff": "More compact but harder to debug if parsing fails. Same performance."
      }
    ],
    "performanceNote": "JSON.stringify() and JSON.parse() are fast (~0.1ms for small objects). For large objects (>100KB), consider streaming or chunking the data.",
    "measurementExample": "export default {\n  async fetch(request, env) {\n    const user = { name: ''Alice'', score: 100 };\n    \n    const t0 = performance.now();\n    const stringified = JSON.stringify(user);\n    const t1 = performance.now();\n    \n    const t2 = performance.now();\n    const parsed = JSON.parse(stringified);\n    const t3 = performance.now();\n    \n    console.log(`stringify: ${(t1-t0).toFixed(4)}ms, parse: ${(t3-t2).toFixed(4)}ms`);\n    return new Response(`${parsed.name} has ${parsed.score} points`);\n  }\n}",
    "expectedOutput": "Alice has 100 points",
    "order": 5
  },
  {
    "id": 6,
    "title": "Lesson 6/6: Building an API",
    "description": "Learn how to build a simple API with Workers KV by handling different URL paths. This combines everything you''ve learned: reading, writing, and managing state.",
    "starterCode": "export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    \n    // TODO: Handle three paths:\n    // /set - Initialize counter to 0\n    // /increment - Increase counter by 1\n    // /get - Display current counter value\n    \n    // HINT: Use if (url.pathname === ''/path'') { ... }\n    \n    return new Response(''Try /set, /increment, or /get'');\n  }\n}",
    "solution": "export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    \n    if (url.pathname === ''/set'') {\n      await env.CACHE.put(''counter'', ''0'');\n      return new Response(''Counter initialized'');\n    }\n    \n    if (url.pathname === ''/increment'') {\n      const current = await env.CACHE.get(''counter'') || ''0'';\n      const newValue = parseInt(current) + 1;\n      await env.CACHE.put(''counter'', newValue.toString());\n      return new Response(`Counter: ${newValue}`);\n    }\n    \n    if (url.pathname === ''/get'') {\n      const value = await env.CACHE.get(''counter'') || ''0'';\n      return new Response(`Counter: ${value}`);\n    }\n    \n    return new Response(''Try /set, /increment, or /get'');\n  }\n}",
    "hints": [
      "Parse the URL: const url = new URL(request.url)",
      "Check pathname: if (url.pathname === ''/set'') { ... }",
      "For /set: Store ''0'' as the initial counter value",
      "For /increment: Get current value, convert to number with parseInt(), add 1, convert back to string",
      "For /get: Just read and display the counter value",
      "Use || ''0'' to provide a default value if the counter doesn''t exist"
    ],
    "alternativeApproaches": [
      {
        "approach": "You can use a switch statement instead of if/else: switch(url.pathname) { case ''/set'': ... }",
        "when": "Use switch for 4+ paths or when you need fall-through behavior between cases",
        "tradeoff": "Cleaner code for many paths, but identical performance for 2-3 paths. V8 optimizes both equally.",
        "measurementExample": "export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const path = url.pathname;\n    \n    // Measure if/else routing\n    const t0 = performance.now();\n    let result1;\n    if (path === ''/set'') result1 = ''set'';\n    else if (path === ''/get'') result1 = ''get'';\n    else result1 = ''other'';\n    const t1 = performance.now();\n    \n    // Measure switch routing\n    const t2 = performance.now();\n    let result2;\n    switch(path) {\n      case ''/set'': result2 = ''set''; break;\n      case ''/get'': result2 = ''get''; break;\n      default: result2 = ''other'';\n    }\n    const t3 = performance.now();\n    \n    console.log(`if/else: ${(t1-t0).toFixed(4)}ms, switch: ${(t3-t2).toFixed(4)}ms`);\n    return new Response(''Try /set, /increment, or /get'');\n  }\n}"
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
    ],
    "performanceNote": "Routing with if/else vs switch has identical performance for <10 paths (~0.001ms). Choose based on readability. For 100+ paths, use a Map lookup instead.",
    "measurementExample": "export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const iterations = 1000;\n    \n    // Measure if/else\n    const t0 = performance.now();\n    for (let i = 0; i < iterations; i++) {\n      if (url.pathname === ''/set'') {}\n      else if (url.pathname === ''/increment'') {}\n      else if (url.pathname === ''/get'') {}\n    }\n    const t1 = performance.now();\n    \n    // Measure switch\n    const t2 = performance.now();\n    for (let i = 0; i < iterations; i++) {\n      switch(url.pathname) {\n        case ''/set'': break;\n        case ''/increment'': break;\n        case ''/get'': break;\n      }\n    }\n    const t3 = performance.now();\n    \n    const avg1 = ((t1-t0)/iterations).toFixed(4);\n    const avg2 = ((t3-t2)/iterations).toFixed(4);\n    console.log(`if/else avg: ${avg1}ms, switch avg: ${avg2}ms`);\n    return new Response(''See console for comparison'');\n  }\n}",
    "expectedOutput": "Counter: 1 (after /set then /increment)",
    "order": 6
  }
]
', 
    updated_at = CURRENT_TIMESTAMP 
WHERE slug = 'cloudflare-kv-quick-start';