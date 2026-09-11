#!/usr/bin/env python3
"""Mobile layout check for Grove.

Screenshots Home, Confirm, and Tutor at 320/375/430px width against a
running `npm run dev` server, with `/api/anthropic` mocked so no real
Anthropic key or network call is needed. Doesn't replace the real-iPhone
verification step (this is Chromium, not WebKit, so it can't actually
reproduce the iOS zoom-on-focus behavior) - it's a fast first pass to catch
layout breaks before that manual check.

Usage:
    npm run dev &                 # or run it in another terminal
    pip install playwright && playwright install chromium
    python3 scripts/mobile-check.py [--base-url http://localhost:3000] [--out-dir /tmp/grove-mobile-check]

Screenshots are written to --out-dir for manual review against
UX-RULES.md; this script asserts only the one thing Chromium actually can
(input font-size >= 16px) and otherwise leaves judgment to the screenshots.
"""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

WIDTHS = [320, 375, 430]
HEIGHT = 844

EXTRACT_REPLY = {
    "subject": "Test topic",
    "concepts": [
        {"name": "Concept A", "note": "a short note on concept A"},
        {"name": "Concept B", "note": "a short note on concept B"},
    ],
}
TUTOR_REPLY = {
    "message": "Let's start with something simple.\n\n**What is 2 + 2?**",
    "phase": "question",
    "understanding": "unknown",
    "options": ["3", "4", "5"],
    "correctOption": "4",
}


def anthropic_body(text_obj):
    return json.dumps({
        "content": [{"type": "text", "text": json.dumps(text_obj)}],
        "usage": {"input_tokens": 100, "output_tokens": 50},
    })


def mock_anthropic(route, request):
    try:
        payload = json.loads(request.post_data or "{}")
    except ValueError:
        payload = {}
    kind = payload.get("kind")
    body = anthropic_body(TUTOR_REPLY if kind == "tutor" else EXTRACT_REPLY)
    route.fulfill(status=200, content_type="application/json", body=body)


def run(base_url: str, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in WIDTHS:
            page = browser.new_page(viewport={"width": width, "height": HEIGHT})
            # Freeze the .fadeUp/.pop entrance animations at their end state so a
            # screenshot taken right after a selector match doesn't catch a
            # mid-fade frame - this also exercises the app's own reduced-motion path.
            page.emulate_media(reduced_motion="reduce")
            page.route("**/api/anthropic", mock_anthropic)
            page.goto(base_url, wait_until="networkidle")

            guest_btn = page.get_by_text("Continue as a guest")
            if guest_btn.count():
                guest_btn.click()

            page.screenshot(path=str(out_dir / f"home-{width}.png"), full_page=True)

            topic_input = page.get_by_placeholder("Photosynthesis, the Krebs cycle, causes of WWI…")
            topic_input.fill("Test topic")
            topic_input.press("Enter")
            page.wait_for_selector("text=Ready to plant", timeout=10000)
            page.screenshot(path=str(out_dir / f"confirm-{width}.png"), full_page=True)

            page.get_by_text("Plant and start growing").click()
            page.wait_for_selector("text=What is 2 + 2", timeout=10000)
            page.screenshot(path=str(out_dir / f"tutor-{width}.png"), full_page=True)

            # A font-size sanity check - the real iOS zoom-on-focus behavior
            # needs WebKit on an actual device, not Chromium.
            answer_input = page.get_by_placeholder("Type your answer…")
            if answer_input.count():
                font_size = answer_input.evaluate("el => getComputedStyle(el).fontSize")
                assert float(font_size.replace("px", "")) >= 16, (
                    f"input font-size {font_size} < 16px at {width}px wide"
                )

            page.close()
        browser.close()
    print(f"Screenshots written to {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3000")
    parser.add_argument("--out-dir", default="/tmp/grove-mobile-check")
    args = parser.parse_args()
    try:
        run(args.base_url, Path(args.out_dir))
    except Exception as exc:  # surface a clear failure instead of a bare traceback
        print(f"mobile-check failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
