# Webflow Plagiarism Detection - Quick Reference

**For:** Webflow Marketplace Team  
**Version:** 2.3.0  
**Status:** Production

---

## What It Does

Detects template plagiarism at scale using classic CS algorithms + AI, exposed as **MCP tools for team AI agents**.

## Key Numbers

| Metric | Value |
|--------|-------|
| Templates Indexed | 9,593 |
| JS Functions | 517,850 |
| Monthly Cost | $2.20 |
| Manual Review Cost | $625 |
| **Savings** | **99.6%** |

---

## How It Works

```
Template → MinHash → LSH Lookup → Candidates → Bayesian Scoring → Verdict
                ↓
           AI Tiers (if reported)
```

### Detection Layers

| Layer | Cost | What It Catches |
|-------|------|-----------------|
| **MinHash** | $0 | Code similarity (even with renamed classes) |
| **Vector Embeddings** | $0.0001 | Semantic/structural similarity |
| **Framework Detection** | $0 | Shared libraries (GSAP, Finsweet, etc.) |
| **PageRank** | $0 | Original vs derivative templates |
| **AI Tiers** | $0-$0.15 | Edge cases requiring judgment |

---

## Agent Tools (MCP)

Any team member's AI agent can use these tools:

| Tool | What It Does |
|------|--------------|
| `plagiarism_scan` | Check URL for similar templates |
| `plagiarism_pagerank` | Find original vs copy |
| `plagiarism_detect_frameworks` | What libraries does it use? |
| `plagiarism_confidence` | Plagiarism probability score |
| `plagiarism_exclude` | Mark as false positive |

### Quick Setup

Add to your MCP config:
```json
{
  "mcpServers": {
    "webflow": {
      "command": "node",
      "args": ["packages/webflow-mcp/dist/index.js"]
    }
  }
}
```

---

## Algorithms Used

| Algorithm | Year | Purpose |
|-----------|------|---------|
| SuperMinHash | 2017 | Fingerprinting |
| LSH Banding | 1998 | O(1) lookup |
| PageRank | 1996 | Authority ranking |
| Bloom Filter | 1970 | Deduplication |
| Bayesian | - | Confidence scoring |

---

## Frameworks Detected (20+)

**Animation:** GSAP, Lenis, Locomotive, Barba, AOS  
**Carousel:** Swiper, Splide  
**Design Systems:** Client-First, Relume, Lumos  
**Webflow:** Finsweet, Wized, Memberstack  
**3D:** Three.js, Spline

---

## API Quick Reference

```bash
# Health check
curl https://plagiarism-agent.createsomething.workers.dev/health

# Scan a template
curl -X POST .../scan/template -d '{"url": "https://template.webflow.io"}'

# Compare two templates
curl -X POST .../api/compare -d '{"originalUrl": "...", "allegedCopyUrl": "..."}'

# Detect frameworks
curl -X POST .../compute/frameworks -d '{"url": "..."}'
```

---

## Dashboard

Visual interface at:
```
https://plagiarism-agent.createsomething.workers.dev/dashboard
```

---

## Safety

- **90% confidence threshold** for auto-actions
- Low confidence cases flagged for human review
- False positive exclusion workflow

---

## Contact

- **System Owner:** Micah Johnson (CREATE SOMETHING)
- **Webflow Contact:** Joey Best-James

---

*Full documentation: [PAPER.md](./PAPER.md)*
