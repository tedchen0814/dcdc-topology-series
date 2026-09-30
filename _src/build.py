"""Build the DC-DC topology pages from template.html + <topo>.part.html.

Usage: python build.py
  - ../<STEM>_動畫說明.html : single-file pages published as Claude Artifacts
    (nav links come from urls.json; a topology without a URL shows as "準備中")
  - ../_site/                : static site for Vercel — index.html + one page per
    topology, sharing assets/series.css, assets/common.js and assets/engine.js
"""
import json
import re
from pathlib import Path

SRC = Path(__file__).parent
OUT = SRC.parent
SITE = OUT / "_site"
SERIES = [  # (key, number, nav name, zh, artifact file stem, site file)
    ("boost", "01", "BOOST", "升壓", "BOOST", "boost.html"),
    ("buck", "02", "BUCK", "降壓", "BUCK", "buck.html"),
    ("fsbb", "03", "4-SW BUCK-BOOST", "四開關升降壓", "4SW-BUCK-BOOST", "4sw-buck-boost.html"),
    ("sepic", "04", "SEPIC", "單端初級電感", "SEPIC", "sepic.html"),
]
SITE_RESET = "html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}\n"


def parse_part(text):
    parts = re.split(r"^<!--#([A-Z0-9_]+)-->\s*$", text, flags=re.M)
    return {parts[i]: parts[i + 1].strip("\n") for i in range(1, len(parts), 2)}


def nav(current, urls, site=False):
    items = ['<span class="lab">系列 Series</span>']
    if site:
        home = "<b>HOME</b>系列首頁"
        items.append(f'<span class="cur" aria-current="page">{home}</span>' if current == "home"
                     else f'<a href="./">{home}</a>')
    for key, no, name, zh, _, site_file in SERIES:
        inner = f"<b>{no} {name}</b>{zh}"
        if key == current:
            items.append(f'<span class="cur" aria-current="page">{inner}</span>')
        elif site:
            items.append(f'<a href="{site_file}">{inner}</a>')
        elif urls.get(key):
            items.append(f'<a href="{urls[key]}" target="_blank" rel="noopener">{inner}</a>')
        else:
            items.append(f'<span class="soon">{inner} · 準備中</span>')
    return "".join(items)


def squeeze(text):
    """Drop indentation and blank lines to shrink the upload; content is unchanged."""
    return "\n".join(line.strip() for line in text.splitlines() if line.strip()) + "\n"


def fill(template, fields):
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda m: fields[m.group(1)], template)


def site_page(page, topology=True):
    """Turn an artifact-style fragment into a full document that uses the shared assets.

    Topology pages drop the template's inline <style> and helper/engine <script>s in
    favour of assets/*; the index keeps its own small page-specific <style>.
    """
    head, body = page.split('<div class="wrap">', 1)
    if topology:
        head = re.sub(r"<style>.*?</style>", "", head, count=1, flags=re.S)
        scripts = re.findall(r"<script>(.*?)</script>", body, flags=re.S)
        body = body.replace(f"<script>{scripts[0]}</script>", '<script src="assets/common.js"></script>', 1)
        body = body.replace(f"<script>{scripts[2]}</script>", '<script src="assets/engine.js"></script>', 1)
    head = head.replace('<link rel="preconnect"', '<link rel="stylesheet" href="assets/series.css">\n<link rel="preconnect"', 1)
    return ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + '</head>\n<body>\n<div class="wrap">' + body + "</body>\n</html>\n")


def main():
    template = (SRC / "template.html").read_text(encoding="utf-8")
    urls = json.loads((SRC / "urls.json").read_text(encoding="utf-8"))
    (SITE / "assets").mkdir(parents=True, exist_ok=True)

    # shared assets for the site, taken straight from the template
    css = re.search(r"<style>(.*?)</style>", template, flags=re.S).group(1)
    scripts = re.findall(r"<script>(.*?)</script>", template, flags=re.S)
    (SITE / "assets" / "series.css").write_text(squeeze(SITE_RESET + css), encoding="utf-8")
    (SITE / "assets" / "common.js").write_text(squeeze(scripts[0]), encoding="utf-8")
    (SITE / "assets" / "engine.js").write_text(squeeze(scripts[2]), encoding="utf-8")

    for key, _, _, _, stem, site_file in SERIES:
        part_file = SRC / f"{key}.part.html"
        if not part_file.exists():
            continue
        fields = parse_part(part_file.read_text(encoding="utf-8"))
        fields["NAV"] = nav(key, urls)
        (OUT / f"{stem}_動畫說明.html").write_text(fill(template, fields), encoding="utf-8")
        fields["NAV"] = nav(key, urls, site=True)
        (SITE / site_file).write_text(squeeze(site_page(fill(template, fields))), encoding="utf-8")
        print("wrote", f"{stem}_動畫說明.html", "and _site/" + site_file)

    index = (SRC / "index.site.html").read_text(encoding="utf-8").replace("{{NAV}}", nav("home", urls, site=True))
    (SITE / "index.html").write_text(squeeze(site_page(index, topology=False)), encoding="utf-8")
    print("wrote _site/index.html")
    for f in sorted(SITE.rglob("*")):
        if f.is_file():
            print(f"  {f.relative_to(SITE).as_posix():28s} {f.stat().st_size:>7,d} bytes")


if __name__ == "__main__":
    main()
