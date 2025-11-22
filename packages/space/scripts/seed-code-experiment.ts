/**
 * Seed the Cloudflare Workers KV Code Editor Experiment
 * Run with: npx tsx scripts/seed-code-experiment.ts
 */

import { execSync } from 'child_process';

const lessons = [
  {
    id: 1,
    title: 'Reading from KV',
    description: 'Learn how to read data from Workers KV using the get() method. We\'ve pre-populated a key called \'welcome-message\' for you to read.',
    starterCode: `export default {
  async fetch(request, env) {
    // TODO: Read the 'welcome-message' key from env.CACHE
    const value = ''; // Your code here

    return new Response(value);
  }
}`,
    solution: `export default {
  async fetch(request, env) {
    // Read the 'welcome-message' key from env.CACHE
    const value = await env.CACHE.get('welcome-message');

    return new Response(value);
  }
}`,
    hints: [
      'Use await env.CACHE.get(\'key-name\')',
      'Don\'t forget the await keyword',
      'The key name is \'welcome-message\''
    ],
    expectedOutput: 'Welcome to Cloudflare Workers KV!',
    order: 1
  },
  {
    id: 2,
    title: 'Writing to KV',
    description: 'Learn how to write data to Workers KV using the put() method. Write your name to KV and then read it back.',
    starterCode: `export default {
  async fetch(request, env) {
    // TODO: Write your name to the 'my-name' key
    // await env.CACHE.put(...);

    // TODO: Read it back
    const name = ''; // Your code here

    return new Response(\`Hello, \${name}!\`);
  }
}`,
    solution: `export default {
  async fetch(request, env) {
    // Write your name to the 'my-name' key
    await env.CACHE.put('my-name', 'Alice');

    // Read it back
    const name = await env.CACHE.get('my-name');

    return new Response(\`Hello, \${name}!\`);
  }
}`,
    hints: [
      'Use await env.CACHE.put(\'key\', \'value\')',
      'Then use env.CACHE.get(\'key\') to read it back',
      'Both operations need await'
    ],
    expectedOutput: 'Hello, Alice! (or whatever name you chose)',
    order: 2
  },
  {
    id: 3,
    title: 'Listing Keys',
    description: 'Learn how to list all keys in a KV namespace using the list() method. This is useful for discovering what data is stored.',
    starterCode: `export default {
  async fetch(request, env) {
    // TODO: List all keys in the namespace
    const keys = ''; // Your code here

    // Return the list as JSON
    return new Response(
      JSON.stringify(keys, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}`,
    solution: `export default {
  async fetch(request, env) {
    // List all keys in the namespace
    const keys = await env.CACHE.list();

    // Return the list as JSON
    return new Response(
      JSON.stringify(keys, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}`,
    hints: [
      'Use await env.CACHE.list()',
      'The result is an object with a \'keys\' array',
      'Use JSON.stringify() to format the output'
    ],
    expectedOutput: '{ "keys": [...] }',
    order: 3
  },
  {
    id: 4,
    title: 'Deleting Keys',
    description: 'Learn how to delete data from Workers KV using the delete() method. Create a temporary key, then delete it.',
    starterCode: `export default {
  async fetch(request, env) {
    // First, write a temporary key
    await env.CACHE.put('temp-data', 'temporary');

    // TODO: Delete the key
    // await env.CACHE.delete(...);

    // Try to read it back (should be null)
    const result = await env.CACHE.get('temp-data');

    return new Response(
      result === null ? 'Deleted!' : 'Still exists'
    );
  }
}`,
    solution: `export default {
  async fetch(request, env) {
    // First, write a temporary key
    await env.CACHE.put('temp-data', 'temporary');

    // Delete the key
    await env.CACHE.delete('temp-data');

    // Try to read it back (should be null)
    const result = await env.CACHE.get('temp-data');

    return new Response(
      result === null ? 'Deleted!' : 'Still exists'
    );
  }
}`,
    hints: [
      'Use await env.CACHE.delete(\'key-name\')',
      'After deletion, get() will return null',
      'Don\'t forget to await the delete operation'
    ],
    expectedOutput: 'Deleted!',
    order: 4
  },
  {
    id: 5,
    title: 'Working with JSON',
    description: 'Learn how to store and retrieve structured data using JSON. KV stores everything as strings, so you need to stringify objects before storing and parse them when reading.',
    starterCode: `export default {
  async fetch(request, env) {
    // Create a user object
    const user = { name: 'Alice', score: 100 };

    // TODO: Convert to JSON and store
    // await env.CACHE.put('user', ...);

    // TODO: Read and parse back
    const stored = ''; // Your code here
    const parsed = ''; // Your code here

    return new Response(
      \`\${parsed.name} has \${parsed.score} points\`
    );
  }
}`,
    solution: `export default {
  async fetch(request, env) {
    // Create a user object
    const user = { name: 'Alice', score: 100 };

    // Convert to JSON and store
    await env.CACHE.put('user', JSON.stringify(user));

    // Read and parse back
    const stored = await env.CACHE.get('user');
    const parsed = JSON.parse(stored);

    return new Response(
      \`\${parsed.name} has \${parsed.score} points\`
    );
  }
}`,
    hints: [
      'Use JSON.stringify() to convert object to string',
      'Use JSON.parse() to convert string back to object',
      'KV only stores strings, not objects directly'
    ],
    expectedOutput: 'Alice has 100 points',
    order: 5
  },
  {
    id: 6,
    title: 'Building an API',
    description: 'Build a simple counter API using Workers KV. Handle different URL paths to initialize, increment, and get the counter value. This combines everything you\'ve learned!',
    starterCode: `export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/set') {
      // TODO: Initialize counter to 0
      return new Response('Counter initialized');
    }

    if (url.pathname === '/increment') {
      // TODO: Get current value, add 1, store back
      const current = 0; // Get from KV
      const newValue = current + 1;
      // Store back to KV
      return new Response(\`Counter: \${newValue}\`);
    }

    if (url.pathname === '/get') {
      // TODO: Get and return current value
      const value = 0; // Get from KV
      return new Response(\`Counter: \${value}\`);
    }

    return new Response('Try /set, /increment, or /get');
  }
}`,
    solution: `export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/set') {
      await env.CACHE.put('counter', '0');
      return new Response('Counter initialized');
    }

    if (url.pathname === '/increment') {
      const current = await env.CACHE.get('counter') || '0';
      const newValue = parseInt(current) + 1;
      await env.CACHE.put('counter', newValue.toString());
      return new Response(\`Counter: \${newValue}\`);
    }

    if (url.pathname === '/get') {
      const value = await env.CACHE.get('counter') || '0';
      return new Response(\`Counter: \${value}\`);
    }

    return new Response('Try /set, /increment, or /get');
  }
}`,
    hints: [
      'Use parseInt() to convert string to number',
      'Use toString() to convert number back to string',
      'Handle the case where counter doesn\'t exist yet (use || \'0\')',
      'The URL object gives you request.url parsed into parts'
    ],
    expectedOutput: 'Counter: 1 (after set then increment)',
    order: 6
  }
];

const content = `# Cloudflare Workers KV - Interactive Code Editor

This experiment teaches you the real Cloudflare Workers KV API through interactive coding lessons. You'll write actual Workers code that executes in your browser.

## What is Cloudflare Workers KV?

Cloudflare Workers KV is a global, low-latency key-value data store. It stores data in a small number of centralized data centers, then caches that data in Cloudflare's edge network after access.

### Key Characteristics

- **Optimized for reads**: Best for read-heavy workloads with occasional writes
- **Eventually consistent**: Changes may take up to 60 seconds to propagate globally
- **Global distribution**: Your data is automatically replicated across Cloudflare's network
- **Simple API**: Just four main operations - get, put, list, delete

## What You Will Learn

Through 6 interactive lessons, you will master:

1. **Reading from KV** - Use \`env.CACHE.get()\` to retrieve data
2. **Writing to KV** - Use \`env.CACHE.put()\` to store data
3. **Listing Keys** - Use \`env.CACHE.list()\` to discover stored keys
4. **Deleting Data** - Use \`env.CACHE.delete()\` to remove keys
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

Ready to start coding? Launch the interactive editor above!`;

const htmlContent = `<h1>Cloudflare Workers KV - Interactive Code Editor</h1>
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
<p>Visit the official <a href="https://developers.cloudflare.com/kv/" target="_blank" rel="noopener noreferrer">Cloudflare Workers KV Documentation</a> for complete details.</p>`;

// Generate SQL
const codeLessonsJson = JSON.stringify(lessons);
const contentEscaped = content.replace(/'/g, "''");
const htmlEscaped = htmlContent.replace(/'/g, "''");
const lessonsEscaped = codeLessonsJson.replace(/'/g, "''");

const sql = `UPDATE papers
SET
  is_executable = 1,
  terminal_commands = NULL,
  code_lessons = '${lessonsEscaped}',
  content = '${contentEscaped}',
  html_content = '${htmlEscaped}',
  setup_instructions = 'Learn real Cloudflare Workers KV API through 6 interactive coding lessons',
  reading_time = 25
WHERE slug = 'cloudflare-kv-quick-start';`;

console.log('Executing SQL update...');
console.log('SQL length:', sql.length);

try {
  // Write SQL to temp file
  const { writeFileSync, unlinkSync } = await import('fs');
  const tmpFile = '/tmp/seed-code-experiment.sql';
  writeFileSync(tmpFile, sql);

  // Execute using wrangler
  execSync(`wrangler d1 execute create-something-db --remote --file=${tmpFile}`, {
    stdio: 'inherit'
  });

  console.log('✅ Successfully seeded code editor experiment!');

  // Clean up
  unlinkSync(tmpFile);
} catch (error) {
  console.error('❌ Failed to seed experiment:', error);
  process.exit(1);
}
