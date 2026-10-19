# .github/scripts/update.py
# Adds ONE real, pre-written guide section per run. Never wraps around,
# never touches dates unless content actually changed.
import json, re, sys
from datetime import datetime, timezone
from pathlib import Path

HTML = Path("index.html")
STATE = Path(".github/state/cycle.json")
QUEUE = Path(".github/state/queue.json")
ANCHOR = '<section class="support-card" id="changelog">'
LIST = '<ul id="changelog-list">'

def main():
    if not HTML.exists():
        sys.exit("index.html not found")
    state = json.loads(STATE.read_text()) if STATE.exists() else {"next_index": 0, "history": []}
    queue = json.loads(QUEUE.read_text(encoding="utf-8"))

    with open(HTML, encoding="utf-8", newline="") as f:
        html = f.read()
    if ANCHOR not in html or LIST not in html:
        sys.exit("Changelog section not found in index.html")

    idx = state["next_index"]
    while idx < len(queue) and f'data-update-id="{queue[idx]["id"]}"' in html:
        idx += 1
    if idx >= len(queue):
        print("Queue empty. Add new items to .github/state/queue.json. No changes made.")
        return
    u = queue[idx]

    now = datetime.now(timezone.utc)
    iso = now.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    human = f"{now.strftime('%B')} {now.day}, {now.year}"

    section = (f'<section class="support-card" data-update-id="{u["id"]}">'
               f'<div class="support-top"><h3>{u["title"]}</h3></div>{u["html"]}</section>\n')
    html = html.replace(ANCHOR, section + ANCHOR, 1)

    entry = f'<li><strong>{human}</strong> — Added guide: {u["title"]}</li>\n'
    html = re.sub(re.escape(LIST), lambda m: m.group(0) + "\n" + entry, html, count=1)

    html = re.sub(r'(<meta property="article:modified_time" content=")[^"]*(">)',
                  lambda m: m.group(1) + iso + m.group(2), html, count=1)
    html = re.sub(r'("dateModified":\s*")[^"]*(")',
                  lambda m: m.group(1) + iso[:10] + m.group(2), html, count=1)
    html = re.sub(r'(<time datetime=")[^"]*(">)[^<]*(</time>)',
                  lambda m: m.group(1) + iso[:10] + m.group(2) + human + m.group(3), html, count=1)

    with open(HTML, "w", encoding="utf-8", newline="") as f:
        f.write(html)

    state["next_index"] = idx + 1
    state.setdefault("history", []).append({"date": iso, "id": u["id"], "title": u["title"]})
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    Path("/tmp/commit_msg").write_text(f"content: add guide — {u['title']}", encoding="utf-8")
    print(f"Published: {u['title']}")

if __name__ == "__main__":
    main()
