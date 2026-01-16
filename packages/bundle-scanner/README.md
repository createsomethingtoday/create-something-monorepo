# @create-something/bundle-scanner

A client-side web application for scanning Webflow Marketplace bundles for security, privacy, network, and UX policy compliance.

## Features

- 📦 **ZIP Bundle Scanning** - Extract and analyze app bundles with safety limits
- 🔍 **18 Security Rules** - Comprehensive ruleset covering common vulnerabilities  
- 🤖 **AI-Powered Analysis** - Optional Google Gemini integration for deeper insights
- 📊 **Triage Dashboard** - 60-second review summary with recommendations
- 📧 **Email Templates** - Auto-generated rejection email drafts
- 📜 **Scan History** - Browser-based storage via IndexedDB
- ⚙️ **Customizable Rules** - Edit rulesets in JSON format

## Getting Started

### Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
cd packages/bundle-scanner
pnpm dev
```

The app will be available at `http://localhost:3100`.

### Build

```bash
pnpm build
```

### Configuration

#### AI Integration

To enable AI-powered analysis, either:

1. Set the `VITE_GOOGLE_API_KEY` environment variable:
   ```bash
   export VITE_GOOGLE_API_KEY=your_api_key_here
   ```

2. Or enter your API key directly in the UI when prompted.

## Usage

1. **Upload a Bundle** - Select a `.zip` file containing a Webflow app bundle
2. **Run Scan** - Click "Run Scan" to analyze the bundle
3. **Review Results** - Check the triage dashboard for a quick summary
4. **AI Analysis** (Optional) - Click "Analyze with AI" for deeper insights
5. **Export** - Download the full report as JSON

## Architecture

This package uses `@create-something/bundle-scanner-core` for all scanning logic:

```
bundle-scanner/
├── src/
│   ├── App.tsx              # Main application
│   ├── components/          # React UI components
│   │   ├── AiSuggestionsPanel.tsx
│   │   ├── FindingCard.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── PolicyPanel.tsx
│   │   ├── TriageDashboard.tsx
│   │   └── VerdictBadge.tsx
│   ├── lib/
│   │   └── db.ts           # IndexedDB wrapper
│   ├── main.tsx
│   └── index.css
├── index.html
└── package.json
```

## Rule Categories

| Category | Description |
|----------|-------------|
| SECURITY | Dynamic code execution, secrets, obfuscation, XSS |
| NETWORK | External egress, insecure protocols |
| PRIVACY | Hardware access, fingerprinting, session replay |
| UX | Silent mutations, popups |
| PRODUCTION_READINESS | Localhost/dev endpoints |

## License

MIT
