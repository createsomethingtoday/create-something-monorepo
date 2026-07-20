#!/usr/bin/env python3
"""Parse a saved slack_read_channel (detailed) dump and push items to the governance MCP."""
import json, os, re, subprocess, sys, urllib.request
from datetime import datetime, timezone

CHANNEL = None  # set from argv
BASE = "https://app-governance.mcp.createsomething.agency/mcp"
MSG_RE = re.compile(r"=== Message (?:from (.+?) )?at [^=]+===\s*\nMessage TS: ([0-9.]+)\n", re.M)

def get_key():
    out = subprocess.check_output(["infisical", "secrets", "get", "APP_GOVERNANCE_MCP_KEY", "--plain"], text=True, stderr=subprocess.DEVNULL)
    lines = [l.strip() for l in out.splitlines() if l.strip() and " " not in l.strip()]
    return lines[-1]

def rpc(key, sid, payload):
    req = urllib.request.Request(BASE, data=json.dumps(payload).encode(), method="POST", headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json",
        "User-Agent": "app-governance-sync/1.0",
        "Accept": "application/json, text/event-stream", **({"Mcp-Session-Id": sid} if sid else {})})
    with urllib.request.urlopen(req) as res:
        body = res.read().decode()
        new_sid = res.headers.get("mcp-session-id")
    for line in body.split("\n"):
        if line.startswith("data:"):
            return json.loads(line[5:]), new_sid
    return (json.loads(body) if body.strip() else None), new_sid

def parse(path):
    raw = open(path).read()
    try:
        doc = json.loads(raw)
        raw = doc.get("messages", "") + "\n" + doc.get("pagination_info", "")
    except json.JSONDecodeError:
        pass
    # find cursor for next page
    cur = re.search(r"use cursor: `([^`]+)`", raw)
    next_cursor = cur.group(1) if cur else None
    items = []
    matches = list(MSG_RE.finditer(raw))
    for i, m in enumerate(matches):
        author_blob, ts = (m.group(1) or "external (Slack Connect)").strip(), m.group(2)
        email_m = re.search(r"<([^>|]+@[^>|]+)>", author_blob)
        author = email_m.group(1) if email_m else author_blob.split(" <")[0].split(" (")[0]
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        body = raw[m.end():end]
        lines = []
        thread_info = None
        for line in body.split("\n"):
            if line.startswith("Thread: "):
                thread_info = line.strip(); continue
            if line.startswith(("Reactions: ", "Files: ")) or line.startswith("There are more messages"):
                continue
            lines.append(line)
        text = "\n".join(lines).strip()[:600]
        if thread_info:
            text = (text + f"\n[{thread_info}]")[:650]
        posted = datetime.fromtimestamp(float(ts), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        items.append({
            "external_id": f"{CHANNEL}:{ts}",
            "author": author,
            "posted_at": posted,
            "permalink": f"https://webflow.enterprise.slack.com/archives/{CHANNEL}/p{ts.replace('.', '')}",
            "text": text,
        })
    return items, next_cursor

def main():
    global CHANNEL
    path = sys.argv[1]
    CHANNEL = sys.argv[2] if len(sys.argv) > 2 else "C05KPSPTPFT"
    set_cursor = "--set-cursor" in sys.argv
    if not os.path.isfile(path) or os.path.getsize(path) == 0:
        print(f"error: dump file missing or empty: {path}", file=sys.stderr)
        sys.exit(1)
    items, next_cursor = parse(path)
    print(f"parsed {len(items)} messages; next_cursor={next_cursor}")
    if not items:
        print(
            f"error: parsed 0 messages from {path} — the slack_read_channel dump format may have changed "
            "(expected '=== Message ... ===' blocks with 'Message TS:' lines). Refusing to exit 0 on silence.",
            file=sys.stderr,
        )
        sys.exit(1)
    key = get_key()
    _, sid = rpc(key, None, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "slack-backfill", "version": "1.0"}}})
    rpc(key, sid, {"jsonrpc": "2.0", "method": "notifications/initialized"})
    total_ins = 0
    max_ts = max(it["external_id"].split(":", 1)[1] for it in items) if items else None
    synced_by = f"claude-code sync {datetime.now(timezone.utc).date().isoformat()}"
    for i in range(0, len(items), 40):
        batch = items[i:i + 40]
        args = {"source_type": "slack_channel", "source_external_id": CHANNEL,
                "items": batch, "synced_by": synced_by}
        # Advance the high-water mark only on the FINAL batch — every earlier
        # batch has already pushed successfully by then (any failure raises),
        # so a mid-run crash never strands unpushed messages behind the cursor.
        is_last_batch = i + 40 >= len(items)
        if set_cursor and is_last_batch and max_ts:
            args["cursor_value"] = max_ts
        resp, _ = rpc(key, sid, {"jsonrpc": "2.0", "id": 10 + i, "method": "tools/call", "params": {
            "name": "governance_record_items", "arguments": args}})
        result = json.loads(resp["result"]["content"][0]["text"])
        assert result.get("ok"), result
        total_ins += result["inserted"]
        print(f"  batch {i//40+1}: inserted {result['inserted']}, skipped {result['skipped']}")
    if set_cursor and max_ts:
        print(f"cursor advanced to {max_ts}")
    print(f"done: inserted {total_ins}/{len(items)}")
    if next_cursor:
        print(f"NEXT_CURSOR:{next_cursor}")

if __name__ == "__main__":
    main()
