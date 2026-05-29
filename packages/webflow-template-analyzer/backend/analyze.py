#!/usr/bin/env python3
"""
Webflow Template Analyzer
=========================
Analyzes a Webflow template and prefills the marketplace submission form.

Usage
-----
  Interactive (opens form first, waits for "Generate" button click):
    python3 analyze.py

  Direct (analyze a URL, then optionally open the form):
    python3 analyze.py https://your-template.webflow.io
"""

import sys
import os
import json
import io
import base64
import time
from dataclasses import dataclass
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from dotenv import load_dotenv
load_dotenv()

from PIL import Image
import anthropic
from playwright.sync_api import sync_playwright, Page

try:
    from steel import Steel
except ImportError:
    Steel = None

# ─── Form field mappings (exact IDs from the Webflow submission form) ─────────

FORM_URL = "https://webflow.com/templates/submit-a-template?section=submit-today"

STYLE_IDS: dict[str, str] = {
    "Bold": "Styles-Bold",
    "Corporate": "Styles-Corporate",
    "Dark": "Styles-Dark",
    "Illustration": "Styles-Illustration",
    "Light": "Styles-Light",
    "Minimal": "Styles-Minimal",
    "Modern": "Styles-Modern",
    "Playful": "Styles-Playful",
    "Retro": "Styles-Retro",
}

FEATURE_IDS: dict[str, str] = {
    "Responsive design": "Features-Responsive-Design",
    "Responsive navigation": "Features-Responsive-Navigation",
    "Responsive slider": "Features-Responsive-Slider",
    "Media lightbox": "Features-Media-Lightbox",
    "Background video": "Features-Background-Video",
    "3D transforms": "Features-3D-Transforms",
    "Interactions": "Features-Interactions",
    "Forms": "Features-Forms",
    "Symbols": "Features-Symbols",
    "CSS Grid": "Features-CSS-Grid",
    "Custom 404 page": "Features-Custom-404-Page",
    "Web fonts": "Features-Web-Fonts",
    "Retina ready": "Features-Retina-Ready",
    "CMS": "Content-Management-System",
    "Ecommerce": "Ecommerce",
}

PAGE_TYPE_IDS: dict[str, str] = {
    "one_page": "One",
    "multi_page": "Multi",
    "multi_layout": "Multi-layout",
}

CATEGORIES = [
    "Advocacy & Campaigns", "Agriculture", "Architecture", "AI",
    "Art & Design Blog", "Arts & Crafts Store", "Bakery",
    "Banking & Investment", "Bar & Nightclub", "Beauty & Wellness Store",
    "Blockchain", "Book", "Books & Publishers Store",
    "Business & Finance Blog", "Cafe & Coffee Shop", "Cars",
    "Catering & Delivery", "Charity & Fundraising",
    "Chiropractor & Physiotherapist", "Classes & Courses", "Cleaning",
    "Clinic & Pharmacy", "College / University", "Coming Soon",
    "Consulting & Coaching", "Creative Agency", "Creators & Influencers",
    "Cryptocurrency & NFTs", "Dance", "Dentist", "Design Portfolio",
    "Digital Products Store", "Doctor", "Documentation",
    "Early Education", "Electronics Store", "Event Production", "Events",
    "Fashion & Clothing Store", "Film & TV", "Finance & Accounting",
    "Fitness & Gym", "Florist & Plants Store", "Food & Drinks Store",
    "Food & Recipe Blog", "Foundations & NGO",
    "Freelancers & Consultants", "Gallery & Museum", "Gaming",
    "Health & Nutrition", "Home Construction", "Home Decor Store",
    "Home Services & Maintenance", "Hospital", "Hotels & Lodging",
    "Insurance", "Interior Design", "IT company",
    "Jewelry & Accessories Store", "Job Portal", "Kids & Babies Store",
    "Landscaping & Gardening", "Law Firm & Attorney", "Lifestyle Blog",
    "Magazine", "Makeup & Cosmetics", "Marketing & Advertising",
    "Mobile App", "Music Events & Festivals",
    "Music Industry & Promotion", "Musicians & Bands",
    "Nature & Conservation", "News", "Newsletter", "Online Education",
    "Outdoor & Adventure", "Personal Blog", "Pets & Animals Store",
    "Photography & Video Portfolio", "Podcast & Radio", "Political",
    "Property Management & HOA", "Public services", "Real Estate",
    "Recruiting", "Religious & Spiritual", "Renewable energy",
    "Restaurant", "Resume & CV", "Residential Design",
    "Salon & Barbershop", "Schools", "Software & SaaS", "Spa", "Sports",
    "Sports & Outdoors Store", "Startup", "Support/Help center",
    "Sustainability", "Tattoo", "Therapy & Psychology",
    "Transportation & Logistics", "Travel & Tourism", "Travel Blog",
    "UI Kit", "Veterinary", "Volunteer & Community", "Waitlist",
    "Weddings", "Winery",
]

SECONDARY_TAGS = [
    "Accessories", "Accounting", "Admin", "Agency", "Agriculture", "App",
    "Architecture", "Artist", "Attorney", "Automotive", "Band", "Bank", "Bar",
    "Barber", "Beauty", "Beauty & Wellness", "Blog", "Book", "Business", "Cafe",
    "Cars", "Charity", "Church", "Coaching", "Coffee Shop", "College", "Coming Soon",
    "Conference", "Construction", "Consulting", "Corporate", "Countdown", "Creative",
    "CV", "Dance", "Dashboard", "Delivery", "Dentist", "Design", "Designer",
    "Directory", "DJ", "Doctor", "Documentation", "Donation", "Education",
    "Entertainment", "Error", "Event", "Farm", "Fashion", "Film", "Finance",
    "Fitness", "Florist", "Food", "Food & Drink", "Furniture", "Game", "Guesthouse",
    "Gym", "Health", "Help center", "Homeware", "Hospital", "Hostel", "Hotel", "Inn",
    "Insurance", "Interior design", "Investment", "IT company", "Jewelry",
    "Job Portal", "Kids", "Landing page", "Law Firm", "Learning", "Lifestyle",
    "Logistics", "Magazine", "Marketing", "Marketplace", "Massage", "Medical",
    "Mobile", "Movie", "Multi Layout", "Music", "Musician", "News", "Newsletter",
    "Newspaper", "Nonprofit", "One Page", "Other", "Personal", "Pets", "Photography",
    "Photography & Video", "Podcast", "Political", "Portfolio", "Profile", "Radio",
    "Real Estate", "Recipe", "Recruitment", "Religion", "Restaurant", "Resume",
    "Retail", "SaaS", "Salon", "School", "Shop", "Small Business", "Soccer", "Social",
    "Software", "Spa", "Sports", "Startup", "Support", "Technology", "Therapy",
    "Tourism", "Transport", "Travel", "UI Kit", "Under Construction", "University",
    "Veterinary", "Video", "Wedding", "Wellness", "Winery",
]

RETRYABLE_ANTHROPIC_STATUS_CODES = {429, 500, 503, 504, 529}
MAX_ANTHROPIC_ATTEMPTS = 3
DEFAULT_VIEWPORT = {"width": 1440, "height": 900}
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
DEFAULT_STEEL_SESSION_TIMEOUT_MS = 20 * 60 * 1000
BROWSER_PROVIDER_ENV = "BROWSER_PROVIDER"


@dataclass
class BrowserPageSession:
    browser: Any
    page: Page
    provider: str
    steel_client: Any | None = None
    steel_session: Any | None = None

    @property
    def viewer_url(self) -> str | None:
        if not self.steel_session:
            return None
        session_id = getattr(self.steel_session, "id", None)
        return (
            getattr(self.steel_session, "session_viewer_url", None)
            or getattr(self.steel_session, "sessionViewerUrl", None)
            or (f"https://app.steel.dev/sessions/{session_id}" if session_id else None)
        )


def steel_enabled() -> bool:
    return bool(os.environ.get("STEEL_API_KEY"))


def configured_browser_provider() -> str:
    provider = os.environ.get(BROWSER_PROVIDER_ENV, "playwright").strip().lower()
    return "steel" if provider == "steel" else "playwright"


def browser_provider_name() -> str:
    return configured_browser_provider()


def steel_session_timeout_ms() -> int:
    raw = os.environ.get("STEEL_SESSION_TIMEOUT_MS", "").strip()
    if not raw:
        return DEFAULT_STEEL_SESSION_TIMEOUT_MS
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_STEEL_SESSION_TIMEOUT_MS
    return parsed if parsed > 0 else DEFAULT_STEEL_SESSION_TIMEOUT_MS


@contextmanager
def open_browser_page(*, headless: bool, slow_mo: int = 0) -> Iterator[BrowserPageSession]:
    with sync_playwright() as p:
        session: BrowserPageSession | None = None
        try:
            if headless and configured_browser_provider() == "steel":
                if Steel is None:
                    raise RuntimeError("STEEL_API_KEY is set but steel-sdk is not installed.")
                if not steel_enabled():
                    raise RuntimeError("BROWSER_PROVIDER=steel requires STEEL_API_KEY to be set.")

                steel_client = Steel(steel_api_key=os.environ["STEEL_API_KEY"])
                steel_session = steel_client.sessions.create(timeout=steel_session_timeout_ms())
                browser = p.chromium.connect_over_cdp(
                    f"wss://connect.steel.dev?apiKey={os.environ['STEEL_API_KEY']}&sessionId={steel_session.id}"
                )
                context = browser.contexts[0] if browser.contexts else browser.new_context()
                page = context.pages[0] if context.pages else context.new_page()
                page.set_viewport_size(DEFAULT_VIEWPORT)
                session = BrowserPageSession(
                    browser=browser,
                    page=page,
                    provider="steel",
                    steel_client=steel_client,
                    steel_session=steel_session,
                )
            else:
                browser = p.chromium.launch(headless=headless, slow_mo=slow_mo)
                context = browser.new_context(
                    viewport=DEFAULT_VIEWPORT,
                    user_agent=DEFAULT_USER_AGENT,
                )
                session = BrowserPageSession(
                    browser=browser,
                    page=context.new_page(),
                    provider="playwright",
                )

            yield session
        finally:
            if session:
                try:
                    session.browser.close()
                except Exception:
                    pass

                if session.steel_client and session.steel_session:
                    try:
                        session.steel_client.sessions.release(session.steel_session.id)
                    except Exception:
                        pass

# ─── Image helpers ────────────────────────────────────────────────────────────

def to_webp(png_bytes: bytes, out_path: Path, width: int, height: int, max_kb: int) -> None:
    """Resize PNG bytes to target dimensions, save as WEBP under max_kb."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    img = img.resize((width, height), Image.LANCZOS)
    quality = 85
    while True:
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality)
        if buf.tell() <= max_kb * 1024 or quality <= 25:
            break
        quality -= 5
    out_path.write_bytes(buf.getvalue())


def create_anthropic_message_with_retries(client: anthropic.Anthropic, **kwargs):
    last_error = None

    for attempt in range(1, MAX_ANTHROPIC_ATTEMPTS + 1):
        try:
            return client.messages.create(**kwargs)
        except anthropic.APIError as exc:
            last_error = exc
            status_code = getattr(exc, "status_code", None)
            retryable = isinstance(exc, (anthropic.APIConnectionError, anthropic.APITimeoutError))
            if status_code in RETRYABLE_ANTHROPIC_STATUS_CODES:
                retryable = True

            if not retryable or attempt == MAX_ANTHROPIC_ATTEMPTS:
                raise

            delay_seconds = 2 ** (attempt - 1)
            print(
                f"Anthropic request failed "
                f"({status_code or exc.__class__.__name__}); retrying in {delay_seconds}s..."
            )
            time.sleep(delay_seconds)

    if last_error:
        raise last_error

    raise RuntimeError("Anthropic request failed without returning an error.")


# ─── Phase 1: Headless template analysis ─────────────────────────────────────

def analyze_template(url: str) -> dict:
    """
    Visit the template with a headless browser, count sections, extract
    content, take screenshots, then call Claude to generate all form fields.

    Returns a dict with the analysis result, or raises on error.
    """
    print(f"\nLoading {url} ...")

    with open_browser_page(headless=True) as browser_session:
        page = browser_session.page
        print(f"✓ Browser provider: {browser_session.provider}")

        page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        try:
            page.wait_for_load_state("load", timeout=10_000)
        except Exception:
            pass
        page.wait_for_timeout(2500)

        # Scroll through to trigger lazy loading
        page_height: int = page.evaluate("() => document.body.scrollHeight")
        for y in range(0, page_height, 700):
            page.evaluate(f"() => window.scrollTo(0, {y})")
            page.wait_for_timeout(80)
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(600)

        # Count sections and detect Webflow features
        info = page.evaluate("""() => {
            const sections = document.querySelectorAll('section');
            const wfSections = document.querySelectorAll(
                '.w-section, [class*="section_wrap"], [class*="_section"]'
            );
            return {
                sectionCount: Math.max(sections.length, wfSections.length),
                detected: {
                    hasCMS: !!document.querySelector('.w-dyn-list, .w-dyn-item'),
                    hasEcommerce: !!document.querySelector(
                        '.w-commerce-commercecartcontainerlink, .w-commerce-commerceaddtocartbutton'
                    ),
                    hasVideo: !!(
                        document.querySelector('video') ||
                        document.querySelector('.w-background-video')
                    ),
                    hasForms: document.querySelectorAll('form').length > 0,
                    hasSlider: !!document.querySelector('.w-slider'),
                    hasLightbox: !!document.querySelector('.w-lightbox'),
                    hasGrid: !!document.querySelector('[class*="grid"]'),
                    hasInteractions: !!document.querySelector('[data-w-id]'),
                }
            };
        }""")

        section_count: int = info["sectionCount"]
        detected: dict = info["detected"]

        print(f"✓ {section_count} section(s) detected")

        # Extract page content for AI analysis
        content = page.evaluate("""() => {
            const hostname = location.hostname;
            const internalPaths = new Set();
            document.querySelectorAll('a[href]').forEach(a => {
                try {
                    const u = new URL(a.href);
                    if (u.hostname === hostname && u.pathname !== '/' && !a.href.includes('#'))
                        internalPaths.add(u.pathname);
                } catch {}
            });
            return {
                title: document.title,
                meta: document.querySelector('meta[name="description"]')?.content || '',
                h1: [...document.querySelectorAll('h1')]
                    .map(h => h.textContent.trim()).filter(Boolean).join(' | '),
                h2: [...document.querySelectorAll('h2')]
                    .map(h => h.textContent.trim()).filter(Boolean).slice(0, 8).join(' | '),
                nav: [...document.querySelectorAll('nav a, header a')]
                    .map(a => a.textContent.trim()).filter(Boolean).join(', '),
                bodyText: document.body.innerText.replace(/\\s+/g, ' ').substring(0, 1500),
                pages: [...internalPaths],
            };
        }""")

        # ── Screenshots ───────────────────────────────────────────────────────
        print("Taking screenshots...")
        output_dir = Path.cwd() / "output"
        output_dir.mkdir(exist_ok=True)
        screenshots: dict = {"gallery": []}

        # Primary thumbnail — 750×995 WEBP ≤ 300 KB
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(300)
        primary_path = output_dir / "primary-thumbnail.webp"
        to_webp(
            page.screenshot(clip={"x": 0, "y": 0, "width": 1440, "height": 900}),
            primary_path, 750, 995, 290,
        )
        screenshots["primary"] = str(primary_path)

        # Secondary thumbnail — same spec, from ~35 % down the page
        page.evaluate(f"() => window.scrollTo(0, {int(page_height * 0.35)})")
        page.wait_for_timeout(300)
        secondary_path = output_dir / "secondary-thumbnail.webp"
        to_webp(
            page.screenshot(clip={"x": 0, "y": 0, "width": 1440, "height": 900}),
            secondary_path, 750, 995, 290,
        )
        screenshots["secondary"] = str(secondary_path)

        # 5 gallery images — 1440×900 WEBP ≤ 250 KB, evenly spaced
        for i in range(5):
            frac = i / 4  # 0, 0.25, 0.5, 0.75, 1.0
            scroll_y = int(frac * max(0, page_height - 900))
            page.evaluate(f"() => window.scrollTo(0, {scroll_y})")
            page.wait_for_timeout(200)
            dest = output_dir / f"gallery-{i + 1}.webp"
            to_webp(
                page.screenshot(clip={"x": 0, "y": 0, "width": 1440, "height": 900}),
                dest, 1440, 900, 240,
            )
            screenshots["gallery"].append(str(dest))

        print("✓ Screenshots saved to ./output/")

        # ── Claude analysis ───────────────────────────────────────────────────
        print("Generating form details...")
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        image_b64 = base64.b64encode(primary_path.read_bytes()).decode()

        system_prompt = (
            "You are a Webflow template marketplace curator. Analyze templates and generate "
            "accurate, compelling submission details. Be specific — avoid generic phrases like "
            "'modern design' or 'perfect for any business'."
        )

        styles_list = ", ".join(STYLE_IDS.keys())
        features_list = ", ".join(FEATURE_IDS.keys())
        categories_list = ", ".join(CATEGORIES)
        secondary_tags_list = ", ".join(SECONDARY_TAGS)

        user_prompt = f"""Analyze this Webflow template and return a JSON object for the marketplace submission form.

URL: {url}
Title: {content['title']}
Meta description: {content['meta']}
H1 headings: {content['h1']}
H2 headings: {content['h2']}
Nav links: {content['nav']}
Body text excerpt: {content['bodyText'][:800]}
Internal pages found: {len(content['pages'])} ({', '.join(content['pages'])})
Total sections: {section_count}
Detected — CMS: {detected['hasCMS']}, Ecommerce: {detected['hasEcommerce']}, \
Video bg: {detected['hasVideo']}, Forms: {detected['hasForms']}, \
Slider: {detected['hasSlider']}, Lightbox: {detected['hasLightbox']}, \
CSS Grid: {detected['hasGrid']}, Interactions: {detected['hasInteractions']}

Available categories (pick 1–3 most relevant):
{categories_list}

Available secondary tags (pick 0–6 specific topics or use cases; avoid repeating categories verbatim unless clearly appropriate):
{secondary_tags_list}

Available styles (pick 1–3):
{styles_list}

Available features (pick all that clearly apply):
{features_list}

Return ONLY this JSON (no markdown, no explanation):
{{
  "template_name": "2–4 word name specific to this template's purpose",
  "short_description": "Max 250 chars. What it's for, who it's for, what makes it stand out.",
  "long_description": "3–5 sentences: purpose, target audience, key sections, design style, what's unique.",
  "categories": ["1–3 from the categories list above"],
  "secondary_tags": ["0–6 from the secondary tags list above"],
  "pricing": "Free or Paid",
  "page_type": "one_page | multi_page | multi_layout",
  "webflow_features_cms": {str(detected['hasCMS']).lower()},
  "webflow_features_ecommerce": {str(detected['hasEcommerce']).lower()},
  "styles": ["1–3 from the styles list"],
  "features": ["all applicable from the features list"]
}}"""

        response = create_anthropic_message_with_retries(
            client,
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/webp",
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                }
            ],
        )

        raw = response.content[0].text.strip()
        try:
            result = json.loads(raw, strict=False)
        except json.JSONDecodeError:
            import re
            m = re.search(r"\{[\s\S]*\}", raw)
            if not m:
                raise ValueError(f"Could not parse AI response as JSON:\n{raw}")
            result = json.loads(m.group(0), strict=False)

        result["screenshots"] = screenshots

        out_file = output_dir / "submission.json"
        out_file.write_text(json.dumps({"url": url, **result}, indent=2))

        return result, str(out_file)


# ─── Print summary ────────────────────────────────────────────────────────────

def print_summary(result: dict) -> None:
    hr = "─" * 58
    print(f"\n{hr}")
    print("  GENERATED SUBMISSION DETAILS")
    print(hr)
    print(f"  Name:       {result['template_name']}")
    print(f"  Pricing:    {result['pricing']}")
    print(f"  Page type:  {result['page_type']}")
    print(f"  Categories: {', '.join(result['categories'])}")
    print(f"  Tags:       {', '.join(result.get('secondary_tags', []))}")
    print(f"  Styles:     {', '.join(result['styles'])}")
    print(f"  CMS:        {result['webflow_features_cms']}")
    print(f"  Ecommerce:  {result['webflow_features_ecommerce']}")
    print(f"  Features:   {', '.join(result['features'])}")
    print(f"\n  Short description:\n  {result['short_description']}")
    print(f"\n  Long description:\n  {result['long_description']}")
    ss = result["screenshots"]
    out_dir = Path(ss["primary"]).parent
    print(f"\n  Screenshots (in {out_dir}):")
    print("    primary-thumbnail.webp   750×995px")
    print("    secondary-thumbnail.webp 750×995px")
    for i in range(1, 6):
        print(f"    gallery-{i}.webp           1440×900px")
    print(hr + "\n")


# ─── Fill the Webflow submission form ─────────────────────────────────────────

def fill_remaining_fields(page: Page, result: dict) -> None:
    """Fill all AI-generated fields into the open Webflow submission form."""
    print("Filling fields...")

    def try_fill(field_id: str, value: str) -> None:
        try:
            el = page.locator(f"#{field_id}")
            el.wait_for(state="visible", timeout=3000)
            el.fill(value)
        except Exception:
            pass

    def try_check(field_id: str) -> None:
        try:
            el = page.locator(f"#{field_id}")
            el.wait_for(state="attached", timeout=3000)
            if not el.is_checked():
                el.check()
        except Exception:
            pass

    # Template name — only set if currently empty
    current_name = ""
    try:
        current_name = page.locator("#Template-Name").input_value()
    except Exception:
        pass
    if not current_name:
        try_fill("Template-Name", result["template_name"])

    # Descriptions
    try_fill("Short-Description", result["short_description"][:250])
    try_fill("Long-Description", result["long_description"])

    # Pricing
    try_check("Free" if result["pricing"] == "Free" else "Paid")

    # Page type
    pt_id = PAGE_TYPE_IDS.get(result["page_type"], "Multi")
    try_check(pt_id)

    # Webflow features
    if result.get("webflow_features_cms"):
        try_check("Type-CMS")
    if result.get("webflow_features_ecommerce"):
        try_check("Type-Ecommerce")

    # Styles
    for style in result.get("styles", []):
        sid = STYLE_IDS.get(style)
        if sid:
            try_check(sid)

    # Features
    for feature in result.get("features", []):
        fid = FEATURE_IDS.get(feature)
        if fid:
            try_check(fid)

    # Categories — JS-populated; click visible labels matching the text
    for cat in result.get("categories", []):
        try:
            el = page.locator(f'text="{cat}"').first
            if el.is_visible(timeout=1500):
                el.click()
        except Exception:
            pass

    print("✓ Fields filled")


def _post_fill_instructions(result: dict) -> None:
    out_dir = Path(result["screenshots"]["primary"]).parent
    print("\nThe browser is open. Please:")
    print("  1. Review and edit any generated fields")
    print(f"  2. Upload screenshots from {out_dir}:")
    print("       primary-thumbnail.webp   (750×995px)")
    print("       secondary-thumbnail.webp (750×995px)")
    print("       gallery-1.webp … gallery-5.webp (1440×900px)")
    print("  3. Submit when ready")
    print("\nPress Ctrl+C to exit.\n")


# ─── Open form in browser (called by the Designer Extension via API) ─────────

def open_form_in_browser(result: dict, template_url: str) -> None:
    """Open the Webflow submission form in a visible browser with fields pre-filled.

    Blocks until the user closes the page (or 1 hour elapses) so the browser
    stays alive. Meant to be called in a background thread from the API server.
    """
    with open_browser_page(headless=False, slow_mo=80) as browser_session:
        page = browser_session.page
        page.goto(FORM_URL, wait_until="networkidle")
        page.wait_for_timeout(2000)

        for field_id in ("Published-URL", "Preview-URL"):
            try:
                if not page.locator(f"#{field_id}").input_value():
                    page.locator(f"#{field_id}").fill(template_url)
            except Exception:
                pass

        fill_remaining_fields(page, result)
        _post_fill_instructions(result)

        try:
            page.wait_for_event("close", timeout=3_600_000)
        except Exception:
            pass


# ─── Direct mode: analyze first, then open form ───────────────────────────────

def direct_mode(template_url: str) -> None:
    result, out_file = analyze_template(template_url)
    print_summary(result)
    print(f"Saved to: {out_file}\n")

    ans = input("Open Webflow submission form and prefill? (y/n): ").strip().lower()
    if ans != "y":
        return

    print("\nOpening Webflow submission form...")
    with open_browser_page(headless=False, slow_mo=80) as browser_session:
        page = browser_session.page
        page.goto(FORM_URL, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Pre-fill the template URLs if empty
        for field_id in ("Published-URL", "Preview-URL"):
            try:
                if not page.locator(f"#{field_id}").input_value():
                    page.locator(f"#{field_id}").fill(template_url)
            except Exception:
                pass

        fill_remaining_fields(page, result)
        _post_fill_instructions(result)

        input("Press Enter to close the browser...")


# ─── Interactive mode: open form first, wait for "Generate" button ────────────

def interactive_mode() -> None:
    with open_browser_page(headless=False, slow_mo=60) as browser_session:
        page = browser_session.page

        # We'll receive the URL via a custom CDP / evaluate trick.
        # The injected button sets window.__ai_url and we poll for it.
        page.goto(FORM_URL, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Inject the floating "Generate remaining fields" button
        page.evaluate("""() => {
            const btn = document.createElement('button');
            btn.id = '__ai_gen_btn';
            btn.textContent = '✨  Generate remaining fields';
            btn.style.cssText = [
                'position:fixed', 'bottom:28px', 'right:28px',
                'background:linear-gradient(135deg,#146EF5 0%,#6B2EFF 100%)',
                'color:#fff', 'padding:14px 22px', 'border:none',
                'border-radius:10px', 'font-size:15px', 'font-weight:600',
                'cursor:pointer', 'z-index:2147483647',
                'box-shadow:0 6px 24px rgba(20,110,245,0.45)',
                'transition:transform .15s,box-shadow .15s',
                'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
                'white-space:nowrap',
            ].join(';');
            btn.addEventListener('mouseover', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 10px 30px rgba(20,110,245,0.55)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.transform = '';
                btn.style.boxShadow = '0 6px 24px rgba(20,110,245,0.45)';
            });
            btn.addEventListener('click', () => {
                const url = document.getElementById('Published-URL')?.value?.trim();
                if (!url || !url.startsWith('http')) {
                    alert('Please fill in the Published Link of the template first.');
                    return;
                }
                btn.textContent = '⏳  Analyzing template…';
                btn.style.background = '#555';
                btn.disabled = true;
                window.__ai_url = url;
            });
            document.body.appendChild(btn);
        }""")

        print("\n💡 Fill in the first 6 fields in the browser window:")
        print("     • Full name")
        print("     • Email")
        print("     • Template name")
        print("     • Published link  ← required for generation")
        print("     • Preview link")
        print("     • Free or Paid\n")
        print('Then click "✨ Generate remaining fields" (bottom-right corner).\n')

        # Poll until the button sets window.__ai_url
        template_url: str = ""
        while not template_url:
            page.wait_for_timeout(500)
            val = page.evaluate("() => window.__ai_url || ''")
            if val:
                template_url = val

        print(f"\nCaptured: {template_url}")

        try:
            result, out_file = analyze_template(template_url)
        except Exception as exc:
            print(f"\n✗ {exc}")
            page.evaluate("""() => {
                const btn = document.getElementById('__ai_gen_btn');
                if (btn) {
                    btn.textContent = '✗ Analysis failed — check terminal';
                    btn.style.background = '#c62828';
                    btn.disabled = false;
                }
            }""")
            input("Press Enter to close the browser...")
            return

        print_summary(result)
        print(f"Saved to: {out_file}\n")

        fill_remaining_fields(page, result)

        # Update button to success state
        page.evaluate("""() => {
            const btn = document.getElementById('__ai_gen_btn');
            if (btn) {
                btn.textContent = '✅  Done — review & submit';
                btn.style.background = '#1B873B';
                btn.disabled = false;
            }
        }""")

        _post_fill_instructions(result)
        input("Press Enter to close the browser...")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("\n✗ ANTHROPIC_API_KEY not set. Copy .env.example to .env and add your key.\n")
        sys.exit(1)

    if len(sys.argv) > 1:
        direct_mode(sys.argv[1])
    else:
        interactive_mode()
