#!/usr/bin/env python3
"""Import the official Naruto Mythos TCG card list into public/data/cards.json.

Reads the public JSON feed behind https://www.narutotcgmythos.com/card-gallery, keeps one
entry per card (its base printing), saves a small WebP thumbnail per card in public/cards/,
and keeps the simulator's placeholder Leaders (Mythos has no Leader cards).

Usage (from apps/simulator):
    python3 scripts/import_official_cards.py              # download feed + images
    python3 scripts/import_official_cards.py --feed f.json --images-dir dir/   # offline
Requires Pillow.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import re
import time
import urllib.request
from datetime import date
from pathlib import Path

from PIL import Image

FEED_URL = "https://services.agenziamarketingcarpi.it/proxy/naruto/proxy.php?lang=en"
GALLERY_URL = "https://www.narutotcgmythos.com/card-gallery"
UA = "Mozilla/5.0 (PlayMythos fan simulator importer)"
THUMB_WIDTH = 360

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data" / "cards.json"
THUMBS = ROOT / "public" / "cards"

SETS = {"Set 1: Konoha Shidō": ("KS", "Konoha Shidō"), "Set 2: Shinobi Shiren": ("SS", "Shinobi Shiren")}
TYPES = {"Character": "character", "Attachment": "item", "Mission": "mission"}
RARITY = {
    "C": "common",
    "UC": "uncommon",
    "R": "rare",
    "RA": "rare",
    "Mission": "common",
    "S": "secret-rare",
    "SV": "secret-rare",
    "L": "secret-rare",
    "M": "super-rare",
    "SP": "super-rare",
    "Shinobi": "super-rare",
    "CHIBI": "promo",
    "POP": "promo",
}
BASE_RARITIES = {"C", "UC", "R", "Mission"}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": GALLERY_URL})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read()


def clean_text(raw: str) -> str:
    """Official HTML text -> one ability per line in the simulator's grammar."""
    text = re.sub(r"<br\s*/?>", "\n", raw or "")
    text = html.unescape(re.sub(r"<[^>]+>", "", text)).replace("’", "'")
    lines = []
    for line in text.split("\n"):
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        # The engine already enforces "attach to a friendly face-up character".
        if re.fullmatch(r"☍ Attach to a friendly (non-hidden )?character\.?", line):
            continue
        line = re.sub(r"^(MAIN|AMBUSH|UPGRADE|SCORE)\s*:?\s*⧗\s*", "CONTINUOUS: ", line)
        line = re.sub(r"^(MAIN|AMBUSH|UPGRADE|SCORE)\s*:?\s*↯\s*", r"\1: ", line)
        line = re.sub(r"^⧗\s*", "CONTINUOUS: ", line)
        line = re.sub(r"^☍\s*", "ATTACH: ", line)
        lines.append(line)
    return "\n".join(lines)


def number_of(card_id: str) -> str:
    m = re.match(r"MSS\s*0?(\d+)", card_id)
    if m:
        return f"MSS{int(m.group(1)):02d}"
    num, _, rest = card_id.partition("/")
    suffix = re.sub(r"[^A-Za-z]", "", rest)  # e.g. "147/140 V" -> "147V"
    return num.strip().zfill(3) + suffix.upper()


def base_printing_key(c: dict) -> tuple:
    return (
        c.get("Rarity") not in BASE_RARITIES,
        bool(c.get("Variant")) and c.get("Variant") != "Normale",
        bool(c.get("Stamp")),
        c.get("Edition") != "1st edition",
        c.get("CardVersion") != "V1",
        c.get("Uid", 0),
    )


def to_int(v) -> int:
    try:
        return max(0, int(v))
    except (TypeError, ValueError):
        return 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed", help="local copy of the feed JSON")
    ap.add_argument("--images-dir", help="directory with already-downloaded originals, named <id>.webp")
    args = ap.parse_args()

    feed = json.loads(Path(args.feed).read_text("utf8") if args.feed else fetch(FEED_URL))
    printings = feed[0]["Cards"]

    groups: dict[tuple, list] = {}
    for c in printings:
        if c.get("Set") in SETS and c.get("CardType") in TYPES:
            groups.setdefault((c["Set"], c["ID"]), []).append(c)

    THUMBS.mkdir(parents=True, exist_ok=True)
    cards = []
    for (set_name, raw_id), group in sorted(groups.items(), key=lambda kv: (SETS[kv[0][0]][0], number_of(kv[0][1]))):
        base = sorted(group, key=base_printing_key)[0]
        code, set_label = SETS[set_name]
        cid = f"{code}-{number_of(raw_id)}"
        ctype = TYPES[base["CardType"]]
        text = clean_text(base.get("Text", ""))
        power = to_int(base.get("Power"))
        if ctype == "item" and power:
            text = f"EQUIP: +{power} Power.\n{text}".strip()
            power = 0

        thumb = THUMBS / f"{cid}.webp"
        if not thumb.exists() and base.get("Image"):
            local = Path(args.images_dir) / f"{cid}.webp" if args.images_dir else None
            data = local.read_bytes() if local and local.exists() else fetch(base["Image"])
            if not local:
                time.sleep(0.3)
            img = Image.open(io.BytesIO(data)).convert("RGB")
            img.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 2), Image.LANCZOS)
            img.save(thumb, "WEBP", quality=82, method=6)

        keywords = [k for k in (base.get("Keyword1"), base.get("Keyword2")) if k]
        card = {
            "id": cid,
            "name": base["Title"].strip(),
            **({"title": base["Version"].strip()} if base.get("Version") else {}),
            "set": code,
            "setName": set_label,
            "number": raw_id.replace("MSS ", "MSS"),
            "type": ctype,
            "rarity": RARITY.get(base.get("Rarity", ""), "common"),
            "element": "neutral",
            **({"village": base["Group"]} if base.get("Group") and base["Group"] != "Mission" else {}),
            "keywords": keywords,
            "cost": to_int(base.get("Chakra")),
            "power": power,
            **({"points": to_int(base.get("Points"))} if ctype == "mission" else {}),
            "text": text,
            "imageUrl": f"/cards/{cid}.webp" if thumb.exists() else None,
            "sourceUrl": GALLERY_URL,
        }
        cards.append(card)

    existing = json.loads(DATA.read_text("utf8")) if DATA.exists() else {"cards": []}
    leaders = [c for c in existing.get("cards", []) if c.get("type") == "leader"]

    out = {
        "$schema": "./cards.schema.json",
        "format": "naruto-tcg-simulator/cards@1",
        "generatedAt": date.today().isoformat(),
        "source": "Official Naruto Mythos TCG card gallery (narutotcgmythos.com). Card names, text and images © their respective owners. "
        "Leaders (set SIM) are simulator placeholders: Mythos has no Leader cards.",
        "cards": leaders + cards,
    }
    DATA.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", "utf8")
    print(f"wrote {len(cards)} official cards + {len(leaders)} placeholder leaders; thumbnails in {THUMBS}")


if __name__ == "__main__":
    main()
