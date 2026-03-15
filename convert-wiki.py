from pathlib import Path
import re

def transform(text: str) -> str:
    # <small> tags
    text = text.replace("<small>", "~")
    text = text.replace("</small>", "~")
    
    # <abbr> tags
    text = text.replace("<abbr>", "")
    text = text.replace("</abbr>", "")

    return text

def main() -> None:
    for path in Path(".").rglob("*.wiki"):
        original = path.read_text(encoding="utf-8")
        updated = transform(original)

        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print(f"Updated: {path}")

if __name__ == "__main__":
    main()