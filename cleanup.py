import shutil
from pathlib import Path

# 1. Define the languages you want to KEEP.
# For the FASTEST SEO recovery, keep ONLY "en".
# Add "es" or "hi" ONLY if you have 100% unique, human-translated content for them.
LANGUAGES_TO_KEEP = {"en"}

# 2. The list of all language folders you previously created
ALL_LANGUAGE_FOLDERS = {
    "ae", "ar", "au", "bh", "ca", "de", "en", "es", "eu",
    "fr", "gb", "hi", "id", "it", "ja", "jo", "ko", "kw",
    "ms", "nl", "om", "pl", "pt", "qa", "ru", "sg", "th",
    "tr", "us", "vi", "zh"
}

deleted_count = 0

# 3. Scan root directory and delete unwanted folders
for item in Path(".").iterdir():
    if item.is_dir() and item.name in ALL_LANGUAGE_FOLDERS:
        if item.name not in LANGUAGES_TO_KEEP:
            print(f"🗑️ Deleting unwanted language folder: '{item.name}'")
            shutil.rmtree(item)
            deleted_count += 1
        else:
            print(f"✅ Keeping essential language folder: '{item.name}'")

print("----------------------------------------")
print(f"Cleanup Complete: Deleted {deleted_count} folders.")
print(f"Remaining language folders: {', '.join(LANGUAGES_TO_KEEP)}")
print("----------------------------------------")

