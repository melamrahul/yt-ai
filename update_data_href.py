import re
from pathlib import Path

# Pattern to find <ul> tags containing "lang-menu" in the class attribute
# Uses non-greedy (.*?) to handle multiple lang-menu blocks safely
ul_pattern = re.compile(
    r'(<ul\b[^>]*\bclass=["\'][^"\']*lang-menu[^"\']*["\'][^>]*>)(.*?)(</ul>)',
    re.IGNORECASE | re.DOTALL
)

def process_file(file):
    try:
        text = file.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return False

    def replace_ul(match):
        prefix = match.group(1)
        content = match.group(2)
        suffix = match.group(3)
        
        def replace_href(href_match):
            quote = href_match.group(1)
            url = href_match.group(2)
            # Add trailing slash if it doesn't already have one
            if not url.endswith('/'):
                return f'data-href={quote}{url}/{quote}'
            return href_match.group(0)
            
        # Only replace data-href attributes inside this specific ul content
        new_content = re.sub(
            r'data-href=(["\'])([^"\']*)\1', 
            replace_href, 
            content, 
            flags=re.IGNORECASE
        )
        return prefix + new_content + suffix

    updated_text = ul_pattern.sub(replace_ul, text)
    
    if updated_text != text:
        file.write_text(updated_text, encoding="utf-8")
        return True
    return False

total_updated = 0
files_checked = 0

# Traverse all files in the repository
for file in Path(".").rglob("*"):
    if not file.is_file():
        continue
    # Only process HTML files
    if file.suffix.lower() not in {".html", ".htm"}:
        continue
    
    files_checked += 1
    if process_file(file):
        total_updated += 1
        print(f"Updated: {file}")

print("----------------------------------------")
print(f"Files checked: {files_checked}")
print(f"Updated files: {total_updated}")
print("----------------------------------------")

