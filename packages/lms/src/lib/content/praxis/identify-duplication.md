# Identify Duplication

## Objective

Find repeated patterns in the code below and propose a unified abstraction.

## Context

You're reviewing a component library. The team has created multiple button variants, but there's structural duplication hiding beneath the surface.

## Starter Code

```tsx
function PrimaryButton({ text, onClick, disabled, loading }) {
  if (loading) {
    return (
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        <Spinner /> Loading...
      </button>
    );
  }
  if (disabled) {
    return (
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        {text}
      </button>
    );
  }
  return (
    <button
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      onClick={onClick}
    >
      {text}
    </button>
  );
}

function SecondaryButton({ text, onClick, disabled, loading }) {
  if (loading) {
    return (
      <button
        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        <Spinner /> Loading...
      </button>
    );
  }
  if (disabled) {
    return (
      <button
        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        {text}
      </button>
    );
  }
  return (
    <button
      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
      onClick={onClick}
    >
      {text}
    </button>
  );
}

function DangerButton({ text, onClick, disabled, loading }) {
  if (loading) {
    return (
      <button
        className="bg-red-600 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        <Spinner /> Loading...
      </button>
    );
  }
  if (disabled) {
    return (
      <button
        className="bg-red-600 text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        {text}
      </button>
    );
  }
  return (
    <button
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
      onClick={onClick}
    >
      {text}
    </button>
  );
}
```

## Task

1. **Identify** what's duplicated across all three components
2. **Analyze** whether the duplication is essential (must differ) or accidental (can be unified)
3. **Propose** a unified abstraction that eliminates the duplication

## Hints

- Look at the conditional structure (if/if/return)
- Look at the class patterns
- Look at the props interface
- Consider: what varies vs. what's the same?

## Success Criteria

Your solution should:
- [ ] Reduce the total lines of code by at least 50%
- [ ] Maintain all three button variants (primary, secondary, danger)
- [ ] Keep loading and disabled states functional
- [ ] Use a single Button component with a `variant` prop

## Example Solution Structure

```tsx
const variants = {
  primary: { base: '...', hover: '...' },
  secondary: { base: '...', hover: '...' },
  danger: { base: '...', hover: '...' }
};

function Button({ variant = 'primary', text, onClick, disabled, loading }) {
  // Your unified implementation here
}
```
