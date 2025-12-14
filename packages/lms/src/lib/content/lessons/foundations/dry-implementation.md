# DRY: Implementation Level

## The Question

**"Have I built this before?"**

This is the first level of the Subtractive Triad. Before asking whether something should exist, we ask whether it already does.

DRY (Don't Repeat Yourself) is the discipline of **unifying**. When you find yourself writing the same logic twice, truth is being obscured by repetition.

## Why Duplication Obscures

Every time you duplicate code, you create multiple sources of truth. When the logic needs to change—and it will—you must remember to update every copy.

**The problem isn't effort. The problem is fragmentation.**

```typescript
// Three places that validate emails
function validateContactEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkUserEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}
```

Which one is right? All three? None of them? The truth about email validation is scattered across three implementations, each with subtle differences.

When requirements change ("we need to allow plus addressing"), you must find and fix all three. Miss one, and you have a bug.

## The Discipline of Unifying

DRY is archeology. You're not creating validation logic—you're revealing the truth that was obscured by repetition.

```typescript
// One source of truth
function isValidEmail(email: string): boolean {
  // Email validation per RFC 5322 simplified
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// All call sites use the same truth
const contactValid = isValidEmail(contact.email);
const userValid = isValidEmail(user.email);
const subscriberValid = isValidEmail(subscriber.email);
```

Now when requirements change, there's one place to update. The truth is unified.

## Recognizing Duplication

Duplication appears in three forms:

### 1. Exact Duplication
The same code copied and pasted. Easy to spot, easy to fix.

```typescript
// Before: Exact duplication
function formatUserDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatEventDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

// After: Unified
function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
```

### 2. Structural Duplication
The same pattern with different details. Harder to spot—requires seeing the structure beneath the variation.

```typescript
// Before: Structural duplication
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

async function getPost(id: string) {
  const response = await fetch(`/api/posts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch post');
  return response.json();
}

async function getComment(id: string) {
  const response = await fetch(`/api/comments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch comment');
  return response.json();
}

// After: Pattern revealed
async function fetchResource<T>(resource: string, id: string): Promise<T> {
  const response = await fetch(`/api/${resource}/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch ${resource}`);
  return response.json();
}

const user = await fetchResource<User>('users', id);
const post = await fetchResource<Post>('posts', id);
const comment = await fetchResource<Comment>('comments', id);
```

### 3. Conceptual Duplication
Different implementations of the same concept. Hardest to spot—requires understanding the domain.

```typescript
// Before: Conceptual duplication
// Two different ways to check if a user can edit
function canEditPost(user: User, post: Post): boolean {
  return user.id === post.authorId || user.role === 'admin';
}

function hasEditPermission(user: User, comment: Comment): boolean {
  return comment.userId === user.id || user.isAdmin;
}

// After: Concept unified
interface OwnedResource {
  ownerId: string;
}

function canEdit(user: User, resource: OwnedResource): boolean {
  return user.id === resource.ownerId || user.role === 'admin';
}

const canEditPost = canEdit(user, { ownerId: post.authorId });
const canEditComment = canEdit(user, { ownerId: comment.userId });
```

## When NOT to DRY

DRY is about **truth**, not **text**. Don't unify code that happens to look similar but represents different truths.

**Anti-pattern: Premature abstraction**

```typescript
// Bad: Unifying code that's coincidentally similar
function validateInput(value: string, type: 'email' | 'phone' | 'username'): boolean {
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (type === 'phone') return /^\d{10}$/.test(value);
  if (type === 'username') return /^[a-zA-Z0-9_]{3,20}$/.test(value);
  return false;
}

// Good: Keep separate truths separate
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}
```

These validations will evolve independently. Email rules change differently than phone rules. Forcing them into one function couples unrelated truths.

**Rule of thumb**: If changing one truth would never affect the other, they're separate truths. Keep them separate.

## DRY Across Files

As projects grow, duplication spreads across modules. The discipline extends:

```
Before:
src/
├── auth/
│   └── validate-email.ts      // Email validation
├── users/
│   └── check-email.ts         // Email validation (again)
└── newsletter/
    └── email-utils.ts         // Email validation (again)

After:
src/
├── shared/
│   └── validation/
│       └── email.ts           // One source of truth
├── auth/
│   └── auth-service.ts        // Imports from shared/validation
├── users/
│   └── user-service.ts        // Imports from shared/validation
└── newsletter/
    └── newsletter-service.ts  // Imports from shared/validation
```

**Organizational DRY**: Truth lives in one place. All consumers import it.

## The Practice

Developing DRY sight requires:

1. **Read your code** → Look for patterns you've seen before
2. **Refactor immediately** → The second time you write it, extract it
3. **Name clearly** → The name should reveal the unified truth

**The habit**: When you find yourself copying code, stop. Ask: "What truth am I duplicating?" Then extract that truth.

## Common Patterns

### Configuration
```typescript
// Bad: Scattered configuration
const API_URL = 'https://api.example.com';  // In one file
const apiEndpoint = 'https://api.example.com';  // In another
const API_BASE = 'https://api.example.com';  // In a third

// Good: One source
// config.ts
export const API_URL = 'https://api.example.com';
```

### Error Messages
```typescript
// Bad: Duplicated error handling
catch (error) {
  console.error('Failed to fetch user:', error);
  throw new Error('Failed to fetch user');
}

catch (error) {
  console.error('Failed to fetch post:', error);
  throw new Error('Failed to fetch post');
}

// Good: Unified error handling
function handleFetchError(resource: string, error: unknown): never {
  console.error(`Failed to fetch ${resource}:`, error);
  throw new Error(`Failed to fetch ${resource}`);
}

catch (error) {
  handleFetchError('user', error);
}
```

### Type Guards
```typescript
// Bad: Repeated type checking
if (typeof value === 'string' && value.length > 0) { /* ... */ }
if (typeof name === 'string' && name.length > 0) { /* ... */ }

// Good: Named truth
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

if (isNonEmptyString(value)) { /* ... */ }
if (isNonEmptyString(name)) { /* ... */ }
```

## DRY in Practice

The discipline becomes automatic:

1. Write code
2. Notice similarity to something you wrote before
3. Ask: "Is this the same truth?"
4. If yes: Extract and unify
5. If no: Keep separate

**The goal isn't eliminating all repetition.** The goal is **one source for each truth**.

## Next Level

DRY handles implementation-level duplication. But what about the artifacts themselves?

Not all code that should be unified *should exist* in the first place. A feature might be perfectly DRY and still be unnecessary.

That's where Rams comes in: **Does this earn its existence?**

---

## Cross-Property References

> **Canon Reference**: See [The Subtractive Triad](https://createsomething.ltd/ethos) for how DRY fits into the three-level discipline.
>
> **Research Depth**: Read [Iterative Reduction Pattern](https://createsomething.ltd/patterns/iterative-reduction) for the philosophical foundation of unification.
>
> **Practice**: The [Triad Audit experiment](https://createsomething.space/experiments/workway-canon-audit) includes DRY analysis as its first step.

---

## Reflection

Before the praxis exercise:

1. Find three examples of duplication in your current project—one exact, one structural, one conceptual
2. Which duplication did you notice first? Which was hardest to see?
3. What truths are currently scattered across your codebase?

**Praxis**: You'll audit a real codebase for duplication and practice the extraction process.
