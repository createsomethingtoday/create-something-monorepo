#!/usr/bin/env python3
"""Browser smoke test for TemplateChat against the local agent harness.

Why this exists: the unit suite renders to static markup, so it can prove the
markup and the pure functions but never that a turn works in a real engine.
This repo has been bitten by exactly that gap before — jsdom passing where the
browser failed. Each assertion below covers behaviour that only exists once a
real stream, a real iframe and real focus handling are in play.

Run:
    pnpm --filter=@create-something/webflow-components test:browser

Requires a Playwright with Chromium available. Skips (exit 0) when Playwright is
not installed, so it never becomes a broken gate on a machine without it.
"""

from __future__ import annotations

import http.client
import json
import os
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

try:
    from playwright.sync_api import Page, expect, sync_playwright
except ImportError:  # pragma: no cover - environment probe
    print("SKIP: playwright is not installed; browser smoke test not run.")
    raise SystemExit(0)

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
HARNESS = PACKAGE_ROOT / "test" / "harness" / "template-chat-mobile-server.mjs"
PORT = int(os.environ.get("TEMPLATE_CHAT_SMOKE_PORT", "4188"))
BASE_URL = f"http://127.0.0.1:{PORT}"
# The harness rebuilds the bundle with esbuild on boot.
BOOT_TIMEOUT_S = 90

failures: list[str] = []
ARTIFACTS = PACKAGE_ROOT / "output" / "playwright"


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok   {label}")
        return
    failures.append(f"{label}{f' — {detail}' if detail else ''}")
    print(f"  FAIL {label}{f' — {detail}' if detail else ''}")


def wait_for_harness() -> None:
    deadline = time.time() + BOOT_TIMEOUT_S
    while time.time() < deadline:
        try:
            connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=2)
            connection.request("GET", "/health")
            if connection.getresponse().status == 200:
                return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError(f"harness did not answer /health within {BOOT_TIMEOUT_S}s")


@contextmanager
def harness():
    process = subprocess.Popen(
        ["node", str(HARNESS)],
        cwd=str(PACKAGE_ROOT),
        env={**os.environ, "PORT": str(PORT)},
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        wait_for_harness()
        yield
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()


def chat(page: Page):
    """The chat renders in a shadow root; Playwright pierces it by default."""
    return page.locator(".tmchat-panel")


def send(page: Page, prompt: str) -> None:
    page.locator(".tmchat-input").first.fill(prompt)
    page.locator(".tmchat-input").first.press("Enter")


def open_chat(page: Page, query: str = "") -> None:
    page.goto(f"{BASE_URL}/{query}", wait_until="domcontentloaded")
    launcher = page.locator(".tmchat-launcher").first
    if launcher.count() and launcher.is_visible():
        launcher.click()
    expect(chat(page).first).to_be_visible(timeout=15_000)


def test_turn_renders_results_and_preview(page: Page) -> None:
    print("\n[1] a normal turn streams text, renders cards, and previews a site")
    open_chat(page)
    check(
        "chat runs inside the Webflow-style shadow boundary",
        page.locator("#root").evaluate("element => Boolean(element.shadowRoot)"),
    )
    send(page, "a restaurant site with a menu")

    cards = page.locator(".tmchat-display .tmcard-wrapper")
    expect(cards.first).to_be_visible(timeout=45_000)
    check("recommendation cards rendered", cards.count() >= 1, f"count={cards.count()}")

    receipt = page.locator(".tmchat-turn-status").first
    expect(receipt).to_be_visible(timeout=20_000)
    check("durable receipt shown after the turn", "ready" in (receipt.inner_text() or "").lower())

    # The agent drove the page in this fixture, so undo must be offered.
    undo = page.locator(".tmchat-undo").first
    check("undo offered for the agent's page change", undo.count() == 1)
    if undo.count():
        undo.click()
        check("undo clears itself once applied", page.locator(".tmchat-undo").count() == 0)

    preview_link = page.locator(".tmcard-preview-link").first
    if preview_link.count():
        preview_link.click()
        frame = page.locator("iframe.tmchat-preview-frame").first
        expect(frame).to_be_visible(timeout=20_000)
        sandbox = frame.get_attribute("sandbox") or ""
        check("preview iframe is sandboxed", "allow-scripts" in sandbox, sandbox)
        check(
            "preview iframe cannot navigate the marketplace away",
            "allow-top-navigation" not in sandbox,
            sandbox,
        )
        check(
            "preview iframe does not share our origin",
            "allow-same-origin" not in sandbox,
            sandbox,
        )
        page.locator(".tmchat-preview-back").first.click()
        expect(page.locator(".tmchat-preview").first).to_be_hidden(timeout=5_000)
        check("returning from preview restores the conversation", chat(page).first.is_visible())
        focus_state = preview_link.evaluate(
            """element => ({
                matches: element.getRootNode().activeElement === element,
                activeClass: element.getRootNode().activeElement?.className || '',
                connected: element.isConnected,
            })"""
        )
        check(
            "returning from preview restores focus to its card",
            focus_state["matches"],
            str(focus_state),
        )


def test_crlf_stream_is_not_lost(page: Page) -> None:
    print("\n[2] a CRLF-framed stream still renders (old parser saw nothing)")
    open_chat(page)
    send(page, "crlf please")
    expect(page.locator(".tmchat-display .tmcard-wrapper").first).to_be_visible(timeout=45_000)
    body = chat(page).first.inner_text()
    check("reply text arrived", "Transport fixture reply." in body, body[:120])


def test_tight_data_stream_is_not_lost(page: Page) -> None:
    print("\n[3] 'data:' without the optional space still renders")
    open_chat(page)
    send(page, "tight data")
    expect(page.locator(".tmchat-display .tmcard-wrapper").first).to_be_visible(timeout=45_000)
    check("reply text arrived", "Transport fixture reply." in chat(page).first.inner_text())


def test_rate_limit_is_explained(page: Page) -> None:
    print("\n[4] a throttled turn explains itself and offers a retry")
    open_chat(page)
    send(page, "rate limit")
    messages = page.locator(".tmchat-msg.assistant")
    expect(messages.last).to_be_visible(timeout=30_000)
    text = messages.last.inner_text().lower()
    check("throttle copy is reader-facing", "busy" in text, text[:120])
    check("no status code leaked into the conversation", "429" not in text, text[:120])
    check("retry offered", page.locator("button:has-text('Try again')").count() >= 1)


def test_composer_stays_usable_after_failure(page: Page) -> None:
    print("\n[5] the composer is not left spinning after a failure")
    open_chat(page)
    send(page, "rate limit")
    expect(page.locator(".tmchat-msg.assistant").last).to_be_visible(timeout=30_000)
    # Stop only exists while streaming; Send returning means the turn released.
    send_button = page.locator(".tmchat-send").first
    check(
        "composer returned to Send",
        "stop" not in (send_button.get_attribute("class") or ""),
        send_button.get_attribute("class") or "",
    )
    check("progress surface torn down", page.locator(".tmchat-progress").count() == 0)


def test_made_in_webflow_never_drives_the_host_page(page: Page) -> None:
    print("\n[6] Made in Webflow finder reports no grid and suppresses page actions")
    request_contexts: list[dict[str, object]] = []

    def capture_chat_request(request) -> None:
        if request.method != "POST" or not request.url.endswith("/api/templates/agent/chat"):
            return
        request_contexts.append(json.loads(request.post_data or "{}").get("context", {}))

    page.on("request", capture_chat_request)
    open_chat(page, "?made-in-webflow")
    original_url = page.url
    send(page, "a restaurant site with a menu")

    expect(page.locator(".tmchat-display .tmcard-wrapper").first).to_be_visible(timeout=45_000)
    check(
        "request explicitly reports no host template grid",
        bool(request_contexts) and request_contexts[-1].get("has_page_grid") is False,
        str(request_contexts[-1] if request_contexts else None),
    )
    check("agent page action did not rewrite the URL", page.url == original_url, page.url)
    check("suppressed page action produced no Undo receipt", page.locator(".tmchat-undo").count() == 0)


def test_featured_preview_supports_fast_decisions_and_ordered_browsing(page: Page) -> None:
    print("\n[7] Featured preview explains the human pick and preserves low-travel browsing")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    page.goto(f"{BASE_URL}/?featured", wait_until="domcontentloaded")
    page.get_by_role("button", name="Open Featured preview").click()

    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    reviewer_kicker = page.locator(".tmfeatured-feedback-kicker")
    expect(reviewer_kicker).to_be_visible()
    reviewer_copy = " ".join((reviewer_kicker.text_content() or "").split())
    check("review provenance is explicitly human", "Human Marketplace review" in reviewer_copy, reviewer_copy)
    expect(page.get_by_role("heading", name="Why our Marketplace team featured it")).to_be_visible()
    expect(page.get_by_text("1 of 2 featured templates", exact=True)).to_be_visible()
    expect(page.get_by_role("link", name="Open live preview")).to_be_visible()

    sidebar = page.locator(".tmfeatured-side")
    sidebar_box = sidebar.bounding_box()
    check(
        "desktop decision rail has a readable width",
        bool(sidebar_box) and sidebar_box["width"] >= 390,
        str(sidebar_box),
    )

    next_edge = page.get_by_role("button", name="Next featured template")
    page.locator(".tmfeatured-stage").hover()
    expect(next_edge).to_be_visible()
    next_edge.click()
    expect(page.get_by_role("heading", name="Featured Two", level=1)).to_be_visible()
    check("edge navigation preserves collection position", page.get_by_text("2 of 2 featured templates").count() == 1)

    page.keyboard.press("ArrowLeft")
    expect(page.get_by_role("heading", name="Featured One", level=1)).to_be_visible()
    check("ArrowLeft returns through the same ordered sequence", page.get_by_text("1 of 2 featured templates").count() == 1)

    frame = page.locator("iframe.tmfeatured-frame")
    check("preview starts outside the Tab order", frame.get_attribute("tabindex") == "-1")
    sandbox = frame.get_attribute("sandbox") or ""
    check("keyboard opt-in does not add same-origin authority", "allow-same-origin" not in sandbox, sandbox)

    access = page.get_by_role("button", name="Enable keyboard preview")
    access.click()
    check(
        "keyboard opt-in focuses the live preview",
        frame.evaluate("element => document.activeElement === element"),
    )
    expect(page.get_by_text("Press Shift+Tab to return; Escape and ← → resume in modal controls.", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Return to modal controls")).to_be_visible()
    page.keyboard.press("Shift+Tab")
    check(
        "Shift+Tab returns to the explicit preview control",
        page.get_by_role("button", name="Keyboard preview enabled").evaluate(
            "element => document.activeElement === element"
        ),
    )
    page.get_by_role("button", name="Return to modal controls").click()
    check(
        "explicit return action restores modal keyboard controls",
        page.get_by_role("button", name="Enable keyboard preview").evaluate(
            "element => document.activeElement === element"
        ),
    )

    page.screenshot(path=str(ARTIFACTS / "featured-template-preview-desktop.png"), full_page=False)

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(f"{BASE_URL}/?featured", wait_until="domcontentloaded")
    page.get_by_role("button", name="Open Featured preview").click()
    expect(page.get_by_role("dialog")).to_be_visible()
    expect(page.get_by_role("group", name="Preview device")).to_be_visible()
    expect(page.get_by_role("link", name="View Featured One template details (opens in a new tab)")).to_be_visible()
    expect(page.get_by_role("link", name="Buy $79 USD")).to_be_visible()
    check(
        "mobile modal has no horizontal overflow",
        page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
        str(page.evaluate("({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth })")),
    )
    page.locator(".tmfeatured-feedback").scroll_into_view_if_needed()
    expect(page.get_by_role("heading", name="Why our Marketplace team featured it")).to_be_visible()
    check(
        "mobile navigation follows decision content instead of covering it",
        page.locator(".tmfeatured-nav-wrap").evaluate("element => getComputedStyle(element).position === 'static'"),
        page.locator(".tmfeatured-nav-wrap").evaluate("element => getComputedStyle(element).position"),
    )
    check(
        "mobile edge navigation does not obscure the template preview",
        page.locator(".tmfeatured-edge-nav").first.evaluate("element => getComputedStyle(element).display === 'none'"),
        page.locator(".tmfeatured-edge-nav").first.evaluate("element => getComputedStyle(element).display"),
    )
    check(
        "touch layouts omit the keyboard-only browsing hint",
        page.locator(".tmfeatured-nav-hint").evaluate("element => getComputedStyle(element).display === 'none'"),
        page.locator(".tmfeatured-nav-hint").evaluate("element => getComputedStyle(element).display"),
    )
    reviewer_box = page.locator(".tmfeatured-feedback").bounding_box()
    details_box = page.locator(".tmfeatured-details").bounding_box()
    nav_box = page.locator(".tmfeatured-nav-wrap").bounding_box()
    check(
        "mobile reviewer rationale remains in the content flow above navigation",
        bool(reviewer_box) and bool(nav_box) and reviewer_box["height"] > 80 and reviewer_box["y"] < nav_box["y"],
        str({"reviewer": reviewer_box, "navigation": nav_box}),
    )
    page.screenshot(path=str(ARTIFACTS / "featured-template-preview-mobile-review.png"), full_page=False)
    check(
        "mobile template details precede navigation in document order",
        page.locator(".tmfeatured-details").evaluate(
            "element => Boolean(element.compareDocumentPosition(document.querySelector('.tmfeatured-nav-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING)"
        ),
        str({"details": details_box, "navigation": nav_box}),
    )
    page.locator(".tmfeatured-details").scroll_into_view_if_needed()
    expect(page.get_by_role("heading", name="Template details")).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / "featured-template-preview-mobile.png"), full_page=False)


def main() -> int:
    with harness(), sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            for test in (
                test_turn_renders_results_and_preview,
                test_crlf_stream_is_not_lost,
                test_tight_data_stream_is_not_lost,
                test_rate_limit_is_explained,
                test_composer_stays_usable_after_failure,
                test_made_in_webflow_never_drives_the_host_page,
                test_featured_preview_supports_fast_decisions_and_ordered_browsing,
            ):
                context = browser.new_context(viewport={"width": 1280, "height": 900})
                page = context.new_page()
                page.on("pageerror", lambda error: failures.append(f"page error: {error}"))
                try:
                    test(page)
                finally:
                    context.close()
        finally:
            browser.close()

    print()
    if failures:
        print(f"{len(failures)} browser check(s) failed:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("All browser checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
