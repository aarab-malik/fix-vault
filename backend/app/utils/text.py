import re


def slugify_stop_code(title: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", title.strip().upper())
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug[:40] or "UNKNOWN_FAULT"
