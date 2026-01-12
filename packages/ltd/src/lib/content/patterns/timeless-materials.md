---
title: "Timeless Materials"
subtitle: "Choose what ages well. Avoid trends. Mies used steel because it endures.
			Web standards over frameworks. SQL over NoSQL. Build on what lasts."
category: "Pattern"
published: true
publishedAt: "2025-01-08"
---



> "God is in the details."



## Definition
Timeless Materialsare foundations that don't expire. Mies van der Rohe
				chose steel, glass, and travertine not for fashion but for permanence. His buildings
				from the 1950s look contemporary today because the materials transcend their era.

In software, timeless materials are the technologies with staying power: web standards
				(HTML, CSS, JavaScript), relational databases (SQL), foundational protocols (HTTP, TCP/IP).
				These aren't exciting—they're reliable. They won't be deprecated next year.

The anti-pattern is trend-chasing: adopting the latest framework because it's popular,
				choosing NoSQL because it's "modern," using a proprietary protocol because the vendor
				promises better performance. These decisions age poorly.

"The question is not 'what's new?' but 'what will last?'"


> "The question is not 'what's new?' but 'what will last?'"



## Principles
Frameworks come and go. Standards persist. When possible, build on
					web standards directly. Use frameworks as thin layers, not foundations.

✓ HTML/CSS before framework abstractions

✓ Fetch API over axios

✓ Web Components when interoperability matters

Technologies with 20+ years of production use have passed the test.
					New doesn't mean better—often it means untested.

✓ PostgreSQL over the database of the month

✓ HTTP/REST before GraphQL (unless you need it)

✓ Unix philosophy over containerized everything

Even "timeless" choices may need replacement. Ensure you can exit.
					Avoid lock-in. Own your data. Keep abstractions thin.

✓ Data exportable in standard formats

✓ No vendor-specific languages

✓ Thin wrappers over platform APIs

Exciting technology is risky technology. The most reliable systems
					are built on boring, well-understood foundations.

✓ Choose based on requirements, not hype

✓ Innovation in product, not in infrastructure

✓ "Boring" = production-proven = trustworthy



## When to Apply
- • Building for long-term maintenance
- • Team stability is uncertain
- • Requirements are well-understood
- • Reliability trumps novelty
- • You value sleep over excitement

- • Problem genuinely requires new solutions
- • Scale exceeds proven technology limits
- • Competitive advantage from new capability
- • Prototyping where long-term doesn't matter



## Timeless vs. Trendy

| Domain | Timeless | Trendy |
|---|---|---|
| Database | PostgreSQL, SQLite | This year's distributed DB |
| API | REST/HTTP | GraphQL, gRPC (unless needed) |
| Styling | CSS, CSS Variables | CSS-in-JS framework du jour |
| State | URL, forms, localStorage | State management library #47 |
| Hosting | VPS, static files | Serverless everything |



## Related Patterns
Arcs built on timeless materials (HTTP, OAuth, JSON) require less maintenance.

Standards-based materials are universally accessible.



