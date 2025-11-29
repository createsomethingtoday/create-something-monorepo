# Create Something Monorepo

> **Hermeneutic ecosystem for AI-native development research and practice**

A unified monorepo containing the entire Create Something ecosystem: shared component library, design canon, research platform, interactive lab, and service platform.

## Philosophy

This monorepo embodies Heidegger's hermeneutic circle—understanding emerges through circular movement between parts and whole:

```
@create-something/components (Vorverständnis - foundation)
         ↓ (informs all)
.ltd + .io + .space + .agency (four modes of being)
         ↓ (validates and refines)
    [feeds back to components]
```

Each property represents a distinct mode of being:
- **`.ltd`** - Being-as-Canon (design principles and standards)
- **`.io`** - Being-as-Document (research and theory)
- **`.space`** - Being-as-Experience (interactive practice)
- **`.agency`** - Being-as-Service (commercial application)

## Structure

```
create-something-monorepo/
├── packages/
│   ├── components/    # Shared component library
│   ├── ltd/           # Design canon (.ltd)
│   ├── io/            # Research platform (.io)
│   ├── space/         # Interactive lab (.space)
│   └── agency/        # Service platform (.agency)
├── package.json       # Root workspace configuration
├── pnpm-workspace.yaml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/createsomethingtoday/create-something-monorepo.git
cd create-something-monorepo

# Install all dependencies
pnpm install
```

### Development

```bash
# Start all apps in development mode
pnpm dev:all

# Or start individual properties:
pnpm dev:components  # Component library demo
pnpm dev:ltd         # Design canon
pnpm dev:io          # Research platform
pnpm dev:space       # Interactive lab
pnpm dev:agency      # Service platform
```

### Building

```bash
# Build everything
pnpm build

# Or build individually:
pnpm build:lib       # Component library
pnpm build:ltd       # .ltd
pnpm build:io        # .io
pnpm build:space     # .space
pnpm build:agency    # .agency
```

## Development Workflow

1. **Edit components** in `packages/components/src/lib/components/`
2. **Changes hot-reload** across all running apps automatically
3. **Build library**: `pnpm build:lib`
4. **Run tests**: `pnpm test`

## Component Library

The `@create-something/components` package provides shared components, utilities, and types:

```typescript
import { SEO, Navigation, Footer, PaperCard } from '@create-something/components';
```

All components embody canonical design principles:
- **Dieter Rams**: "Weniger, aber besser" (Less, but better)
- **Minimalism**: No decoration, only essential elements
- **Accessibility**: Semantic HTML, ARIA compliance
- **Performance**: Optimized for Cloudflare Workers edge runtime

## Packages

### [@create-something/components](./packages/components)
Shared component library implementing canonical design principles. Contains SEO, Navigation, Footer, and paper-related components used across all properties.

### [@create-something/ltd](./packages/ltd)
Design canon showcasing masters (Rams, Mies, Eames) and their principles. The philosophical foundation that informs all other properties.

### [@create-something/io](./packages/io)
Research platform publishing comprehensive papers on AI-native development, edge computing, and systematic methodology.

### [@create-something/space](./packages/space)
Interactive laboratory for hands-on practice. Features executable code environments with real-time metrics and progress tracking.

### [@create-something/agency](./packages/agency)
Service delivery platform applying validated research patterns to client projects. Demonstrates methodology in commercial context.

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm dev:all` | Start all packages in parallel |
| `pnpm dev:components` | Start component library demo |
| `pnpm dev:ltd` | Start .ltd in dev mode |
| `pnpm dev:io` | Start .io in dev mode |
| `pnpm dev:space` | Start .space in dev mode |
| `pnpm dev:agency` | Start .agency in dev mode |
| `pnpm build` | Build all packages |
| `pnpm build:lib` | Build component library |
| `pnpm check` | Run type checking across all packages |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all code with Prettier |
| `pnpm test` | Run tests across all packages |

## Deployment

Each property deploys independently to Cloudflare Pages:

- **create-something-ltd** → `createsomething.ltd`
- **create-something-io** → `createsomething.io`
- **create-something-space** → `createsomething.space`
- **create-something-agency** → `createsomething.agency`

GitHub Actions workflows handle automated deployment on push to main.

## Design Principles

All code in this monorepo follows **Dieter Rams' 10 Principles of Good Design**:

1. **Good design is innovative**
2. **Good design makes a product useful**
3. **Good design is aesthetic**
4. **Good design makes a product understandable**
5. **Good design is unobtrusive**
6. **Good design is honest**
7. **Good design is long-lasting**
8. **Good design is thorough down to the last detail**
9. **Good design is environmentally friendly**
10. **Good design is as little design as possible**

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Quick start for contributors:

1. Fork and clone the repository
2. Create a feature branch
3. Make changes in relevant packages
4. Run `pnpm check` and `pnpm format`
5. Submit PR with clear description
6. Reference which canonical principles your changes embody

## License

MIT © Create Something

---

**"Weniger, aber besser"** - Dieter Rams
