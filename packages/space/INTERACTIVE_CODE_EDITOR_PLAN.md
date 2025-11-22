# Interactive Code Editor - Architecture Plan

## Overview
Build an interactive code editor that teaches real Cloudflare Workers KV API with executable TypeScript/JavaScript code.

## Architecture

### Frontend Components

#### 1. CodeEditor.svelte
- Uses CodeMirror 6 for code editing
- TypeScript/JavaScript syntax highlighting
- Auto-completion for Workers API
- Line numbers, error indicators
- Theme: Dark mode to match site aesthetic

#### 2. ExperimentCodeEditor.svelte (replaces ExperimentRuntime)
- Three-panel layout:
  - **Left**: Lesson instructions (scrollable)
  - **Center**: CodeEditor component
  - **Right**: Output panel (console logs, results, errors)
- Progress tracker (6 lessons)
- Action buttons: Run Code, Reset, Next Lesson, Previous Lesson
- Real-time execution feedback

### Backend API

#### 3. /api/code/execute endpoint
```typescript
POST /api/code/execute
Body: {
  code: string,
  lesson_id: number,
  session_id: string
}

Response: {
  success: boolean,
  output: string[],
  result: any,
  error?: string,
  kvState: { key: string, value: any }[]
}
```

**Security Measures:**
- Code validation (no eval, no imports, no file system access)
- Timeout limits (5 seconds max)
- Isolated KV namespace per session
- AST parsing to detect malicious code
- Rate limiting

**Execution Environment:**
- Simulates Workers `env` object with real KV bindings
- Captures console.log() for output panel
- Runs in isolated context (VM2 or similar)
- Returns KV state after execution for visualization

### Lessons Structure

**Lesson 1: Reading from KV**
```typescript
export default {
  async fetch(request, env) {
    // Read a pre-populated key from KV
    const value = await env.CACHE.get('welcome-message');
    return new Response(value);
  }
}
```

**Lesson 2: Writing to KV**
```typescript
export default {
  async fetch(request, env) {
    // Write your name to KV
    await env.CACHE.put('my-name', 'Your Name Here');
    const name = await env.CACHE.get('my-name');
    return new Response(`Hello, ${name}!`);
  }
}
```

**Lesson 3: Listing Keys**
```typescript
export default {
  async fetch(request, env) {
    // List all keys in the namespace
    const keys = await env.CACHE.list();
    return new Response(JSON.stringify(keys, null, 2));
  }
}
```

**Lesson 4: Deleting Keys**
```typescript
export default {
  async fetch(request, env) {
    await env.CACHE.put('temp-data', 'temporary');
    await env.CACHE.delete('temp-data');
    const result = await env.CACHE.get('temp-data');
    return new Response(result === null ? 'Deleted!' : 'Still exists');
  }
}
```

**Lesson 5: Working with JSON**
```typescript
export default {
  async fetch(request, env) {
    const user = { name: 'Alice', score: 100 };
    await env.CACHE.put('user', JSON.stringify(user));

    const stored = await env.CACHE.get('user');
    const parsed = JSON.parse(stored);
    return new Response(`${parsed.name} has ${parsed.score} points`);
  }
}
```

**Lesson 6: Building an API**
```typescript
export default {
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
      return new Response(`Counter: ${newValue}`);
    }

    return new Response('Try /set or /increment');
  }
}
```

## Database Schema Updates

Add to papers table:
- `code_lessons` (TEXT - JSON array of lesson objects)
- `starter_code` (TEXT - initial code template)
- `solution_code` (TEXT - reference solution)

Lesson object structure:
```json
{
  "id": 1,
  "title": "Reading from KV",
  "description": "Learn how to read data from Workers KV",
  "starterCode": "export default { async fetch...",
  "solution": "...",
  "hints": ["Use env.CACHE.get()", "Don't forget await"],
  "expectedOutput": "Welcome message content"
}
```

## UI/UX Design

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│ [Progress: 1/6] Reading from KV                  [Run] │
├──────────────┬──────────────────────┬──────────────────┤
│              │                      │                  │
│ Instructions │   Code Editor        │  Output Panel    │
│              │                      │                  │
│ - Step 1     │ export default {     │ > Running...     │
│ - Step 2     │   async fetch() {    │ > Success!       │
│ - Step 3     │     ...              │ > Welcome!       │
│              │   }                  │                  │
│ [< Prev]     │ }                    │ KV State:        │
│ [Next >]     │                      │ - welcome: "Hi"  │
│              │                      │                  │
└──────────────┴──────────────────────┴──────────────────┘
```

### Mobile Adaptation
- Tabbed interface: Instructions | Code | Output
- Full-width code editor
- Sticky Run button

## Implementation Steps

1. Install dependencies (CodeMirror 6, language support)
2. Create CodeEditor.svelte component
3. Create ExperimentCodeEditor.svelte component
4. Build /api/code/execute endpoint with safe execution
5. Update database schema for code lessons
6. Create lesson content for all 6 lessons
7. Test execution safety and performance
8. Deploy and validate

## Security Considerations

- **No arbitrary code execution**: Use AST parsing to validate code structure
- **Whitelist approach**: Only allow specific Workers API calls
- **Timeout limits**: Kill execution after 5 seconds
- **Rate limiting**: Max 10 executions per minute per session
- **Isolated namespaces**: Each session gets a KV namespace prefix
- **No external requests**: Block fetch() to external URLs
- **Memory limits**: Cap memory usage per execution

## Success Metrics

- Users complete all 6 lessons
- Code execution success rate > 95%
- Average time per lesson < 5 minutes
- Zero security incidents
- Positive feedback on learning experience
