#!/usr/bin/env python3
"""Stream an official NPPES dissemination ZIP into the nationwide Agency snapshot API."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

FILES_PAGE = "https://download.cms.gov/nppes/NPI_Files.html"
FAMILY_NP = "363LF0000X"
API_PATH = "/api/abundance/healthcare-providers/nationwide"


def request_json(url: str, token: str, payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload, separators=(",", ":")).encode()
    request = urllib.request.Request(url, data=data)
    request.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read(1000).decode("utf-8", "replace")
        raise RuntimeError(f"Agency API returned HTTP {error.code}: {detail}") from error
    if not result.get("success"):
        raise RuntimeError(f"Agency API rejected the request: {result.get('error', 'unknown error')}")
    return result["data"]


def discover_urls(kind: str) -> list[str]:
    with urllib.request.urlopen(FILES_PAGE, timeout=60) as response:
        html = response.read().decode("utf-8", "replace")
    urls = re.findall(r'href=["\']([^"\']+\.zip)["\']', html, re.IGNORECASE)
    absolute = [urllib.parse.urljoin(FILES_PAGE, url) for url in urls]
    if kind == "monthly_full":
        matches = [url for url in absolute if "Data_Dissemination" in url and "Weekly" not in url and "_V2.zip" in url]
        return matches[:1]
    matches = [url for url in absolute if "Weekly_V2.zip" in url]
    return sorted(matches, key=lambda url: re.search(r"_(\d{6})_\d{6}_Weekly", url).group(1))


def weekly_interval_end(url: str) -> datetime | None:
    match = re.search(r"_\d{6}_(\d{6})_Weekly", url, re.IGNORECASE)
    if not match:
        return None
    return datetime.strptime(match.group(1), "%m%d%y").replace(tzinfo=timezone.utc)


def filter_weeklies_after_full_snapshot(urls: list[str], receipts: list[dict]) -> list[str]:
    full_publications = [
        datetime.fromisoformat(receipt["source_published_at"].replace("Z", "+00:00"))
        for receipt in receipts
        if receipt.get("source_kind") == "monthly_full" and receipt.get("source_published_at")
    ]
    if not full_publications:
        return urls
    cutoff = max(full_publications).date()
    filtered = []
    for url in urls:
        interval_end = weekly_interval_end(url)
        if interval_end and interval_end.date() >= cutoff:
            filtered.append(url)
    return filtered


def download(url: str, destination: Path) -> str:
    digest = hashlib.sha256()
    with urllib.request.urlopen(url, timeout=120) as response, destination.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
            digest.update(chunk)
    return digest.hexdigest()


def clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def iso_date(value: str | None) -> str | None:
    """Normalize CMS dissemination dates to the ISO format used by D1 queries."""
    value = clean(value)
    if not value:
        return None
    for date_format in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, date_format).date().isoformat()
        except ValueError:
            continue
    return None


def zip_member_published_at(member: zipfile.ZipInfo) -> str:
    """Use the official archive member timestamp as the dissemination publication time."""
    return datetime(*member.date_time, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def title(value: str | None) -> str | None:
    value = clean(value)
    return value.title() if value else None


def postal(value: str | None, country: str | None) -> str | None:
    value = clean(value)
    if not value:
        return None
    return value[:5] if (country or "US").upper() == "US" else value


def provider_from_row(row: dict[str, str], fetched_at: str) -> tuple[dict | None, str | None]:
    npi = clean(row.get("NPI"))
    if not npi or not re.fullmatch(r"\d{10}", npi):
        return None, None
    if clean(row.get("Entity Type Code")) != "1":
        return None, npi
    taxonomies = []
    primary = None
    for index in range(1, 16):
        code = clean(row.get(f"Healthcare Provider Taxonomy Code_{index}"))
        if not code:
            continue
        item = {
            "code": code,
            "description": "Nurse Practitioner, Family" if code == FAMILY_NP else None,
            "license_state": clean(row.get(f"Provider License Number State Code_{index}")),
            "license_number": clean(row.get(f"Provider License Number_{index}")),
            "primary": (row.get(f"Healthcare Provider Primary Taxonomy Switch_{index}") or "").upper() == "Y",
        }
        taxonomies.append(item)
        if item["primary"]:
            primary = item
    if not primary or primary["code"] != FAMILY_NP:
        return None, npi
    first = title(row.get("Provider First Name"))
    middle = title(row.get("Provider Middle Name"))
    last = title(row.get("Provider Last Name (Legal Name)"))
    organization = title(row.get("Provider Organization Name (Legal Business Name)"))
    name = " ".join(part for part in (first, middle, last) if part) or organization or f"NPI {npi}"
    deactivated = iso_date(row.get("NPI Deactivation Date"))
    reactivated = iso_date(row.get("NPI Reactivation Date"))
    status = "deactivated" if deactivated and (not reactivated or deactivated > reactivated) else "active"
    country = clean(row.get("Provider Business Practice Location Address Country Code (If outside U.S.)")) or "US"
    canonical = json.dumps(row, sort_keys=True, separators=(",", ":"))
    provider = {
        "id": f"abprovider_{npi}", "npi": npi,
        "enumeration_type": "NPI-1",
        "name": name, "first_name": first, "middle_name": middle, "last_name": last,
        "credential": clean(row.get("Provider Credential Text")), "status": status,
        "enumeration_date": iso_date(row.get("Provider Enumeration Date")),
        "last_updated_date": iso_date(row.get("Last Update Date")),
        "certification_date": iso_date(row.get("Certification Date")),
        "primary_taxonomy_code": FAMILY_NP, "primary_taxonomy_description": "Nurse Practitioner, Family",
        "license_state": primary["license_state"], "license_number": primary["license_number"],
        "taxonomies_json": json.dumps(taxonomies, sort_keys=True, separators=(",", ":")),
        "practice_address_1": title(row.get("Provider First Line Business Practice Location Address")),
        "practice_address_2": title(row.get("Provider Second Line Business Practice Location Address")),
        "practice_city": title(row.get("Provider Business Practice Location Address City Name")),
        "practice_state": clean(row.get("Provider Business Practice Location Address State Name")),
        "practice_postal_code": postal(row.get("Provider Business Practice Location Address Postal Code"), country),
        "practice_country": country,
        "practice_phone": clean(row.get("Provider Business Practice Location Address Telephone Number")),
        "endpoint_count": 0, "source_system": "nppes_dissemination_v2",
        "source_payload_hash": hashlib.sha256(canonical.encode()).hexdigest(), "source_fetched_at": fetched_at,
    }
    return {key: value for key, value in provider.items() if value is not None}, None


def flush(api_url: str, token: str, run_id: str, providers: list[dict], removals: list[str], rows: int, rejected: int) -> None:
    request_json(api_url, token, {
        "action": "chunk", "run_id": run_id, "providers": providers, "remove_npis": removals,
        "processed_row_count": rows, "rejected_count": rejected,
    })


def import_zip(api_url: str, token: str, source_url: str, kind: str) -> dict:
    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    run_id = "abnationalrun_" + hashlib.sha256((source_url + fetched_at).encode()).hexdigest()[:24]
    source_file = Path(urllib.parse.urlparse(source_url).path).name
    run_started = False
    try:
        with tempfile.TemporaryDirectory(prefix="nppes-family-np-") as directory:
            archive = Path(directory) / source_file
            source_sha256 = download(source_url, archive)
            processed = pending_rows = rejected = pending_rejected = 0
            providers: list[dict] = []
            removals: list[str] = []
            with zipfile.ZipFile(archive) as bundle:
                names = [
                    name for name in bundle.namelist()
                    if name.lower().endswith(".csv")
                    and "npidata" in name.lower()
                    and "fileheader" not in name.lower()
                ]
                if len(names) != 1:
                    raise RuntimeError(f"Expected one npidata CSV, found {len(names)}")
                source_published_at = zip_member_published_at(bundle.getinfo(names[0]))
                request_json(api_url, token, {
                    "action": "begin", "run_id": run_id, "source_kind": kind, "source_file": source_file,
                    "source_url": source_url, "source_published_at": source_published_at,
                    "started_at": fetched_at,
                })
                run_started = True
                with bundle.open(names[0]) as binary:
                    import io
                    reader = csv.DictReader(io.TextIOWrapper(binary, encoding="utf-8-sig", newline=""))
                    for row in reader:
                        processed += 1
                        pending_rows += 1
                        try:
                            provider, removal = provider_from_row(row, fetched_at)
                            if provider:
                                providers.append(provider)
                            elif removal and kind == "weekly_incremental":
                                removals.append(removal)
                        except Exception:
                            rejected += 1
                            pending_rejected += 1
                        if len(providers) >= 50 or len(removals) >= 100 or pending_rows >= 100_000:
                            flush(api_url, token, run_id, providers, removals, pending_rows, pending_rejected)
                            providers, removals, pending_rows, pending_rejected = [], [], 0, 0
            if pending_rows or providers or removals:
                flush(api_url, token, run_id, providers, removals, pending_rows, pending_rejected)
            return request_json(api_url, token, {
                "action": "finalize", "run_id": run_id, "finished_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "source_sha256": source_sha256, "expected_processed_row_count": processed,
            })["run"]
    except Exception as error:
        if run_started:
            try:
                request_json(api_url, token, {"action": "fail", "run_id": run_id, "error": str(error)[:500]})
            finally:
                raise
        raise


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=("monthly_full", "weekly_incremental"), required=True)
    parser.add_argument("--source-url")
    parser.add_argument("--agency-base-url", default="https://createsomething.agency")
    args = parser.parse_args()
    token = os.environ.get("AGENCY_INTERNAL_API_KEY", "").strip()
    if not token:
        raise RuntimeError("AGENCY_INTERNAL_API_KEY is required")
    api_url = args.agency_base_url.rstrip("/") + API_PATH
    request_json(api_url, token, {"action": "maintenance"})
    receipts = request_json(api_url + "?runs=true", token)["runs"]
    applied = {run["source_file"] for run in receipts}
    urls = [args.source_url] if args.source_url else discover_urls(args.kind)
    if args.kind == "weekly_incremental":
        urls = filter_weeklies_after_full_snapshot(urls, receipts)
    pending = [url for url in urls if Path(urllib.parse.urlparse(url).path).name not in applied]
    if args.kind == "monthly_full" and pending:
        pending = pending[:1]
    if not pending:
        print(json.dumps({"status": "current", "source_kind": args.kind}))
        return 0
    receipts = [import_zip(api_url, token, url, args.kind) for url in pending]
    print(json.dumps({"status": "succeeded", "runs": receipts}, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)[:500]}), file=sys.stderr)
        sys.exit(1)
