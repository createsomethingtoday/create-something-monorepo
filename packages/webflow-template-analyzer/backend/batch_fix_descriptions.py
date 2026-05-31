#!/usr/bin/env python3
"""
Batch Description Fixer
=======================
Reads Airtable records with broken long descriptions (<h2>Submission notes</h2>),
generates clean ones using the existing analyzer (Anthropic + Playwright),
and updates Airtable directly via REST API.

Usage:
    ANTHROPIC_API_KEY=sk-ant-... AIRTABLE_API_KEY=pat... python3 batch_fix_descriptions.py
    ANTHROPIC_API_KEY=... AIRTABLE_API_KEY=... python3 batch_fix_descriptions.py --start 5 --limit 10
    ANTHROPIC_API_KEY=... AIRTABLE_API_KEY=... python3 batch_fix_descriptions.py --published-only

Output:
    batch_results.json — results log for each record processed
"""

import sys
import os
import json
import re
import time
import argparse
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import requests

# Add the backend dir to path so we can import analyze.py
sys.path.insert(0, str(Path(__file__).parent))
from analyze import analyze_template

# ─── Config ───────────────────────────────────────────────────────────────────

RECORDS_FILE = Path("/Users/micahjohnson/.claude/projects/-Users-micahjohnson-emdash-worktrees-create-something-monorepo-emdash-template-help-3mzcq/b17ad000-0fb4-4d9d-ac70-ce974106d1eb/tool-results/mcp-claude_ai_Airtable-list_records_for_table-1779833554319.txt")
OUTPUT_FILE = Path(__file__).parent / "batch_results.json"

# Airtable config
AIRTABLE_BASE_ID = "appMoIgXMTTTNIc3p"
AIRTABLE_TABLE_ID = "tblRwzpWoLgE9MrUm"

FIELD_ID_NAME = "fldUzJBor3Gnkykjc"
FIELD_ID_STATUS = "fld51CeQNGDgW9b0D"
FIELD_ID_LONG_DESC = "fldiDg3clkRAaPWU9"
FIELD_ID_MRP = "fldFeWROxzwzCo84b"

SKIP_STATUSES = {"5️⃣Rejected❌"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def extract_url_from_description(desc: str) -> str | None:
    """Extract the published URL from the <h3>Metadata</h3> section."""
    m = re.search(r"Published URL verified:\s*(https?://[^\s<&]+)", desc)
    if m:
        url = m.group(1).strip().rstrip("/")
        return url + "/"
    return None


def text_to_html(text: str) -> str:
    """Convert plain text paragraphs (blank-line separated) to <p> tags."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    return "".join(f"<p>{p}</p>" for p in paragraphs)


def update_airtable_record(record_id: str, long_description_html: str, api_key: str) -> bool:
    """Update the long description field in Airtable via REST API."""
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}/{record_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "fields": {
            FIELD_ID_LONG_DESC: long_description_html,
        }
    }

    for attempt in range(3):
        resp = requests.patch(url, headers=headers, json=body, timeout=30)
        if resp.status_code == 200:
            return True
        elif resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 30))
            print(f"    Rate limited, waiting {wait}s...", end="", flush=True)
            time.sleep(wait)
        else:
            print(f"    Airtable error {resp.status_code}: {resp.text[:200]}")
            return False

    return False


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Batch fix Airtable long descriptions")
    parser.add_argument("--start", type=int, default=0, help="Skip first N records")
    parser.add_argument("--limit", type=int, default=0, help="Process only N records (0 = all)")
    parser.add_argument("--published-only", action="store_true", help="Only fix Published records")
    parser.add_argument("--dry-run", action="store_true", help="Generate descriptions but don't update Airtable")
    args = parser.parse_args()

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    airtable_key = os.environ.get("AIRTABLE_API_KEY")

    if not anthropic_key:
        print("✗ ANTHROPIC_API_KEY not set.")
        sys.exit(1)
    if not airtable_key and not args.dry_run:
        print("✗ AIRTABLE_API_KEY not set. Use --dry-run to skip updates.")
        sys.exit(1)

    # Load records
    print(f"Loading records from saved file...")
    with open(RECORDS_FILE) as f:
        data = json.load(f)

    records = data["records"]
    print(f"Total records in file: {len(records)}")

    # Build processing list
    to_process = []
    for rec in records:
        fields = rec.get("cellValuesByFieldId", {})
        status_obj = fields.get(FIELD_ID_STATUS) or {}
        status = status_obj.get("name", "") if isinstance(status_obj, dict) else ""

        if status in SKIP_STATUSES:
            continue
        if args.published_only and "Published" not in status:
            continue

        desc = fields.get(FIELD_ID_LONG_DESC, "") or ""
        url = extract_url_from_description(desc)
        if not url:
            print(f"  WARNING: No URL found for {rec['id']} — skipping")
            continue

        name = fields.get(FIELD_ID_NAME, "") or rec["id"]
        mrp_id = fields.get(FIELD_ID_MRP, "") or ""

        to_process.append({
            "id": rec["id"],
            "name": name,
            "url": url,
            "status": status,
            "mrp_id": mrp_id,
        })

    # Sort: Published first, then Upcoming, then Delisted
    def sort_key(r):
        s = r["status"]
        if "Published" in s:
            return 0
        if "Upcoming" in s:
            return 1
        return 2

    to_process.sort(key=sort_key)

    # Slice
    if args.start:
        to_process = to_process[args.start:]
    if args.limit:
        to_process = to_process[:args.limit]

    print(f"Records to process: {len(to_process)}")
    if args.dry_run:
        print("  (DRY RUN — Airtable will NOT be updated)")

    # Load existing results for resume
    results = []
    processed_ids = set()
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            try:
                results = json.load(f)
                processed_ids = {r["id"] for r in results if r.get("success")}
                print(f"Resuming: {len(processed_ids)} already completed")
            except Exception:
                results = []

    # Process each record
    errors = []
    for i, rec in enumerate(to_process):
        if rec["id"] in processed_ids:
            print(f"[{i+1}/{len(to_process)}] Skip {rec['name']} (already done)")
            continue

        print(f"\n[{i+1}/{len(to_process)}] {rec['name']} ({rec['status']})")
        print(f"  URL: {rec['url']}")

        try:
            result_data, _ = analyze_template(rec["url"])
            plain_desc = result_data.get("long_description", "")

            if not plain_desc:
                raise ValueError("Analyzer returned empty long_description")

            html_desc = text_to_html(plain_desc)
            print(f"  Generated: {len(html_desc)} chars")

            # Update Airtable
            updated = False
            if not args.dry_run:
                print(f"  Updating Airtable...", end="", flush=True)
                updated = update_airtable_record(rec["id"], html_desc, airtable_key)
                print(" ✓" if updated else " ✗")
            else:
                updated = True  # In dry-run, mark as "success" for resume tracking

            log_entry = {
                "id": rec["id"],
                "name": rec["name"],
                "url": rec["url"],
                "status": rec["status"],
                "mrp_id": rec["mrp_id"],
                "long_description": html_desc,
                "airtable_updated": updated and not args.dry_run,
                "success": updated,
            }
            results.append(log_entry)

            if updated:
                processed_ids.add(rec["id"])

        except Exception as e:
            print(f"  ✗ Error: {e}")
            errors.append({"id": rec["id"], "name": rec["name"], "error": str(e)})
            results.append({
                "id": rec["id"],
                "name": rec["name"],
                "url": rec["url"],
                "status": rec["status"],
                "success": False,
                "error": str(e),
            })

        # Save after each record (resume-safe)
        with open(OUTPUT_FILE, "w") as f:
            json.dump(results, f, indent=2)

        # Small delay between requests to be polite
        time.sleep(2)

    # Summary
    print(f"\n{'='*60}")
    success_count = sum(1 for r in results if r.get("success"))
    print(f"Processed: {success_count} records successfully")
    print(f"Errors:    {len(errors)}")
    if errors:
        for e in errors:
            print(f"  - {e['name']} ({e['id']}): {e['error']}")
    print(f"Results saved to: {OUTPUT_FILE}")

    return len(errors) == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
