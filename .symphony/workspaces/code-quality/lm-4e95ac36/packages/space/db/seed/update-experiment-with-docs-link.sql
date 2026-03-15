-- Add Cloudflare documentation link to the walkthrough
UPDATE papers
SET content = '# Cloudflare Workers KV Quick Start

This experiment will teach you how to use Cloudflare Workers KV storage. KV stands for "Key-Value". This is a type of database where you store information using pairs: a key (the name) and a value (the data).

## What is Cloudflare Workers KV?

Cloudflare Workers KV is a database that stores data across Cloudflare''s global network. This means:

1. Your data is automatically copied to many servers around the world
2. When someone requests data, they get it from the server closest to them
3. This makes reading data very fast (usually less than 50 milliseconds)
4. The system is designed to handle millions of reads per second

### Important characteristics:

- **Best for reading data**: KV is optimized for reading data frequently and writing data less frequently
- **Eventually consistent**: If you write data, it might take a few seconds to appear in all locations
- **Global distribution**: Your data exists in multiple locations automatically
- **Simple to use**: You only need to know two things - the key (name) and the value (data)

## What You Will Learn

In this experiment, you will learn how to:

1. List the KV namespaces available to your Worker
2. Write a simple text value to KV storage
3. Read that value back from KV storage
4. Write a JSON object (structured data) to KV storage
5. Read and parse JSON data from KV storage
6. Delete a key from KV storage

All commands in this experiment run in a safe, isolated environment. You cannot accidentally delete or modify real production data.

## Detailed Step-by-Step Walkthrough

### Step 1: List Available KV Namespaces

**What is a namespace?**
A namespace is a container for your data. Think of it like a folder on your computer. Each namespace has a name and can hold many key-value pairs.

**The command:**
```
kv list
```

**What this command does:**
- Asks the system to show you all KV namespaces available to this Worker
- Returns a list of namespace names
- Does not show the data inside the namespaces, only their names

**What you will see:**
```
SESSIONS, CACHE
```

This means there are two namespaces available:
1. `SESSIONS` - typically used for storing user session data
2. `CACHE` - typically used for storing cached responses or temporary data

---

### Step 2: Write a Simple Text Value

**What you are doing:**
You are storing a piece of text in the CACHE namespace. The text will be associated with a specific key (name) so you can retrieve it later.

**The command:**
```
kv write CACHE test-key ''Hello from CREATE SOMETHING SPACE!''
```

**Breaking down this command:**
- `kv write` = the action you want to perform (write data)
- `CACHE` = the namespace where you want to store the data
- `test-key` = the key (name) you are assigning to this data
- `''Hello from CREATE SOMETHING SPACE!''` = the actual value (data) you are storing

**Important notes:**
- The key name `test-key` can be anything you want (letters, numbers, hyphens, underscores)
- The value is wrapped in single quotes because it contains spaces
- If the key already exists, this command will overwrite the old value with the new value

**What you will see:**
```
✓ Key ''test-key'' written successfully to CACHE
```

This confirms that the data was stored successfully.

---

### Step 3: Read the Value Back

**What you are doing:**
You are asking the system to retrieve the data you just stored and show it to you.

**The command:**
```
kv read CACHE test-key
```

**Breaking down this command:**
- `kv read` = the action you want to perform (read data)
- `CACHE` = the namespace where the data is stored
- `test-key` = the key (name) of the data you want to retrieve

**What you will see:**
```
Hello from CREATE SOMETHING SPACE!
```

This is the exact value you stored in Step 2. The system found the key and returned its value.

---

### Step 4: Write JSON Data

**What is JSON?**
JSON stands for JavaScript Object Notation. It is a way to structure data in a format that both humans and computers can easily read. JSON uses curly braces `{}` to define objects, and inside you have key-value pairs.

**Example:**
```json
{
  "name": "test",
  "value": 42
}
```

This JSON object has two properties:
- A property called `name` with a value of `"test"` (text)
- A property called `value` with a value of `42` (number)

**The command:**
```
kv write CACHE json-example ''{\"name\": \"test\", \"value\": 42}''
```

**Breaking down this command:**
- `kv write` = write data
- `CACHE` = the namespace
- `json-example` = the key for this data
- `''{\"name\": \"test\", \"value\": 42}''` = a JSON object as the value

**Note about the backslashes:**
The backslashes (\\) before the quotes are called "escape characters". They tell the system "this quote is part of the data, not the end of the command".

**What you will see:**
```
✓ Key ''json-example'' written successfully
```

The JSON data is now stored in KV. The data is stored as a string (text), not as a structured object yet.

---

### Step 5: Read JSON Data

**What you are doing:**
You are retrieving the JSON data you just stored and asking the system to parse it (convert it from text into a structured object).

**The command:**
```
kv read CACHE json-example --json
```

**Breaking down this command:**
- `kv read` = read data
- `CACHE` = the namespace
- `json-example` = the key
- `--json` = a flag that tells the system to parse the value as JSON

**What the `--json` flag does:**
1. Retrieves the stored text value
2. Parses it (converts it from text to a JavaScript object)
3. Displays it in a readable format

**What you will see:**
```
{
  name: ''test'',
  value: 42
}
```

You can now see the structured data with its properties displayed clearly.

---

### Step 6: Delete a Key (Optional)

**What you are doing:**
You are removing the `test-key` entry from the CACHE namespace. This deletes both the key and its associated value permanently.

**The command:**
```
kv delete CACHE test-key
```

**Breaking down this command:**
- `kv delete` = delete data
- `CACHE` = the namespace
- `test-key` = the key to delete

**Important notes:**
- This action is permanent and cannot be undone
- After deletion, trying to read `test-key` will return an error or null
- This step is optional because it only cleans up the test data you created

**What you will see:**
```
✓ Key ''test-key'' deleted from CACHE
```

This confirms the key and its value have been removed from the namespace.

---

## What Happens Behind the Scenes

When you execute these commands, here is what happens:

1. **Your browser** sends the command to the Cloudflare Worker
2. **The Worker** receives the command and determines what action to perform
3. **The Worker** communicates with the KV storage API
4. **KV storage** performs the requested operation (read, write, or delete)
5. **KV storage** sends a response back to the Worker
6. **The Worker** formats the response and sends it back to your browser
7. **Your browser** displays the result in the terminal

All of this happens in milliseconds.

## Common Questions

**Q: What happens if I try to read a key that doesn''t exist?**
A: The system will return `null` or an error message saying the key was not found.

**Q: Can I store any type of data in KV?**
A: KV stores everything as text (strings). If you want to store objects, arrays, or numbers, you need to convert them to JSON first (which is text), then parse them back when you read them.

**Q: How long does data stay in KV?**
A: By default, data stays in KV indefinitely unless you delete it or set an expiration time when you write it.

**Q: Is there a limit to how much data I can store?**
A: Yes. Each value can be up to 25 MB in size. Each namespace can hold unlimited keys, but there are rate limits on writes (1 write per second per key).

## Summary

You have now learned the basic operations of Cloudflare Workers KV:

1. **List** namespaces to see what storage containers are available
2. **Write** data by providing a namespace, key, and value
3. **Read** data by providing a namespace and key
4. **Store structured data** using JSON format
5. **Parse JSON data** when reading it back
6. **Delete** data when you no longer need it

These six operations form the foundation of working with KV storage. You can now use KV to build applications that store and retrieve data at the edge, close to your users, for maximum performance.

## Learn More

For detailed documentation, best practices, and advanced features, visit the official Cloudflare Workers KV documentation:

**[Cloudflare Workers KV Documentation](https://developers.cloudflare.com/kv/)**

Key topics covered in the official docs:
- **[How KV Works](https://developers.cloudflare.com/kv/concepts/how-kv-works/)** - Understanding eventual consistency and performance
- **[API Reference](https://developers.cloudflare.com/kv/api/)** - Complete API documentation
- **[Best Practices](https://developers.cloudflare.com/kv/best-practices/)** - Optimization tips and common patterns
- **[Limits & Pricing](https://developers.cloudflare.com/kv/platform/limits/)** - Understanding quotas and costs

The official documentation includes production examples, security considerations, and advanced use cases for building real-world applications with Workers KV.',

html_content = '<h1>Cloudflare Workers KV Quick Start</h1>
<p>This experiment will teach you how to use Cloudflare Workers KV storage. KV stands for "Key-Value". This is a type of database where you store information using pairs: a key (the name) and a value (the data).</p>

<h2>What is Cloudflare Workers KV?</h2>
<p>Cloudflare Workers KV is a database that stores data across Cloudflare''s global network. This means:</p>
<ol>
<li>Your data is automatically copied to many servers around the world</li>
<li>When someone requests data, they get it from the server closest to them</li>
<li>This makes reading data very fast (usually less than 50 milliseconds)</li>
<li>The system is designed to handle millions of reads per second</li>
</ol>

<h3>Important characteristics:</h3>
<ul>
<li><strong>Best for reading data</strong>: KV is optimized for reading data frequently and writing data less frequently</li>
<li><strong>Eventually consistent</strong>: If you write data, it might take a few seconds to appear in all locations</li>
<li><strong>Global distribution</strong>: Your data exists in multiple locations automatically</li>
<li><strong>Simple to use</strong>: You only need to know two things - the key (name) and the value (data)</li>
</ul>

<h2>What You Will Learn</h2>
<p>In this experiment, you will learn how to:</p>
<ol>
<li>List the KV namespaces available to your Worker</li>
<li>Write a simple text value to KV storage</li>
<li>Read that value back from KV storage</li>
<li>Write a JSON object (structured data) to KV storage</li>
<li>Read and parse JSON data from KV storage</li>
<li>Delete a key from KV storage</li>
</ol>
<p>All commands in this experiment run in a safe, isolated environment. You cannot accidentally delete or modify real production data.</p>

<h2>Learn More</h2>
<p>For detailed documentation, visit the official <a href="https://developers.cloudflare.com/kv/" target="_blank" rel="noopener noreferrer">Cloudflare Workers KV Documentation</a>.</p>'

WHERE slug = 'cloudflare-kv-quick-start';
