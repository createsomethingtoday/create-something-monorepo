# Verticals

Industry-specific website templates for the Templates Platform.

## Available Templates

| Vertical | Description | Status |
|----------|-------------|--------|
| `professional-services` | Law firms, consulting, B2B services | Production |
| `medical-practice` | Healthcare, dental, medical clinics | Production |
| `restaurant` | Restaurants, cafes, food service | Production |
| `creative-agency` | Design agencies, studios | Development |
| `creative-portfolio` | Individual creative portfolios | Development |
| `architecture-studio` | Architecture and design firms | Development |
| `law-firm` | Legal practices | Development |
| `personal-injury` | PI law specialty | Development |

## Structure

Each vertical follows:

```
{vertical}/
├── src/
│   ├── lib/
│   │   └── config/     # Template configuration
│   └── routes/         # SvelteKit pages
├── static/             # Assets
└── package.json
```

## Shared Components

Common components live in `shared/` and are imported by all verticals.

## Deployment

Templates are built and uploaded to R2, then served via the router worker at `templates.createsomething.space`.

## Related

- `packages/templates-platform` - Tenant management and routing
- `createsomething.space/templates` - Public template showcase
