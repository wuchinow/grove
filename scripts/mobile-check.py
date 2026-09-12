#!/usr/bin/env python3
"""Mobile layout check for Grove.

Screenshots Home, Confirm, and Tutor at 320/375/430px width against a
running `npm run dev` server, with `/api/anthropic` mocked so no real
Anthropic key or network call is needed. Also screenshots /admin and
/admin/users at the same widths (admin API routes mocked, since this
sandbox has no real admin session), plus opens and closes the sidebar
drawer to confirm it slides in, closes on backdrop tap, and closes on nav
selection - all three widths here are under the drawer's 768px breakpoint.
Doesn't replace the real-iPhone verification step (this is Chromium, not
WebKit, so it can't actually reproduce the iOS zoom-on-focus behavior) -
it's a fast first pass to catch layout breaks before that manual check.

Usage:
    npm run dev &                 # or run it in another terminal
    pip install playwright && playwright install chromium
    python3 scripts/mobile-check.py [--base-url http://localhost:3000] [--out-dir /tmp/grove-mobile-check]

Screenshots are written to --out-dir for manual review against
UX-RULES.md; this script asserts only the one thing Chromium actually can
(input font-size >= 16px) and otherwise leaves judgment to the screenshots.
"""
import argparse
import base64
import json
import re
import sys
import tempfile
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


ADMIN_WHOAMI = {"me": {"student_id": "admin", "username": "admin", "role": "admin"}}

ADMIN_STUDENTS = {
    "students": [
        {
            "student_id": "asher", "username": "asher", "email": "asher@example.com",
            "role": "student", "claimed": True, "grade": "9", "interests": ["chess", "biology"],
            "avatar": "", "insights": [{"concept": "Photosynthesis", "at": "2026-09-10T12:00:00Z", "note": "Got there after a hint."}],
            "created_at": "2026-08-01T00:00:00Z", "updated_at": "2026-09-11T20:00:00Z",
            "groves": [{"id": "g1", "name": "Biology", "concepts": 5, "sessions": 8, "updated_at": "2026-09-11T20:00:00Z",
                        "items": [{"name": "Chlorophyll", "mastery": 78, "days": 4, "reviews": 4}]}],
            "concepts": 5, "sessions": 8, "flourishing": 2, "gettingThere": 2, "needsWork": 1, "lastActive": "2026-09-11T20:00:00Z",
        },
        {
            "student_id": "valerie", "username": "valerie", "email": "valerie@example.com",
            "role": "student", "claimed": True, "grade": "11", "interests": [],
            "avatar": "", "insights": [],
            "created_at": "2026-08-05T00:00:00Z", "updated_at": "2026-09-09T15:00:00Z",
            "groves": [], "concepts": 0, "sessions": 0, "flourishing": 0, "gettingThere": 0, "needsWork": 0,
            "lastActive": "2026-09-09T15:00:00Z",
        },
    ],
    "orphans": [],
}

ADMIN_STATS = {
    "students": 2, "claimed": 2, "groves": 1, "concepts": 5, "sessions": 8,
    "activeToday": 0, "activeWeek": 1, "activeMonth": 2, "newThisWeek": 0,
    "mastery": {"flourishing": 2, "gettingThere": 2, "needsWork": 1, "untouched": 0, "buckets": [0, 1, 1, 1, 2]},
    "struggling": [{"name": "Glucose", "mastery": 30, "reviews": 2}],
    "usage": {
        "today": {"calls": 3, "cost": 0.02}, "week": {"calls": 20, "cost": 0.15}, "month": {"calls": 80, "cost": 0.6},
        "failedCalls": 0, "byKind": {"tutor": {"calls": 60, "cost": 0.4}, "extract": {"calls": 20, "cost": 0.2}},
    },
}

ADMIN_SETTINGS = {
    "fixed_costs": [{"id": "supabase-pro", "name": "Supabase Pro org fee", "amount": 5.0, "group": "Infrastructure", "note": ""}],
    "price_per_month": 4,
    "tuning": {"model": "claude-sonnet-5", "effort": "low", "starting_trees": 7, "mastery_threshold": 1, "interest_analogies": True, "sample_grove": True},
    "changeLog": [{"setting": "starting_trees", "old_value": "7", "new_value": "5", "changed_by": "admin", "created_at": "2026-09-12T10:00:00Z"}],
}


def mock_admin_routes(page):
    page.route("**/api/admin/whoami", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ADMIN_WHOAMI)))
    page.route("**/api/admin/students", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ADMIN_STUDENTS)))
    page.route("**/api/admin/stats", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ADMIN_STATS)))
    page.route("**/api/admin/settings", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ADMIN_SETTINGS)))


# A 1x1 red JPEG, valid enough for the browser's <img>/canvas pipeline
# (fileToImage draws it to a canvas and re-encodes it) without needing a
# real photo or an image library in this environment.
TEST_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQ"
    "CgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ"
    "EBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAA"
    "AAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
)


def mock_signed_in(page, groves=None):
    """Simulates a signed-in student session (Stage 2's Play/AccountMenu
    checks need one; this sandbox has no real Supabase credentials). Mocks
    every network call the boot + a fresh-grove flow touches so nothing
    left unmocked throws a console error mid-test."""
    session_body = {
        "student": {"student_id": "midnight", "username": "midnight", "role": "student"},
        "profile": {"grade": "10", "snakeBest": 12},
        "insights": [],
        "groves": groves or [],
        "settings": {"starting_trees": 7, "mastery_threshold": 1, "interest_analogies": True, "sample_grove": True},
    }
    page.route("**/api/auth/session", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(session_body)))
    page.route("**/api/grove", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"id": "mock-grove-1", "concepts": []})))
    page.route("**/api/student", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True})))
    page.route("**/api/game", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"best": 12})))


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

            topic_input = page.get_by_placeholder("A topic, or paste a URL")
            topic_input.fill("Test topic")
            topic_input.press("Enter")
            page.wait_for_selector("text=Here's what I found", timeout=10000)
            page.screenshot(path=str(out_dir / f"confirm-{width}.png"), full_page=True)

            # The dashed "Add your own concept" card, opened inline.
            add_btn = page.get_by_text("+ Add your own concept")
            if add_btn.count():
                add_btn.click()
                page.screenshot(path=str(out_dir / f"confirm-add-{width}.png"), full_page=True)
                page.keyboard.press("Escape")

            # Plant button text is now a live count ("Plant 2 trees"); lands
            # on Home first (seedlings rising) and auto-advances into Tutor.
            page.get_by_role("button", name=re.compile(r"^Plant \d+ trees?$")).click()
            page.wait_for_selector("text=What is 2 + 2", timeout=10000)
            page.screenshot(path=str(out_dir / f"tutor-{width}.png"), full_page=True)

            # Snake only shows in AccountMenu for signed-in/legacy students
            # (guests get a plain "Sign in" button, no "Account" dropdown at
            # all) - only reachable with real Supabase credentials configured
            # (not this sandbox). Best-effort only.
            account_btn = page.get_by_role("button", name="Account")
            take_a_break = page.get_by_text("Take a break") if account_btn.count() else None
            if account_btn.count():
                account_btn.click()
            if take_a_break and take_a_break.count():
                take_a_break.click()
                page.wait_for_selector("text=Take a break", timeout=5000)
                page.screenshot(path=str(out_dir / f"play-{width}.png"), full_page=True)
            else:
                print(f"  [{width}px] Skipping Play screenshot: no signed-in session available (guest-only in this environment).")

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


def run_admin(base_url: str, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in WIDTHS:
            page = browser.new_page(viewport={"width": width, "height": HEIGHT})
            page.emulate_media(reduced_motion="reduce")
            mock_admin_routes(page)

            page.goto(f"{base_url}/admin", wait_until="networkidle")
            page.wait_for_selector("text=Right now", timeout=10000)
            page.screenshot(path=str(out_dir / f"admin-overview-{width}.png"), full_page=True)

            # Drawer: sidebar starts off-canvas under 768px, the menu button
            # opens it, a backdrop tap or a nav click closes it.
            menu_btn = page.get_by_role("button", name="Open menu")
            assert menu_btn.count(), f"no hamburger button visible at {width}px (drawer CSS breakpoint not applied?)"
            menu_btn.click()
            page.wait_for_timeout(300)  # let the .25s transform transition settle
            page.screenshot(path=str(out_dir / f"admin-drawer-open-{width}.png"), full_page=True)
            # Click a point guaranteed to be outside the 200px sidebar but
            # inside the full-viewport backdrop, at every width tested.
            page.mouse.click(width - 5, 50)
            page.wait_for_timeout(300)
            page.screenshot(path=str(out_dir / f"admin-drawer-closed-{width}.png"), full_page=True)

            # Users tab: reopen the drawer and navigate via the nav link,
            # which should close the drawer as a side effect of selection.
            menu_btn.click()
            page.wait_for_timeout(300)
            page.get_by_role("link", name=re.compile("Users")).click()
            page.wait_for_selector("text=Users (", timeout=10000)
            page.wait_for_timeout(300)  # let the drawer's close transition (triggered by selection) settle
            page.screenshot(path=str(out_dir / f"admin-users-{width}.png"), full_page=True)

            # Density toggle and a detail-panel expand, for a fuller Users
            # screenshot than the default state alone.
            compact_btn = page.get_by_role("button", name="Compact rows")
            if compact_btn.count():
                compact_btn.click()
                page.screenshot(path=str(out_dir / f"admin-users-compact-{width}.png"), full_page=True)

            page.close()
        browser.close()
    print(f"Admin screenshots written to {out_dir}")


def run_photo_review(base_url: str, out_dir: Path):
    """Camera and library photos both land on the new review screen before
    extraction (Stage 2). Exercises the real file input end to end: pick,
    "Add another page" past the 6-page cap, remove, Extract."""
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        jpeg_bytes = base64.b64decode(TEST_JPEG_B64)
        files = []
        for i in range(6):
            fp = Path(tmp) / f"p{i}.jpg"
            fp.write_bytes(jpeg_bytes)
            files.append(str(fp))

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 320, "height": HEIGHT})
            page.emulate_media(reduced_motion="reduce")
            page.route("**/api/anthropic", mock_anthropic)
            page.goto(base_url, wait_until="networkidle")
            guest_btn = page.get_by_text("Continue as a guest")
            if guest_btn.count():
                guest_btn.click()

            page.get_by_text("Share your work").click()
            page.locator('input[type="file"]').set_input_files(files[:5])
            page.wait_for_selector("text=Review your pages", timeout=10000)
            assert page.get_by_text("5 pages").count(), "expected '5 pages' after picking 5"

            with page.expect_event("filechooser") as fc_info:
                page.get_by_text("Add another page").click()
            fc_info.value.set_files(files[5:6])
            page.wait_for_timeout(300)
            assert page.get_by_text("6 pages").count(), "expected '6 pages' after adding a 6th"
            assert page.get_by_text("6 of 6").count(), "expected the '6 of 6' cap label once full"
            page.screenshot(path=str(out_dir / "photoreview-320-full.png"), full_page=True)

            page.get_by_label(re.compile(r"^Remove page")).first.click()
            page.wait_for_timeout(200)
            assert page.get_by_text("5 pages").count(), "expected '5 pages' after removing one"

            page.get_by_role("button", name="Extract").click()
            page.wait_for_selector("text=Here's what I found", timeout=10000)

            page.close()
            browser.close()
    print(f"Photo-review screenshots written to {out_dir}")


def run_play(base_url: str, out_dir: Path):
    """Snake's start/pause/restart flow (Stage 2), via a mocked signed-in
    session - Play is account-menu-only and this sandbox has no real
    Supabase credentials to reach it otherwise."""
    out_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in WIDTHS:
            page = browser.new_page(viewport={"width": width, "height": HEIGHT})
            page.emulate_media(reduced_motion="reduce")
            mock_signed_in(page)
            page.goto(base_url, wait_until="networkidle")
            page.wait_for_timeout(300)

            page.get_by_role("button", name="Account").click()
            page.get_by_text("Take a break").click()
            page.wait_for_selector("text=Take a break", timeout=5000)  # Play's own heading, not the menu item
            page.wait_for_selector("text=Best 12", timeout=5000)
            page.screenshot(path=str(out_dir / f"play-start-{width}.png"), full_page=True)

            page.get_by_role("button", name="Play").click()
            page.wait_for_selector("text=Pause", timeout=5000)
            page.screenshot(path=str(out_dir / f"play-playing-{width}.png"), full_page=True)

            page.get_by_role("button", name="Pause").click()
            page.wait_for_selector("text=Resume", timeout=5000)
            page.screenshot(path=str(out_dir / f"play-paused-{width}.png"), full_page=True)

            page.get_by_role("button", name="Restart").click()
            page.wait_for_selector("text=Pause", timeout=5000)  # back to playing

            page.close()
        browser.close()
    print(f"Play screenshots written to {out_dir}")


def run_header_long_name(base_url: str, out_dir: Path):
    """Grove header name at 320px with a moderately long name and the
    account menu open (Stage 2 grove-view item), via a mocked signed-in
    session so AccountMenu renders its real dropdown, not a guest "Sign
    in" pill."""
    out_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 320, "height": HEIGHT})
        page.emulate_media(reduced_motion="reduce")
        mock_signed_in(page)  # empty groves - avoids switcher/auto-open, same topic-input path run()/run_photo_review() already use for guests
        page.route("**/api/anthropic", lambda r: r.fulfill(
            status=200, content_type="application/json",
            body=anthropic_body({"subject": "Music theory", "concepts": [{"name": "Intervals", "note": "n"}]}),
        ))
        page.goto(base_url, wait_until="networkidle")
        topic_input = page.get_by_placeholder("A topic, or paste a URL")
        topic_input.fill("Music theory")
        topic_input.press("Enter")
        page.wait_for_selector("text=Here's what I found", timeout=10000)
        page.get_by_role("button", name=re.compile(r"^Plant \d+ trees?$")).click()
        page.wait_for_timeout(1200)
        page.get_by_text("Back to my grove").click()
        page.wait_for_selector(".groveHeaderName:has-text('Music theory')", timeout=10000)

        name_box = page.evaluate("""
        () => {
          const el = document.querySelector('.groveHeaderName');
          const btn = el.closest('button');
          const nr = el.getBoundingClientRect(), br = btn.getBoundingClientRect();
          return { text: el.innerText, overflowing: Math.round(nr.right) > Math.round(br.right) + 1 };
        }
        """)
        assert not name_box["overflowing"], f"grove name overflows its header button: {name_box}"
        assert name_box["text"] == "Music theory", f"expected the full name to render, got {name_box['text']!r}"

        page.get_by_role("button", name="Account").click()
        page.wait_for_timeout(200)
        page.screenshot(path=str(out_dir / "home-header-longname-menu-320.png"), full_page=True)
        page.close()
        browser.close()
    print(f"Header/long-name screenshot written to {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3000")
    parser.add_argument("--out-dir", default="/tmp/grove-mobile-check")
    args = parser.parse_args()
    try:
        run(args.base_url, Path(args.out_dir))
        run_admin(args.base_url, Path(args.out_dir))
        run_photo_review(args.base_url, Path(args.out_dir))
        run_play(args.base_url, Path(args.out_dir))
        run_header_long_name(args.base_url, Path(args.out_dir))
    except Exception as exc:  # surface a clear failure instead of a bare traceback
        print(f"mobile-check failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
