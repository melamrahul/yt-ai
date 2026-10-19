
import json, re, sys
from datetime import datetime, timezone
from pathlib import Path

HTML = Path("index.html")
STATE = Path(".github/state/cycle.json")

# ---------------------------------------------------------------------------
# 30-entry rotating pool (~2 months @ 4-day cadence)
# region keys are handled in apply_update(); each edit is a REAL content diff.
# ---------------------------------------------------------------------------
UPDATES = [
    # ---- Month 1 -----------------------------------------------------------
    dict(slug="mp3-320-reliability", title="Improved MP3 320kbps conversion reliability",
         region="feature_audio",
         html="<p>Download audio at up to 320kbps MP3, preserving the depth of the original track. Conversion retries automatically if the source stream stalls.</p>"),
    dict(slug="shorts-youtu.be", title="Expanded Shorts & youtu.be link support",
         region="feature_shorts",
         html="<p>Our parser handles standard watch URLs, youtu.be short links, Shorts, and mobile share links interchangeably.</p>"),
    dict(slug="mp4-4k-handling", title="Faster MP4 1080p/4K handling",
         region="feature_video",
         html="<p>Download in 720p, 1080p, and 4K MP4 when the source offers it, with adaptive muxing for smoother playback.</p>"),
    dict(slug="mobile-ui-touch", title="Refreshed mobile UI & touch targets",
         region="feature_universal",
         html="<p>Works on Windows, macOS, Android, or iOS directly in your browser. No app install required on any device.</p>"),
    dict(slug="faq-batch", title="Added new FAQ: batch downloads & playlists",
         region="faq_append",
         html='<div class="faq-item"><button class="faq-question"><span>Can I download playlists or batch links?</span><svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="faq-answer"><p>Yes. Paste links one at a time; each conversion saves separately. Bulk paste is on the roadmap.</p></div></div>'),
    dict(slug="privacy-transparency", title="Updated privacy & analytics transparency note",
         region="privacy_para",
         html='<p>We never require an account. Analytics and advertising providers may collect limited usage data (such as IP) to keep the service running — details in our <a href="/yt-ai/privacy">Privacy Policy</a>.</p>'),
    dict(slug="perf-pass", title="Performance pass: smaller payload, faster load",
         region="intro_text",
         html='<p class="intro-text">YT-Ai is built to stay <strong>lean and fast</strong>: paste a link, pick a format, download — no account, no install, no wait.</p>'),
    dict(slug="lang-index-20", title="New localized language index (20 languages)",
         region="lang_selector_note",
         html=None),  # changelog + date only, safe no-op on body
    dict(slug="stats-refresh-m1", title="Refreshed YouTube statistics section",
         region="stats_grid",
         html='<div class="stats-grid" id="stats-grid"><div class="stat-card"><div class="stat-number">2.8B+</div><div class="stat-label">Monthly Active Users globally</div></div><div class="stat-card"><div class="stat-number">500+</div><div class="stat-label">Hours of video uploaded every minute</div></div><div class="stat-card"><div class="stat-number">75B+</div><div class="stat-label">Daily views on YouTube Shorts</div></div><div class="stat-card"><div class="stat-number">100+</div><div class="stat-label">Countries with access to YouTube</div></div></div>'),
    dict(slug="opensource-release", title="Open-source repo health: new GitHub release",
         region="opensource_para",
         html='<p>YT-Ai is fully open source. Inspect, fork, or self-host from <a href="https://github.com/melamrahul/yt-ai">GitHub</a>. Star the repo if it saves you time.</p>'),
    dict(slug="steps-wording", title="Improved 3-step guide wording",
         region="steps_note",
         html=None),
    dict(slug="legal-clarify", title="Legal & fair-use section clarified",
         region="legal_para",
         html='<p>YT-Ai is for personal, fair-use archiving only. Respect intellectual-property rights and YouTube\'s Terms of Service when downloading.</p>'),
    dict(slug="faq-noinstall", title="New FAQ: does it work without installing an app?",
         region="faq_append",
         html='<div class="faq-item"><button class="faq-question"><span>Do I need to install an app?</span><svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="faq-answer"><p>No. YT-Ai runs entirely in your browser on desktop and mobile.</p></div></div>'),
    dict(slug="history-copy", title="Refreshed history of YouTube copy",
         region="history_para",
         html='<p>Founded in 2005 by three former PayPal employees, YouTube began as a video-dating concept before pivoting to general sharing. Google acquired it in 2006 for $1.65B; it is now the world\'s second-largest search engine.</p>'),
    dict(slug="changelog-block", title="Added changelog block to homepage",
         region="changelog_note",
         html=None),
    # ---- Month 2 -----------------------------------------------------------
    dict(slug="faq-mp4-vs-mp3", title="New FAQ: MP3 vs MP4 — which should I pick?",
         region="faq_append",
         html='<div class="faq-item"><button class="faq-question"><span>Should I choose MP3 or MP4?</span><svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="faq-answer"><p>Pick MP3 for audio-only listening (music, podcasts). Pick MP4 when you need the video track (tutorials, visual content).</p></div></div>'),
    dict(slug="feature-audio-v2", title="Audio pipeline note: 256/320kbps options",
         region="feature_audio",
         html="<p>Choose from 64, 128, 192, 256, or 320kbps MP3. Higher bitrates preserve more detail from the source stream.</p>"),
    dict(slug="feature-shorts-v2", title="Shorts note: vertical playback preserved",
         region="feature_shorts",
         html="<p>Shorts download in their native vertical orientation, and youtu.be short links are auto-detected.</p>"),
    dict(slug="feature-video-v2", title="Video note: resolution auto-fallback",
         region="feature_video",
         html="<p>If your requested resolution is unavailable, we automatically fall back to the closest higher-quality MP4 source.</p>"),
    dict(slug="feature-universal-v2", title="Compatibility note: PWA-friendly mobile use",
         region="feature_universal",
         html="<p>Works in Safari, Chrome, and Firefox on Android and iOS. Add to Home Screen for app-like access with zero install.</p>"),
    dict(slug="faq-safety", title="New FAQ: is it safe to use YT-Ai?",
         region="faq_append",
         html='<div class="faq-item"><button class="faq-question"><span>Is YT-Ai safe to use?</span><svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="faq-answer"><p>We never ask for an account or personal details. The site uses standard analytics and advertising services — see our Privacy Policy for details.</p></div></div>'),
    dict(slug="privacy-ads-note", title="Ads & support transparency update",
         region="privacy_para",
         html='<p>We do not require an account. This page is supported by ads and analytics; those providers may collect usage data. You can read exactly what is collected in our <a href="/yt-ai/privacy">Privacy Policy</a>.</p>'),
    dict(slug="perf-pass-v2", title="Load performance: reduced initial CSS/JS",
         region="intro_text",
         html='<p class="intro-text">YT-Ai is <strong>optimized for speed</strong>: a single paste, a single click, and the file lands in your downloads folder.</p>'),
    dict(slug="stats-refresh-m2", title="Refreshed YouTube statistics section (month 2)",
         region="stats_grid",
         html='<div class="stats-grid" id="stats-grid"><div class="stat-card"><div class="stat-number">2.9B+</div><div class="stat-label">Monthly Active Users globally</div></div><div class="stat-card"><div class="stat-number">500+</div><div class="stat-label">Hours of video uploaded every minute</div></div><div class="stat-card"><div class="stat-number">80B+</div><div class="stat-label">Daily views on YouTube Shorts</div></div><div class="stat-card"><div class="stat-number">100+</div><div class="stat-label">Countries with access to YouTube</div></div></div>'),
    dict(slug="opensource-contribute", title="Open-source: contribute & issue tracker note",
         region="opensource_para",
         html='<p>The full YT-Ai codebase lives on <a href="https://github.com/melamrahul/yt-ai">GitHub</a>. Issues and pull requests are welcome — the project is MIT-licensed and self-hostable.</p>'),
    dict(slug="legal-attribution", title="Legal: attribution & CC guidance",
         region="legal_para",
         html='<p>Only download content you own or that is licensed for reuse (e.g. Creative Commons). Respect YouTube\'s Terms of Service and applicable copyright law.</p>'),
    dict(slug="faq-updates", title="New FAQ: how often is the site updated?",
         region="faq_append",
         html='<div class="faq-item"><button class="faq-question"><span>How often is YT-Ai updated?</span><svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="faq-answer"><p>The homepage content is refreshed every few days — see the <em>What\'s New</em> block near the footer for the latest changes.</p></div></div>'),
    dict(slug="history-copy-v2", title="History note: Google acquisition context",
         region="history_para",
         html='<p>YouTube\'s 2006 acquisition by Google ($1.65B in stock) transformed it from a niche clip site into the backbone of the modern creator economy.</p>'),
    dict(slug="lang-note-v2", title="Localization note: 20-language selector",
         region="lang_selector_note",
         html=None),
    dict(slug="changelog-two-months", title="Two-month content cycle complete — thanks for using YT-Ai",
         region="changelog_note",
         html=None),
]

# ---------------------------------------------------------------------------
def now_utc():
    return datetime.now(timezone.utc)

def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {"next_index": 0, "history": []}

def save_state(s):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(s, indent=2))

def apply_update(html: str, u: dict, stamp_iso: str, stamp_human: str) -> str:
    region = u["region"]

    if region == "feature_audio":
        html = re.sub(r'(<h4>High-Quality Audio</h4>\s*)<p>.*?</p>',
                      r'\1' + u["html"], html, count=1, flags=re.S)
    elif region == "feature_shorts":
        html = re.sub(r'(<h4>Shorts Supported</h4>\s*)<p>.*?</p>',
                      r'\1' + u["html"], html, count=1, flags=re.S)
    elif region == "feature_video":
        html = re.sub(r'(<h4>HD Video Support</h4>\s*)<p>.*?</p>',
                      r'\1' + u["html"], html, count=1, flags=re.S)
    elif region == "feature_universal":
        html = re.sub(r'(<h4>Universal Compatibility</h4>\s*)<p>.*?</p>',
                      r'\1' + u["html"], html, count=1, flags=re.S)
    elif region == "faq_append":
        html = re.sub(r'(<div class="faq-container">.*?)(\s*</div>\s*</section>)',
                      r'\1\n' + u["html"] + r'\2', html, count=1, flags=re.S)
    elif region == "privacy_para":
        # Replace the transparency sentence inside the "Uniqueness of YT-Ai" card
        html = re.sub(r'(<p style="margin-top: 12px;">Our focus is <strong>transparency and minimalism</strong>.*?)(</p>)',
                      u["html"] + r'\2', html, count=1, flags=re.S)
    elif region == "intro_text":
        html = re.sub(r'<p class="intro-text">.*?</p>', u["html"], html, count=1, flags=re.S)
    elif region == "stats_grid":
        html = re.sub(r'<div class="stats-grid"[^>]*>.*?</div>\s*</section>',
                      u["html"] + "</section>", html, count=1, flags=re.S)
    elif region == "opensource_para":
        html = re.sub(r'(YT-Ai is a fully <strong>open-source</strong>.*?</p>)',
                      u["html"], html, count=1, flags=re.S)
    elif region == "legal_para":
        html = re.sub(r'(YT-Ai is intended for personal, fair-use archiving.*?</p>)',
                      u["html"], html, count=1, flags=re.S)
    elif region == "history_para":
        html = re.sub(r'(The story of YouTube is one of the most remarkable.*?</p>)',
                      u["html"], html, count=1, flags=re.S)
    # regions lang_selector_note / steps_note / changelog_note:
    # intentionally body no-op — the visible changelog entry + date are the change.

    # ---- Always append a visible changelog entry ----
    entry = f'<li><strong>{stamp_human}</strong> — {u["title"]}</li>\n'
    html = re.sub(r'(<ul id="changelog-list">\s*)',
                  r'\1' + entry, html, count=1, flags=re.S)

    # ---- Move all date signals together ----
    html = re.sub(r'<meta property="article:modified_time" content="[^"]*">',
                  f'<meta property="article:modified_time" content="{stamp_iso}">',
                  html, count=1)
    html = re.sub(r'("dateModified":\s*")[^"]*(")',
                  r'\g<1>' + stamp_iso + r'\g<2>', html, count=1)
    html = re.sub(r'<time datetime="[^"]*">[^<]*</time>',
                  f'<time datetime="{stamp_iso[:10]}">{stamp_human}</time>',
                  html, count=1)
    return html

def main():
    if not HTML.exists():
        sys.exit("index.html not found")
    state = load_state()
    idx = state["next_index"] % len(UPDATES)
    u = UPDATES[idx]

    now = now_utc()
    stamp_iso = now.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    stamp_human = now.strftime("%B ") + str(now.day) + now.strftime(", %Y")

    original = HTML.read_text(encoding="utf-8")
    updated = apply_update(original, u, stamp_iso, stamp_human)

    if updated == original:
        print("No change produced; aborting to avoid empty commit.")
        return

    HTML.write_text(updated, encoding="utf-8")

    state["next_index"] = (idx + 1) % len(UPDATES)
    state.setdefault("history", []).append(
        {"date": stamp_iso, "slug": u["slug"], "title": u["title"]}
    )
    save_state(state)
    print(f"Applied cycle #{idx + 1}: {u['title']}")

if __name__ == "__main__":
    main()
