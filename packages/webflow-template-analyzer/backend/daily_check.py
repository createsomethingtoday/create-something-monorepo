#!/usr/bin/env python3
"""
Daily check: find and fix Airtable template records with broken long descriptions.

Broken descriptions contain <h2>Submission notes</h2> — double-encoded HTML from
a broken submission form. This script queries Airtable live, extracts the published
URL from each record's broken metadata, regenerates a clean description via the
Playwright + Claude analyzer, and updates Airtable.

Usage
-----
  python3 daily_check.py             # Run the daily fix pass
  python3 daily_check.py --dry-run   # Print what would be updated without changing anything
  python3 daily_check.py --limit 3   # Process at most 3 records (for testing)
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ─── Airtable config ──────────────────────────────────────────────────────────

AIRTABLE_BASE_ID = "appMoIgXMTTTNIc3p"
AIRTABLE_TABLE_ID = "tblRwzpWoLgE9MrUm"

FIELD_ID_NAME = "fldUzJBor3Gnkykjc"
FIELD_ID_STATUS = "fld51CeQNGDgW9b0D"
FIELD_ID_LONG_DESC = "fldiDg3clkRAaPWU9"
FIELD_ID_MRP = "fldFeWROxzwzCo84b"

BROKEN_MARKER = "<h2>Submission notes</h2>"
REJECTED_STATUS = "5️⃣Rejected❌"

# Priority order for processing
STATUS_ORDER = {
    "1️⃣Published✅": 0,
    "2️⃣Upcoming🔜": 1,
    "3️⃣Delisted❌": 2,
}


# ─── Airtable helpers ─────────────────────────────────────────────────────────

def get_airtable_headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def fetch_broken_records(api_key: str) -> list[dict]:
    """Query Airtable for all records whose long description contains the broken marker."""
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
    headers = get_airtable_headers(api_key)

    # filterByFormula: search for BROKEN_MARKER in the long description field
    filter_formula = f'SEARCH("{BROKEN_MARKER}", {{{FIELD_ID_LONG_DESC}}}) > 0'

    params = {
        "filterByFormula": filter_formula,
        "fields[]": [FIELD_ID_NAME, FIELD_ID_STATUS, FIELD_ID_LONG_DESC, FIELD_ID_MRP],
    }

    records = []
    offset = None

    while True:
        if offset:
            params["offset"] = offset

        resp = requests.get(url, headers=headers, params=params, timeout=30)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 30))
            print(f"  Rate limited. Waiting {wait}s...")
            time.sleep(wait)
            continue
        resp.raise_for_status()

        data = resp.json()
        records.extend(data.get("records", []))

        offset = data.get("offset")
        if not offset:
            break

    return records


def update_airtable_record(record_id: str, long_description_html: str, api_key: str) -> bool:
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}/{record_id}"
    headers = get_airtable_headers(api_key)
    body = {"fields": {FIELD_ID_LONG_DESC: long_description_html}}

    for attempt in range(3):
        resp = requests.patch(url, headers=headers, json=body, timeout=30)
        if resp.status_code == 200:
            return True
        elif resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 30))
            print(f"    Rate limited (attempt {attempt+1}). Waiting {wait}s...")
            time.sleep(wait)
        else:
            print(f"    Airtable error {resp.status_code}: {resp.text[:200]}")
            return False

    return False


# ─── URL extraction ───────────────────────────────────────────────────────────

def extract_url_from_description(desc: str) -> str | None:
    """Pull the live template URL from the broken description's metadata section."""
    m = re.search(r"Published URL verified:\s*(https?://[^\s<&]+)", desc)
    if m:
        url = m.group(1).strip().rstrip("/")
        return url + "/"
    return None


# ─── HTML helpers ─────────────────────────────────────────────────────────────

def text_to_html(text: str) -> str:
    """Wrap each blank-line-separated paragraph in <p> tags."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    return "".join(f"<p>{p}</p>" for p in paragraphs)


# ─── Analysis ─────────────────────────────────────────────────────────────────

def generate_long_description(url: str) -> str:
    """Run the Playwright + Claude analyzer and return a clean long description."""
    # Import here so the script can still be imported without Playwright installed
    sys.path.insert(0, str(Path(__file__).parent))
    from analyze import analyze_template

    result, _ = analyze_template(url)
    raw_desc = result.get("long_description", "")
    if not raw_desc:
        raise ValueError("Analyzer returned empty long_description")
    return raw_desc


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Fix broken Airtable template descriptions")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without updating Airtable")
    parser.add_argument("--limit", type=int, default=0, help="Max records to process (0 = all)")
    args = parser.parse_args()

    airtable_key = os.environ.get("AIRTABLE_API_KEY")
    if not airtable_key:
        sys.exit("ERROR: AIRTABLE_API_KEY not set")

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if not anthropic_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY not set")

    print("Querying Airtable for broken descriptions...")
    records = fetch_broken_records(airtable_key)
    print(f"Found {len(records)} record(s) with broken descriptions")

    # Filter out rejected records
    eligible = [
        r for r in records
        if r["fields"].get(FIELD_ID_STATUS) != REJECTED_STATUS
    ]
    print(f"Eligible (non-rejected): {len(eligible)}")

    if not eligible:
        print("Nothing to fix. Exiting.")
        return

    # Sort by status priority
    eligible.sort(key=lambda r: STATUS_ORDER.get(r["fields"].get(FIELD_ID_STATUS, ""), 99))

    if args.limit:
        eligible = eligible[: args.limit]
        print(f"Processing first {len(eligible)} record(s) (--limit {args.limit})")

    results = []
    success_count = 0
    skip_count = 0
    error_count = 0

    for idx, record in enumerate(eligible, 1):
        record_id = record["id"]
        fields = record["fields"]
        name = fields.get(FIELD_ID_NAME, "Unknown")
        status = fields.get(FIELD_ID_STATUS, "Unknown")
        mrp_id = fields.get(FIELD_ID_MRP, "")
        desc = fields.get(FIELD_ID_LONG_DESC, "")

        print(f"\n[{idx}/{len(eligible)}] {name} ({status})")

        url = extract_url_from_description(desc)
        if not url:
            print(f"  SKIP — could not extract URL from description")
            skip_count += 1
            results.append({"id": record_id, "name": name, "status": "skipped", "reason": "no_url"})
            continue

        print(f"  URL: {url}")

        try:
            long_desc_text = generate_long_description(url)
            long_desc_html = text_to_html(long_desc_text)
            char_count = len(long_desc_text)
            print(f"  Generated description ({char_count} chars)")

            if args.dry_run:
                print(f"  [DRY RUN] Would update Airtable record {record_id}")
                print(f"  Preview: {long_desc_text[:120]}...")
                results.append({"id": record_id, "name": name, "url": url, "status": "dry_run"})
                success_count += 1
            else:
                updated = update_airtable_record(record_id, long_desc_html, airtable_key)
                if updated:
                    print(f"  ✓ Airtable updated")
                    success_count += 1
                    results.append({"id": record_id, "name": name, "url": url, "status": "updated"})
                else:
                    print(f"  ✗ Airtable update failed")
                    error_count += 1
                    results.append({"id": record_id, "name": name, "url": url, "status": "airtable_error"})

        except Exception as exc:
            print(f"  ✗ Analysis failed: {exc}")
            error_count += 1
            results.append({"id": record_id, "name": name, "url": url, "status": "error", "error": str(exc)})

        # Brief pause between records to respect rate limits
        if idx < len(eligible):
            time.sleep(2)

    # Summary
    print(f"\n{'─' * 50}")
    print(f"Done. Processed {len(eligible)} record(s):")
    print(f"  ✓ Updated:  {success_count}")
    print(f"  ⊘ Skipped:  {skip_count}")
    print(f"  ✗ Errors:   {error_count}")
    print(f"{'─' * 50}\n")

    # Write run log
    log_path = Path(__file__).parent / "daily_check_log.json"
    log_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dry_run": args.dry_run,
        "total_broken": len(records),
        "eligible": len(eligible),
        "updated": success_count,
        "skipped": skip_count,
        "errors": error_count,
        "results": results,
    }
    log_path.write_text(json.dumps(log_data, indent=2))
    print(f"Run log saved to {log_path}")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
