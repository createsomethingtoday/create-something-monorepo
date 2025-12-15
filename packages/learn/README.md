# @createsomething/learn

MCP server for learning the CREATE SOMETHING methodology through Claude Code.

## The Subtractive Triad

Every creation exists simultaneously at three levels:

| Level | Discipline | Question |
|-------|------------|----------|
| **Implementation** | DRY | "Have I built this before?" |
| **Artifact** | Rams | "Does this earn its existence?" |
| **System** | Heidegger | "Does this serve the whole?" |

## Installation

```bash
npx @createsomething/learn init
```

Or add to your Claude Code settings manually:

```json
{
  "mcpServers": {
    "learn": {
      "command": "npx",
      "args": ["@createsomething/learn"]
    }
  }
}
```

## Usage

Once configured, open Claude Code and say:

> "Help me learn the CREATE SOMETHING methodology"

Claude will guide you through:
1. Authentication (magic link to your email)
2. The Foundations path
3. Praxis exercises with automated code audits
4. Reflection-based completion

## Tools

| Tool | Description |
|------|-------------|
| `learn_authenticate` | Sign in with magic link |
| `learn_status` | View your progress |
| `learn_lesson` | Fetch lesson content |
| `learn_complete` | Mark lesson complete with reflection |
| `learn_praxis` | Execute praxis exercises |

## Learning Paths

1. **Foundations** - The philosophical basis
2. **Craft** - Applying principles to creation
3. **Infrastructure** - Systems that recede into use
4. **Agents** - AI-native development
5. **Method** - The Subtractive Triad in practice
6. **Systems** - Hermeneutic architecture
7. **Partnership** - Human-AI collaboration
8. **Advanced** - Mastery and teaching

## Progress Sync

Your progress syncs with [learn.createsomething.space](https://learn.createsomething.space). Same account, same progress—whether learning in the browser or through Claude Code.

## Offline Support

Lessons are cached locally for 24 hours. Learn on the train, reflect anywhere.

## CLI Commands

```bash
npx @createsomething/learn init     # Setup instructions
npx @createsomething/learn status   # Auth & cache status
npx @createsomething/learn clear    # Clear credentials
```

## Philosophy

The tool recedes; learning emerges through use.

This MCP server embodies Heidegger's distinction between *Zuhandenheit* (ready-to-hand) and *Vorhandenheit* (present-at-hand). When working well, you don't notice the infrastructure—you simply learn through conversation with Claude.

The hermeneutic circle: practice → reflection → understanding → practice.

## License

MIT
