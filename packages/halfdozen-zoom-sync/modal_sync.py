"""
Zoom Clips Daily Sync - Modal.com Deployment

Scheduled Python function that extracts Zoom clips and syncs to Notion.
Uses Playwright + Steel.dev for browser automation, Resend for email alerts.

Deploy:
    modal deploy modal_sync.py

Test locally:
    modal run modal_sync.py

Environment secrets (add via Modal dashboard):
    STEEL_API_KEY
    NOTION_API_KEY
    RESEND_API_KEY
"""

import os
import json
import re
from datetime import datetime, timedelta

import modal

# =============================================================================
# Modal App Configuration
# =============================================================================

app = modal.App("halfdozen-zoom-sync")

# Container image with dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "playwright==1.49.0",
    "steel-sdk>=0.15.0",
    "resend>=2.0.0",
).run_commands(
    "playwright install chromium",
    "playwright install-deps chromium",
)

# Secrets from Modal dashboard
secrets = modal.Secret.from_name("zoom-clips-secrets")

# Persistent volume for session context
volume = modal.Volume.from_name("zoom-clips-data", create_if_missing=True)

# =============================================================================
# Configuration
# =============================================================================

CONFIG = {
    "clips_library_url": "https://zoom.us/clips/mine",
    "notion_database_id": "27a019187ac580b797fec563c98afbbc",
    "alert_email": "micah@createsomething.io",
    "max_clips": 20,
}

NOTION_PROPERTY_MAPPING = {
    "title": "Item",
    "url": "Source URL",
    "speaker": "Attendees",
    "date": "Date",
    "status": "Status",
    "source": "Source",
    "type": "Type",
}

NOTION_SELECT_DEFAULTS = {
    "status": "Active",
    "source": "Zoom",
    "type": "Clip",
}

# =============================================================================
# Email Alerts via Resend
# =============================================================================

def send_email(subject: str, html: str):
    """Send email alert via Resend."""
    import resend
    
    resend.api_key = os.environ["RESEND_API_KEY"]
    
    try:
        resend.Emails.send({
            "from": "Half Dozen Sync <notifications@createsomething.io>",
            "to": [CONFIG["alert_email"]],
            "subject": subject,
            "html": html,
        })
        print(f"Email sent: {subject}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")


def send_success_email(stats: dict):
    failed_line = ""
    if stats.get("failed", 0) > 0:
        failed_line = f"<li><strong>Failed:</strong> {stats['failed']}</li>"
    
    send_email(
        "Zoom Clips Sync Complete",
        f"""
        <h2>Daily Sync Completed</h2>
        <ul>
            <li><strong>Processed:</strong> {stats['processed']} clips</li>
            <li><strong>Synced:</strong> {stats['synced']} new</li>
            <li><strong>Skipped:</strong> {stats['skipped']} duplicates</li>
            {failed_line}
        </ul>
        <p><small>Sync completed at {datetime.utcnow().isoformat()}Z</small></p>
        """
    )


def send_session_expired_email():
    """Alert when session cookies are no longer valid."""
    send_email(
        "ACTION REQUIRED: Zoom Session Expired",
        f"""
        <h2>Session Cookies Expired</h2>
        <p>The Zoom Clips sync detected that your session is no longer valid. 
        The browser was redirected to a login page.</p>
        
        <h3>To restore access:</h3>
        <ol>
            <li>Run <code>npx tsx watch-session.ts</code> locally</li>
            <li>Log into Zoom in the Steel Live View browser</li>
            <li>The script will capture the new session context</li>
            <li>Upload: <code>modal volume put zoom-clips-data session-context.json /session-context.json</code></li>
        </ol>
        
        <p><strong>Note:</strong> Daily syncs will fail until this is resolved.</p>
        <p><small>Detected at {datetime.utcnow().isoformat()}Z</small></p>
        """
    )


def send_failure_email(error: str):
    # Check if this is a session expiry
    if "SESSION EXPIRED" in error.upper() or "COOKIE" in error.upper():
        send_session_expired_email()
        return
    
    send_email(
        "Zoom Clips Sync Failed",
        f"""
        <h2>Daily Sync Failed</h2>
        <p><strong>Error:</strong> {error}</p>
        <p>Check the Modal dashboard for full logs.</p>
        <p><small>Failed at {datetime.utcnow().isoformat()}Z</small></p>
        """
    )

# =============================================================================
# Date Parsing
# =============================================================================

def parse_relative_date(date_str: str) -> str | None:
    """Parse relative date strings like '5 hours ago' to ISO format."""
    if not date_str:
        return None
    
    # Already ISO format
    if re.match(r'^\d{4}-\d{2}-\d{2}', date_str):
        return date_str.split('T')[0]
    
    # Relative format: "5 hours ago", "3 days ago"
    match = re.match(r'(\d+)\s+(hour|minute|day|week|month)s?\s+ago', date_str, re.I)
    if match:
        amount = int(match.group(1))
        unit = match.group(2).lower()
        now = datetime.utcnow()
        
        if unit == 'minute':
            delta = timedelta(minutes=amount)
        elif unit == 'hour':
            delta = timedelta(hours=amount)
        elif unit == 'day':
            delta = timedelta(days=amount)
        elif unit == 'week':
            delta = timedelta(weeks=amount)
        elif unit == 'month':
            delta = timedelta(days=amount * 30)
        else:
            return None
        
        return (now - delta).strftime('%Y-%m-%d')
    
    # Format like "Jan 27, 2026"
    try:
        parsed = datetime.strptime(date_str, '%b %d, %Y')
        return parsed.strftime('%Y-%m-%d')
    except ValueError:
        pass
    
    return None

# =============================================================================
# Notion Sync
# =============================================================================

def notion_api_request(method: str, endpoint: str, body: dict = None) -> dict:
    """Make a direct request to Notion API."""
    import urllib.request
    import urllib.error
    
    url = f"https://api.notion.com/v1/{endpoint}"
    headers = {
        "Authorization": f"Bearer {os.environ['NOTION_API_KEY']}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }
    
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"⚠️ Notion API error: {e.code} - {error_body}")
        raise

def sync_to_notion(clips: list[dict]) -> dict:
    """Sync extracted clips to Notion with deduplication."""
    database_id = CONFIG["notion_database_id"]
    
    # Batch check for existing URLs
    urls = [c["url"] for c in clips]
    existing_urls = set()
    
    # Query in batches (Notion filter limit)
    for i in range(0, len(urls), 10):
        batch = urls[i:i+10]
        filter_conditions = [
            {"property": NOTION_PROPERTY_MAPPING["url"], "url": {"equals": url}}
            for url in batch
        ]
        
        try:
            response = notion_api_request(
                "POST",
                f"databases/{database_id}/query",
                {"filter": {"or": filter_conditions}}
            )
            
            for result in response.get("results", []):
                url_prop = result.get("properties", {}).get(NOTION_PROPERTY_MAPPING["url"], {})
                if url_prop.get("url"):
                    existing_urls.add(url_prop["url"])
        except Exception as e:
            print(f"⚠️ Dedup query failed: {e}")
    
    print(f"📋 Found {len(existing_urls)} existing clips")
    
    # Sync new clips
    stats = {"synced": 0, "skipped": 0, "failed": 0}
    
    for clip in clips:
        if clip["url"] in existing_urls:
            stats["skipped"] += 1
            continue
        
        try:
            # Build properties
            properties = {
                NOTION_PROPERTY_MAPPING["title"]: {
                    "title": [{"text": {"content": clip["title"][:2000]}}]
                },
                NOTION_PROPERTY_MAPPING["url"]: {
                    "url": clip["url"]
                },
            }
            
            # Speaker
            if clip.get("speaker") and NOTION_PROPERTY_MAPPING.get("speaker"):
                properties[NOTION_PROPERTY_MAPPING["speaker"]] = {
                    "rich_text": [{"text": {"content": clip["speaker"][:2000]}}]
                }
            
            # Date
            if clip.get("created_at") and NOTION_PROPERTY_MAPPING.get("date"):
                date_val = parse_relative_date(clip["created_at"])
                if date_val:
                    properties[NOTION_PROPERTY_MAPPING["date"]] = {
                        "date": {"start": date_val}
                    }
            
            # Select defaults
            for key in ["status", "source", "type"]:
                if NOTION_PROPERTY_MAPPING.get(key) and NOTION_SELECT_DEFAULTS.get(key):
                    properties[NOTION_PROPERTY_MAPPING[key]] = {
                        "select": {"name": NOTION_SELECT_DEFAULTS[key]}
                    }
            
            # Create page via direct API
            page = notion_api_request(
                "POST",
                "pages",
                {
                    "parent": {"database_id": database_id},
                    "properties": properties,
                }
            )
            
            # Add transcript as toggle block
            if clip.get("transcript"):
                transcript = clip["transcript"]
                chunks = []
                
                # Split into ~1900 char chunks at sentence boundaries
                while transcript:
                    if len(transcript) <= 1900:
                        chunks.append(transcript)
                        break
                    
                    # Find sentence boundary
                    split_point = transcript[:1900].rfind('. ')
                    if split_point == -1:
                        split_point = transcript[:1900].rfind(' ')
                    if split_point == -1:
                        split_point = 1900
                    
                    chunks.append(transcript[:split_point + 1])
                    transcript = transcript[split_point + 1:].strip()
                
                # Create toggle with transcript chunks
                children = [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": chunk}}]
                        }
                    }
                    for chunk in chunks
                ]
                
                # Append blocks via direct API
                notion_api_request(
                    "PATCH",
                    f"blocks/{page['id']}/children",
                    {
                        "children": [
                            {
                                "object": "block",
                                "type": "toggle",
                                "toggle": {
                                    "rich_text": [{"type": "text", "text": {"content": "📝 Transcript"}}],
                                    "children": children[:100]  # Notion limit
                                }
                            }
                        ]
                    }
                )
            
            stats["synced"] += 1
            
        except Exception as e:
            print(f"❌ Failed to sync {clip['title']}: {e}")
            stats["failed"] += 1
    
    return stats

# =============================================================================
# Main Extraction Function
# =============================================================================

@app.function(
    image=image,
    secrets=[secrets],
    volumes={"/data": volume},
    timeout=900,  # 15 minutes
)
def sync_clips():
    """Extract Zoom clips and sync to Notion."""
    from playwright.sync_api import sync_playwright
    from steel import Steel
    
    print("\n" + "=" * 60)
    print(f"[{datetime.utcnow().isoformat()}] Starting Zoom Clips Sync")
    print("=" * 60)
    
    # Load session context from volume
    session_context_path = "/data/session-context.json"
    
    if not os.path.exists(session_context_path):
        error = "Session context not found. Upload via: modal volume put zoom-clips-data session-context.json /session-context.json"
        print(f"❌ {error}")
        send_failure_email(error)
        return {"error": error}
    
    with open(session_context_path) as f:
        session_context = json.load(f)
    
    cookie_count = len(session_context.get('cookies', []))
    print(f"✅ Loaded session context with {cookie_count} cookies")
    
    # Create Steel session
    steel = Steel(steel_api_key=os.environ["STEEL_API_KEY"])
    
    session = steel.sessions.create(
        timeout=15 * 60 * 1000,  # 15 minutes
        session_context=session_context,
    )
    
    print(f"✅ Steel session: {session.id}")
    print(f"🖥️  Live View: {getattr(session, 'session_viewer_url', 'N/A')}")
    
    stats = {"processed": 0, "synced": 0, "skipped": 0, "failed": 0}
    extracted_clips = []
    
    try:
        with sync_playwright() as playwright:
            # Connect to Steel session
            browser = playwright.chromium.connect_over_cdp(
                f"wss://connect.steel.dev?apiKey={os.environ['STEEL_API_KEY']}&sessionId={session.id}"
            )
            
            # Use existing context (for session recording)
            context = browser.contexts[0]
            page = context.new_page()
            
            # Navigate to clips library
            print("\n📂 Navigating to Clips Library...")
            page.goto(CONFIG["clips_library_url"], wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            
            # Check for auth failure
            if "/signin" in page.url or "/login" in page.url:
                raise Exception("SESSION EXPIRED: Cookies are no longer valid.")
            
            # Discover clip URLs
            clip_urls = page.evaluate("""(maxClips) => {
                const links = [];
                document.querySelectorAll('a[href*="/clips/share/"]').forEach(link => {
                    if (links.length < maxClips) {
                        const href = link.getAttribute('href');
                        if (href && !links.includes(href)) {
                            links.push(href.startsWith('http') ? href : 'https://zoom.us' + href);
                        }
                    }
                });
                return links;
            }""", CONFIG["max_clips"])
            
            print(f"🔍 Found {len(clip_urls)} clips")
            
            # Extract each clip
            for i, url in enumerate(clip_urls):
                print(f"\n📍 [{i+1}/{len(clip_urls)}] {url}")
                
                try:
                    page.goto(url, wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(2000)
                    
                    # Extract metadata
                    metadata = page.evaluate("""() => {
                        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
                        const title = ogTitle || document.title.replace(' | Zoom Clips', '').replace('Clips', '').trim() || 'Untitled';
                        
                        const speakerEl = document.querySelector('[class*="user-name"], [class*="owner"], [class*="speaker"]');
                        const speaker = speakerEl?.textContent?.trim() || '';
                        
                        const dateEl = document.querySelector('.start-time-str, [class*="start-time"], [class*="created"]');
                        const createdAt = dateEl?.textContent?.trim() || '';
                        
                        const summaryEl = document.querySelector('.summary-text');
                        const summary = summaryEl?.textContent?.trim() || '';
                        
                        return { title, speaker, createdAt, summary };
                    }""")
                    
                    print(f"   📝 {metadata['title']}")
                    
                    # Click Transcript tab
                    transcript = None
                    tab_clicked = page.evaluate("""() => {
                        const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
                        for (const tab of tabs) {
                            if (tab.textContent?.trim() === 'Transcript') {
                                tab.click();
                                return true;
                            }
                        }
                        return false;
                    }""")
                    
                    if tab_clicked:
                        page.wait_for_timeout(3000)
                        
                        # Extract transcript segments
                        transcript = page.evaluate("""() => {
                            const segments = [];
                            document.querySelectorAll('.transcript-list-item').forEach(item => {
                                const text = item.textContent?.trim();
                                if (text) segments.push(text);
                            });
                            return segments.join('\\n');
                        }""")
                        
                        if transcript:
                            print(f"   ✅ Transcript: {len(transcript)} chars")
                    
                    extracted_clips.append({
                        "url": url,
                        "title": metadata["title"],
                        "speaker": metadata["speaker"],
                        "created_at": metadata["createdAt"],
                        "transcript": transcript,
                        "summary": metadata["summary"],
                    })
                    
                    stats["processed"] += 1
                    page.wait_for_timeout(1000)
                    
                except Exception as e:
                    print(f"   ⚠️ Failed: {e}")
            
            browser.close()
    
    finally:
        # Release Steel session
        steel.sessions.release(session.id)
        print("\n✅ Steel session released")
    
    # Sync to Notion
    if extracted_clips:
        clips_with_transcript = [c for c in extracted_clips if c.get("transcript")]
        clips_without_transcript = len(extracted_clips) - len(clips_with_transcript)
        
        if clips_without_transcript > 0:
            print(f"\n   Note: {clips_without_transcript} clip(s) had no transcript and will be skipped")
        
        print(f"\n   Syncing {len(clips_with_transcript)} clips to Notion...")
        
        notion_stats = sync_to_notion(clips_with_transcript)
        stats["synced"] = notion_stats["synced"]
        stats["skipped"] = notion_stats["skipped"]
        stats["failed"] = notion_stats.get("failed", 0)
    
    # Summary
    print("\n" + "=" * 60)
    print("SYNC COMPLETE")
    print("=" * 60)
    print(f"   Processed: {stats['processed']}")
    print(f"   Synced: {stats['synced']}")
    print(f"   Skipped: {stats['skipped']}")
    if stats.get("failed", 0) > 0:
        print(f"   Failed: {stats['failed']}")
    
    # Send success email
    send_success_email(stats)
    
    return stats

# =============================================================================
# Scheduled Cron Job
# =============================================================================
# 
# ACTIVE: Runs daily at 9am EST (14:00 UTC)
# Email notification sent to micah@createsomething.io on completion/failure
#
# Manual trigger: modal run modal_sync.py

@app.function(
    image=image,
    secrets=[secrets],
    volumes={"/data": volume},
    timeout=900,
    schedule=modal.Cron("0 14 * * *"),  # 9am EST daily
)
def scheduled_sync():
    """Scheduled daily sync - runs at 9am EST when cron enabled."""
    try:
        result = sync_clips.remote()
        return result
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Scheduled sync failed: {error_msg}")
        send_failure_email(error_msg)
        return {"error": error_msg}

# =============================================================================
# CLI Entry Point
# =============================================================================

@app.local_entrypoint()
def main():
    """Run sync manually for testing."""
    print("🚀 Running Zoom Clips Sync...")
    result = sync_clips.remote()
    print(f"\n✅ Result: {result}")
