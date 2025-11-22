-- Add hints to Cloudflare KV Quick Start experiment
-- These hints will be used by the mechanism design system

UPDATE papers
SET code_lessons = '
[
  {
    "id": 1,
    "title": "Create a KV Namespace",
    "description": "Learn how to create a Cloudflare KV namespace using Wrangler CLI",
    "starterCode": "// Create a new KV namespace\nawait env.CACHE.put(\"hello\", \"world\");",
    "solution": "// Create KV namespace: wrangler kv:namespace create CACHE\n// Add to wrangler.toml:\n// [[kv_namespaces]]\n// binding = \"CACHE\"\n// id = \"your-namespace-id\"\n\nawait env.CACHE.put(\"hello\", \"world\");\nconsole.log(\"Key created successfully!\");",
    "hints": [
      "Make sure you''re in your project directory before creating the namespace",
      "The namespace name ''CACHE'' will be used in your wrangler.toml binding",
      "If you get a login error, try running ''wrangler whoami'' first"
    ],
    "expectedOutput": "Key created successfully!",
    "order": 1
  },
  {
    "id": 2,
    "title": "Store Data",
    "description": "Learn how to store key-value pairs in KV",
    "starterCode": "// Store a value\nawait env.CACHE.put(\"user:123\", \"John Doe\");",
    "solution": "await env.CACHE.put(\"user:123\", \"John Doe\");\nconsole.log(\"Data stored!\");",
    "hints": [
      "The key-value syntax is: await env.CACHE.put(key, value)",
      "Make sure to use ''await'' when working with KV operations",
      "Check that your CACHE binding matches what''s in wrangler.toml"
    ],
    "expectedOutput": "Data stored!",
    "order": 2
  },
  {
    "id": 3,
    "title": "Retrieve Data",
    "description": "Learn how to get values from KV",
    "starterCode": "// Get a value\nconst value = await env.CACHE.get(\"user:123\");",
    "solution": "const value = await env.CACHE.get(\"user:123\");\nconsole.log(\"Retrieved:\", value);",
    "hints": [
      "Use await env.CACHE.get(key) to retrieve values",
      "Remember that KV values are returned as strings by default",
      "If the key doesn''t exist, get() returns null"
    ],
    "expectedOutput": "Retrieved: John Doe",
    "order": 3
  },
  {
    "id": 4,
    "title": "List Keys",
    "description": "Learn how to list keys in your KV namespace",
    "starterCode": "// List all keys\nconst list = await env.CACHE.list();",
    "solution": "const list = await env.CACHE.list();\nconsole.log(\"Keys:\", list.keys.map(k => k.name));",
    "hints": [
      "The list() method returns an object with keys array",
      "You can filter results with a prefix: env.CACHE.list({ prefix: ''user:'' })",
      "Listing is paginated - check the ''cursor'' field for more results"
    ],
    "expectedOutput": "Keys: [\"hello\", \"user:123\"]",
    "order": 4
  },
  {
    "id": 5,
    "title": "Delete Data",
    "description": "Learn how to remove keys from KV",
    "starterCode": "// Delete a key\nawait env.CACHE.delete(\"user:123\");",
    "solution": "await env.CACHE.delete(\"user:123\");\nconsole.log(\"Key deleted!\");",
    "hints": [
      "The delete() method removes a key-value pair",
      "Deleting a non-existent key doesn''t throw an error",
      "Consider using expiration instead of manual deletion for temporary data"
    ],
    "expectedOutput": "Key deleted!",
    "order": 5
  },
  {
    "id": 6,
    "title": "Set Expiration",
    "description": "Learn how to set TTL on KV entries",
    "starterCode": "// Set expiration (60 seconds)\nawait env.CACHE.put(\"temp\", \"data\", { expirationTtl: 60 });",
    "solution": "await env.CACHE.put(\"temp\", \"data\", { expirationTtl: 60 });\nconsole.log(\"Key will expire in 60 seconds\");",
    "hints": [
      "expirationTtl is in seconds, not milliseconds",
      "Set it in the put() options: { expirationTtl: 60 }",
      "Expired keys are automatically removed by Cloudflare"
    ],
    "expectedOutput": "Key will expire in 60 seconds",
    "order": 6
  }
]
'
WHERE slug = 'cloudflare-kv-quick-start';
