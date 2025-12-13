# Maverick X Admin

Content management system for Maverick X, built with SvelteKit and Cloudflare.

## Architecture

```
maverick-admin/
├── src/
│   ├── routes/
│   │   ├── login/              # Authentication
│   │   ├── dashboard/          # Admin dashboard
│   │   │   ├── solutions/      # PetroX, LithX, DME products
│   │   │   ├── news/           # News articles
│   │   │   ├── testimonials/   # Customer reviews
│   │   │   ├── contacts/       # Contact form submissions
│   │   │   ├── media/          # R2 media library
│   │   │   └── settings/       # Site settings
│   │   └── api/
│   │       ├── auth/           # Login/logout
│   │       ├── solutions/      # CRUD operations
│   │       ├── news/           # CRUD operations
│   │       └── contacts/       # Contact management
│   └── hooks.server.ts         # Auth middleware
├── migrations/
│   └── 0001_initial_schema.sql # D1 database schema
└── wrangler.toml               # Cloudflare configuration
```

## Cloudflare Resources

| Resource | Type | Purpose |
|----------|------|---------|
| `maverick-db` | D1 Database | Content storage |
| `maverick-media` | R2 Bucket | Images and videos |
| `maverick-sessions` | KV Namespace | Auth sessions |

## Setup

### 1. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create maverick-db

# Create KV namespace
wrangler kv namespace create maverick-sessions

# Create R2 bucket
wrangler r2 bucket create maverick-media
```

### 2. Update wrangler.toml

Add the IDs from the commands above to `wrangler.toml`.

### 3. Run Migrations

```bash
# Local development
pnpm db:migrate:local

# Production
pnpm db:migrate
```

### 4. Set Environment Variables

In Cloudflare Dashboard > Pages > Settings > Environment Variables:

```
AUTH_SECRET=<random-32-char-string>
ADMIN_EMAIL=admin@maverickx.com
ADMIN_PASSWORD_HASH=<your-password>
```

### 5. Deploy

```bash
pnpm deploy
```

## Development

```bash
# Install dependencies
pnpm install

# Generate types
pnpm types

# Start dev server
pnpm dev
```

## Content Types

### Solutions
Product solutions for each brand (PetroX, LithX, DME). Each solution has:
- Name and symbol (e.g., "Copper", "Cu")
- Headline and description
- Features list
- Stats (label/value pairs)
- Image

### News Articles
Blog posts and company news:
- Title, excerpt, full content (Markdown)
- Category (Product Launch, Technology, etc.)
- Featured flag
- Published status

### Testimonials
Customer reviews:
- Author name and title
- Content
- Associated brand (optional)

### Contact Submissions
Form submissions from maverickx.com:
- Contact details (name, email, company)
- Category and selected products
- Status tracking (new, contacted, qualified, closed)
- Internal notes

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/logout` - Clear session

### Solutions
- `GET /api/solutions` - List all solutions
- `GET /api/solutions/:id` - Get solution details
- `POST /api/solutions` - Create solution
- `PUT /api/solutions/:id` - Update solution
- `DELETE /api/solutions/:id` - Delete solution

### News
- `GET /api/news` - List articles
- `POST /api/news` - Create article
- `PUT /api/news/:id` - Update article
- `DELETE /api/news/:id` - Delete article

### Contacts
- `GET /api/contacts` - List submissions
- `PUT /api/contacts/:id` - Update status/notes
- `POST /api/contacts` - Create submission (from public site)

## Integration with Maverick X Site

The main Maverick X site (Next.js) will fetch content from this admin's API:

```typescript
// Example: Fetch solutions for a brand page
const response = await fetch('https://admin.maverickx.com/api/solutions?brand=petrox');
const solutions = await response.json();
```

Alternatively, use Cloudflare's Service Bindings to directly access the D1 database from the main site's Worker.
