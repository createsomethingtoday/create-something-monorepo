-- Migration: Add hints and alternative approaches to Cloudflare KV Quick Start lessons
-- This updates the code_lessons JSON field with comprehensive hints for the mechanism design system

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
      "You can also use env.KV.get() - both CACHE and KV point to the same namespace in this tutorial"
    ],
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
      "You can store any string value, not just names - try storing a message or number",
      "You can use regular string concatenation instead of template literals: ''Hello, '' + name + ''!''"
    ],
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
      "You can filter keys by prefix: env.CACHE.list({ prefix: ''user-'' })",
      "You can limit results: env.CACHE.list({ limit: 10 })",
      "You can iterate through keys: keys.keys.map(k => k.name).join('', '')"
    ],
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
      "You can delete multiple keys in sequence using multiple delete() calls",
      "You can check if a key exists before deleting: if (await env.CACHE.get(''key'')) { await env.CACHE.delete(''key''); }"
    ],
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
      "You can store arrays the same way: JSON.stringify([1, 2, 3])",
      "You can use object destructuring: const { name, score } = JSON.parse(stored)",
      "You can combine in one line: JSON.parse(await env.CACHE.get(''user''))"
    ],
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
      "You can use a switch statement instead of if/else: switch(url.pathname) { case ''/set'': ... }",
      "You can store the counter as JSON: { count: 0 }",
      "You can add more endpoints like /decrement or /reset",
      "You can use url.searchParams to accept query parameters: /set?value=5"
    ],
    "expectedOutput": "Counter: 1 (after /set then /increment)",
    "order": 6
  }
]',
updated_at = CURRENT_TIMESTAMP
WHERE slug = 'cloudflare-kv-quick-start';
