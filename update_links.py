import re
from pathlib import Path

languages = [
    "ae", "ar", "au", "bh", "ca", "de", "en", "es", "eu",
    "fr", "gb", "hi", "id", "it", "ja", "jo", "ko", "kw",
    "ms", "nl", "om", "pl", "pt", "qa", "ru", "sg", "th",
    "tr", "us", "vi", "zh"
]

root_files_to_ignore = {
    "index.html",
    "youtube-to-mp3-converter-github.html",
    "youtube-video-to-mp3-converter-github.html"
}

# Match hreflang tags (order-independent using lookaheads)
hreflang_pattern = re.compile(
    r'(<link\b(?=[^>]*\brel\s*=\s*["\']alternate["\'])'
    r'(?=[^>]*\bhreflang\s*=\s*["\'][^"\']+["\'])'
    r'[^>]*\bhref\s*=\s*["\'])([^"\']+)(["\'][^>]*>)',
    re.IGNORECASE
)

# Match canonical tags (order-independent)
canonical_pattern = re.compile(
    r'(<link\b(?=[^>]*\brel\s*=\s*["\']canonical["\'])'
    r'[^>]*\bhref\s*=\s*["\'])([^"\']+)(["\'][^>]*>)',
    re.IGNORECASE
)

def add_trailing_slash(url):
    match = re.match(r'^([^?#]*)(.*)$', url)
    path = match.group(1)
    suffix = match.group(2)

    if not path.startswith(("http://", "https://")):
        return url

    if not path.endswith("/"):
        path += "/"

    return path + suffix

total_updated = 0
files_checked = 0

def process_file(file):
    global total_updated, files_checked
    files_checked += 1
    try:
        text = file.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return

    original = text

    def replace_hreflang(match):
        old_url = match.group(2)
        new_url = add_trailing_slash(old_url)
        if old_url != new_url:
            print(f"  hreflang: {old_url} -> {new_url}")
        return match.group(1) + new_url + match.group(3)

    def replace_canonical(match):
        old_url = match.group(2)
        new_url = add_trailing_slash(old_url)
        if old_url != new_url:
            print(f"  canonical: {old_url} -> {new_url}")
        return match.group(1) + new_url + match.group(3)

    text = hreflang_pattern.sub(replace_hreflang, text)
    text = canonical_pattern.sub(replace_canonical, text)

    if text != original:
        file.write_text(text, encoding="utf-8")
        total_updated += 1
        print(f"Updated: {file}")

# 1. Process language folders
for lang in languages:
    directory = Path(lang)
    if not directory.exists():
        continue
    
    for file in directory.rglob("*"):
        if not file.is_file():
            continue
        if file.suffix.lower() not in {".html", ".htm", ".xml", ".svg"}:
            continue
        
        # Only ignore specific files if they are in the ROOT directory
        if file.parent == Path(".") and file.name in root_files_to_ignore:
            continue
            
        process_file(file)

# 2. Process root directory (ignoring the 3 specific files)
root_dir = Path(".")
for file in root_dir.iterdir():
    if not file.is_file():
        continue
    if file.suffix.lower() not in {".html", ".htm", ".xml", ".svg"}:
        continue
    
    if file.name in root_files_to_ignore:
        print(f"Ignoring root file: {file.name}")
        continue
        
    process_file(file)

print("----------------------------------------")
print(f"Files checked: {files_checked}")
print(f"Updated files: {total_updated}")
print("----------------------------------------")

