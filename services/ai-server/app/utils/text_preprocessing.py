import re


def clean_text(text: str | None) -> str:
    if text is None:
        return ""

    normalized = str(text).lower().strip()
    normalized = re.sub(r"\s+", " ", normalized)

    return normalized
