-- Update the Cloudflare KV Quick Start experiment with ASCII art
UPDATE papers
SET ascii_art = '
    ╔══════════════════════════════════════╗
    ║         CLOUDFLARE WORKERS           ║
    ║              KV STORAGE              ║
    ╠══════════════════════════════════════╣
    ║                                      ║
    ║    ┌─────────┐     ┌─────────┐     ║
    ║    │  KEY 1  │ ──▶ │ VALUE 1 │     ║
    ║    └─────────┘     └─────────┘     ║
    ║                                      ║
    ║    ┌─────────┐     ┌─────────┐     ║
    ║    │  KEY 2  │ ──▶ │ VALUE 2 │     ║
    ║    └─────────┘     └─────────┘     ║
    ║                                      ║
    ║    ┌─────────┐     ┌─────────┐     ║
    ║    │  KEY 3  │ ──▶ │ VALUE 3 │     ║
    ║    └─────────┘     └─────────┘     ║
    ║                                      ║
    ║         GLOBAL • LOW LATENCY        ║
    ╚══════════════════════════════════════╝
'
WHERE slug = 'cloudflare-kv-quick-start';
