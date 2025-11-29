# Contributing to Create Something

Thank you for your interest in contributing. This document outlines how to contribute effectively while honoring the project's philosophical foundation.

## The Subtractive Triad

All contributions are evaluated through three levels:

| Level | Question | Action |
|-------|----------|--------|
| **DRY** | "Have I built this before?" | Unify—don't duplicate |
| **Rams** | "Does this earn its existence?" | Remove—less, but better |
| **Heidegger** | "Does this serve the whole?" | Reconnect—parts serve the system |

## Before Contributing

1. **Read the philosophy**: Review [CLAUDE.md](./CLAUDE.md) and [STANDARDS.md](./STANDARDS.md)
2. **Understand the structure**: Each package serves a distinct purpose
3. **Check existing patterns**: The codebase has established conventions

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/create-something-monorepo.git
cd create-something-monorepo

# Install dependencies
pnpm install

# Start development
pnpm dev:all
```

## Making Changes

### Code Style

- Run `pnpm format` before committing
- Run `pnpm check` to verify types
- Follow existing patterns in the codebase

### Commit Messages

Use conventional commits:

```
type: brief description

- detail 1
- detail 2
```

Types: `feat`, `fix`, `refactor`, `docs`, `security`, `perf`

### Pull Requests

1. Create a feature branch from `main`
2. Make focused, minimal changes
3. Ensure all checks pass
4. Write a clear PR description
5. Reference which Rams principles your changes embody

## What We're Looking For

**Good contributions:**
- Bug fixes with minimal footprint
- Performance improvements
- Accessibility enhancements
- Documentation clarifications

**Contributions that need discussion first:**
- New features (open an issue first)
- Architectural changes
- New dependencies

## Security

If you discover a security vulnerability, please email security@createsomething.io rather than opening a public issue.

## Questions?

Open an issue for questions about contributing. We're happy to help.

---

*"Weniger, aber besser"* — Every contribution should make the whole simpler, not more complex.
