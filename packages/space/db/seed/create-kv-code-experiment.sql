-- Create Cloudflare Workers KV Code Editor Experiment
-- This replaces the terminal-based experiment with an interactive code editor

UPDATE papers
SET
  -- Keep is_executable = 1 but set terminal_commands to NULL to indicate this is a code editor experiment
  is_executable = 1,
  terminal_commands = NULL,

  -- Add code lessons (6 lessons teaching real Workers KV API)
  code_lessons = '[
    {
      "id": 1,
      "title": "Reading from KV",
      "description": "Learn how to read data from Workers KV using the get() method. We''ve pre-populated a key called ''welcome-message'' for you to read.",
      "starterCode": "export default {\n  async fetch(request, env) {\n    // TODO: Read the ''welcome-message'' key from env.CACHE\n    const value = '''; // Your code here\n\n    return new Response(value);\n  }\n}",
      "solution": "export default {\n  async fetch(request, env) {\n    // Read the ''welcome-message'' key from env.CACHE\n    const value = await env.CACHE.get(''welcome-message'');\n\n    return new Response(value);\n  }\n}",
      "hints": [
        "Use await env.CACHE.get(''key-name'')",
        "Don''t forget the await keyword",
        "The key name is ''welcome-message''"
      ],
      "expectedOutput": "Welcome to Cloudflare Workers KV!",
      "order": 1
    },
    {
      "id": 2,
      "title": "Writing to KV",
      "description": "Learn how to write data to Workers KV using the put() method. Write your name to KV and then read it back.",
      "starterCode": "export default {\n  async fetch(request, env) {\n    // TODO: Write your name to the ''my-name'' key\n    // await env.CACHE.put(...);\n\n    // TODO: Read it back\n    const name = '''; // Your code here\n\n    return new Response(`Hello, ${name}!`);\n  }\n}",
      "solution": "export default {\n  async fetch(request, env) {\n    // Write your name to the ''my-name'' key\n    await env.CACHE.put(''my-name'', ''Alice'');\n\n    // Read it back\n    const name = await env.CACHE.get(''my-name'');\n\n    return new Response(`Hello, ${name}!`);\n  }\n}",
      "hints": [
        "Use await env.CACHE.put(''key'', ''value'')",
        "Then use env.CACHE.get(''key'') to read it back",
        "Both operations need await"
      ],
      "expectedOutput": "Hello, Alice! (or whatever name you chose)",
      "order": 2
    },
    {
      "id": 3,
      "title": "Listing Keys",
      "description": "Learn how to list all keys in a KV namespace using the list() method. This is useful for discovering what data is stored.",
      "starterCode": "export default {\n  async fetch(request, env) {\n    // TODO: List all keys in the namespace\n    const keys = '''; // Your code here\n\n    // Return the list as JSON\n    return new Response(\n      JSON.stringify(keys, null, 2),\n      { headers: { ''Content-Type'': ''application/json'' } }\n    );\n  }\n}",
      "solution": "export default {\n  async fetch(request, env) {\n    // List all keys in the namespace\n    const keys = await env.CACHE.list();\n\n    // Return the list as JSON\n    return new Response(\n      JSON.stringify(keys, null, 2),\n      { headers: { ''Content-Type'': ''application/json'' } }\n    );\n  }\n}",
      "hints": [
        "Use await env.CACHE.list()",
        "The result is an object with a ''keys'' array",
        "Use JSON.stringify() to format the output"
      ],
      "expectedOutput": "{ \"keys\": [...] }",
      "order": 3
    },
    {
      "id": 4,
      "title": "Deleting Keys",
      "description": "Learn how to delete data from Workers KV using the delete() method. Create a temporary key, then delete it.",
      "starterCode": "export default {\n  async fetch(request, env) {\n    // First, write a temporary key\n    await env.CACHE.put(''temp-data'', ''temporary'');\n\n    // TODO: Delete the key\n    // await env.CACHE.delete(...);\n\n    // Try to read it back (should be null)\n    const result = await env.CACHE.get(''temp-data'');\n\n    return new Response(\n      result === null ? ''Deleted!'' : ''Still exists''\n    );\n  }\n}",
      "solution": "export default {\n  async fetch(request, env) {\n    // First, write a temporary key\n    await env.CACHE.put(''temp-data'', ''temporary'');\n\n    // Delete the key\n    await env.CACHE.delete(''temp-data'');\n\n    // Try to read it back (should be null)\n    const result = await env.CACHE.get(''temp-data'');\n\n    return new Response(\n      result === null ? ''Deleted!'' : ''Still exists''\n    );\n  }\n}",
      "hints": [
        "Use await env.CACHE.delete(''key-name'')",
        "After deletion, get() will return null",
        "Don''t forget to await the delete operation"
      ],
      "expectedOutput": "Deleted!",
      "order": 4
    },
    {
      "id": 5,
      "title": "Working with JSON",
      "description": "Learn how to store and retrieve structured data using JSON. KV stores everything as strings, so you need to stringify objects before storing and parse them when reading.",
      "starterCode": "export default {\n  async fetch(request, env) {\n    // Create a user object\n    const user = { name: ''Alice'', score: 100 };\n\n    // TODO: Convert to JSON and store\n    // await env.CACHE.put(''user'', ...);\n\n    // TODO: Read and parse back\n    const stored = '''; // Your code here\n    const parsed = '''; // Your code here\n\n    return new Response(\n      `${parsed.name} has ${parsed.score} points`\n    );\n  }\n}",
      "solution": "export default {\n  async fetch(request, env) {\n    // Create a user object\n    const user = { name: ''Alice'', score: 100 };\n\n    // Convert to JSON and store\n    await env.CACHE.put(''user'', JSON.stringify(user));\n\n    // Read and parse back\n    const stored = await env.CACHE.get(''user'');\n    const parsed = JSON.parse(stored);\n\n    return new Response(\n      `${parsed.name} has ${parsed.score} points`\n    );\n  }\n}",
      "hints": [
        "Use JSON.stringify() to convert object to string",
        "Use JSON.parse() to convert string back to object",
        "KV only stores strings, not objects directly"
      ],
      "expectedOutput": "Alice has 100 points",
      "order": 5
    },
    {
      "id": 6,
      "title": "Building an API",
      "description": "Build a simple counter API using Workers KV. Handle different URL paths to initialize, increment, and get the counter value. This combines everything you''ve learned!",
      "starterCode": "export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n\n    if (url.pathname === ''/set'') {\n      // TODO: Initialize counter to 0\n      return new Response(''Counter initialized'');\n    }\n\n    if (url.pathname === ''/increment'') {\n      // TODO: Get current value, add 1, store back\n      const current = 0; // Get from KV\n      const newValue = current + 1;\n      // Store back to KV\n      return new Response(`Counter: ${newValue}`);\n    }\n\n    if (url.pathname === ''/get'') {\n      // TODO: Get and return current value\n      const value = 0; // Get from KV\n      return new Response(`Counter: ${value}`);\n    }\n\n    return new Response(''Try /set, /increment, or /get'');\n  }\n}",
      "solution": "export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n\n    if (url.pathname === ''/set'') {\n      await env.CACHE.put(''counter'', ''0'');\n      return new Response(''Counter initialized'');\n    }\n\n    if (url.pathname === ''/increment'') {\n      const current = await env.CACHE.get(''counter'') || ''0'';\n      const newValue = parseInt(current) + 1;\n      await env.CACHE.put(''counter'', newValue.toString());\n      return new Response(`Counter: ${newValue}`);\n    }\n\n    if (url.pathname === ''/get'') {\n      const value = await env.CACHE.get(''counter'') || ''0'';\n      return new Response(`Counter: ${value}`);\n    }\n\n    return new Response(''Try /set, /increment, or /get'');\n  }\n}",
      "hints": [
        "Use parseInt() to convert string to number",
        "Use toString() to convert number back to string",
        "Handle the case where counter doesn''t exist yet (use || ''0'')",
        "The URL object gives you request.url parsed into parts"
      ],
      "expectedOutput": "Counter: 1 (after set then increment)",
      "order": 6
    }
  ]',

  -- Update content to reflect this is now a code editor experiment
  content = '# Cloudflare Workers KV - Interactive Code Editor

This experiment teaches you the real Cloudflare Workers KV API through interactive coding lessons. You''ll write actual Workers code that executes in your browser.

## What is Cloudflare Workers KV?

Cloudflare Workers KV is a global, low-latency key-value data store. It stores data in a small number of centralized data centers, then caches that data in Cloudflare''s edge network after access.

### Key Characteristics

- **Optimized for reads**: Best for read-heavy workloads with occasional writes
- **Eventually consistent**: Changes may take up to 60 seconds to propagate globally
- **Global distribution**: Your data is automatically replicated across Cloudflare''s network
- **Simple API**: Just four main operations - get, put, list, delete

## What You Will Learn

Through 6 interactive lessons, you will master:

1. **Reading from KV** - Use `env.CACHE.get()` to retrieve data
2. **Writing to KV** - Use `env.CACHE.put()` to store data
3. **Listing Keys** - Use `env.CACHE.list()` to discover stored keys
4. **Deleting Data** - Use `env.CACHE.delete()` to remove keys
5. **Working with JSON** - Store and retrieve structured data
6. **Building an API** - Create a complete counter API combining all operations

## How It Works

Each lesson provides:
- **Starter code** with TODO comments guiding you
- **Hints** if you get stuck
- **Solution** to see the correct implementation
- **Live execution** to test your code immediately

The code you write is real Cloudflare Workers code using the actual KV API. The execution environment simulates a Workers runtime with real KV storage operations.

## Best Practices

**When to use KV:**
- Serving static assets
- Storing application configuration
- Storing user preferences
- Implementing allow-lists/deny-lists
- Caching API responses

**When NOT to use KV:**
- Write-heavy workloads (use Durable Objects instead)
- Transactions requiring strong consistency
- Storing data > 25MB per value
- Operations requiring atomic updates

## Learn More

For complete documentation and advanced features:

**[Cloudflare Workers KV Documentation](https://developers.cloudflare.com/kv/)**

Key topics:
- **[How KV Works](https://developers.cloudflare.com/kv/concepts/how-kv-works/)** - Understanding consistency and performance
- **[API Reference](https://developers.cloudflare.com/kv/api/)** - Complete API documentation
- **[Best Practices](https://developers.cloudflare.com/kv/best-practices/)** - Optimization tips
- **[Limits & Pricing](https://developers.cloudflare.com/kv/platform/limits/)** - Understanding quotas

Ready to start coding? Launch the interactive editor above!',

  html_content = '<h1>Cloudflare Workers KV - Interactive Code Editor</h1>
<p>This experiment teaches you the real Cloudflare Workers KV API through interactive coding lessons.</p>

<h2>What You Will Learn</h2>
<ol>
<li>Reading from KV with env.CACHE.get()</li>
<li>Writing to KV with env.CACHE.put()</li>
<li>Listing Keys with env.CACHE.list()</li>
<li>Deleting Data with env.CACHE.delete()</li>
<li>Working with JSON data</li>
<li>Building a complete API</li>
</ol>

<h2>Learn More</h2>
<p>Visit the official <a href="https://developers.cloudflare.com/kv/" target="_blank" rel="noopener noreferrer">Cloudflare Workers KV Documentation</a> for complete details.</p>',

  -- Update metadata
  setup_instructions = 'Learn real Cloudflare Workers KV API through 6 interactive coding lessons',
  reading_time = 25

WHERE slug = 'cloudflare-kv-quick-start';
