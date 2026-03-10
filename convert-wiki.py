from pathlib import Path
import re

def transform(text: str) -> str:
    # Headings
    text = re.sub(r"^====\s*(.*?)\s*====$", r"#### \1", text, flags=re.MULTILINE)
    text = re.sub(r"^===\s*(.*?)\s*===$", r"### \1", text, flags=re.MULTILINE)
    text = re.sub(r"^==\s*(.*?)\s*==$", r"## \1", text, flags=re.MULTILINE)

    # <small> tags
    text = text.replace("<small>", "~")
    text = text.replace("</small>", "~")

    # Wiki-style external links: [https://example.com label]
    text = re.sub(
        r"\[(https?://[^\s\]]+)\s+([^\]]+)\]",
        r"[\2](\1)",
        text
    )

    # Wiki-style emphasis
    text = text.replace("'''''", "***")
    text = text.replace("'''", "**")
    text = text.replace("''", "*")

    return text

def main() -> None:
    for path in Path(".").rglob("*.md"):
        original = path.read_text(encoding="utf-8")
        updated = transform(original)

        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print(f"Updated: {path}")

if __name__ == "__main__":
    main()