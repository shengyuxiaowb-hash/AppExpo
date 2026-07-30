#!/usr/bin/env python3
import base64
import io
import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CJK_FONT_PATHS = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]

LATIN_FONT_PATHS = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]


def load_font(size, cjk=False):
    for path in (CJK_FONT_PATHS if cjk else LATIN_FONT_PATHS):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def text(value):
    return str(value or "").strip()


def has_cjk(value):
    return any("\u3400" <= ch <= "\u9fff" for ch in str(value or ""))


def fmt_time(value):
    value = text(value)
    if not value:
        return "未标明"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%Y/%m/%d %H:%M")
    except Exception:
        return value.replace("T", " ").replace(".000Z", "").replace("Z", "")


def ellipsize(draw, value, font, max_width):
    value = text(value)
    if draw.textlength(value, font=font) <= max_width:
        return value
    out = ""
    for ch in value:
        if draw.textlength(out + ch + "...", font=font) > max_width:
            return out + "..."
        out += ch
    return out


def wrap(draw, value, font, max_width, max_lines=2):
    value = text(value)
    lines, current = [], ""
    for ch in value:
        candidate = current + ch
        if current and draw.textlength(candidate, font=font) > max_width:
            lines.append(current)
            current = ch
            if len(lines) >= max_lines:
                break
        else:
            current = candidate
    if current and len(lines) < max_lines:
        lines.append(current)
    if not lines:
        lines = [""]
    if lines and draw.textlength(lines[-1], font=font) > max_width:
        lines[-1] = ellipsize(draw, lines[-1], font, max_width)
    return lines[:max_lines]


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def fetch_image(src):
    src = text(src)
    if not src:
        return None
    try:
        if src.startswith("data:"):
            raw = base64.b64decode(src.split(",", 1)[1])
        else:
            request = urllib.request.Request(src, headers={
                "User-Agent": "Mozilla/5.0 AppleWebKit/605.1.15 Safari/605.1.15",
                "Accept": "image/*,*/*;q=0.8",
            })
            with urllib.request.urlopen(request, timeout=12) as response:
                raw = response.read(8 * 1024 * 1024)
        return Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception:
        return None


def fit_cover(image, size):
    if image is None:
        return None
    w, h = image.size
    tw, th = size
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = image.resize((nw, nh), Image.LANCZOS)
    return resized.crop(((nw - tw) // 2, (nh - th) // 2, (nw + tw) // 2, (nh + th) // 2))


def paste_round(base, image, box, radius):
    x, y, w, h = box
    if image is None:
        return
    img = image.resize((w, h), Image.LANCZOS)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    base.paste(img, (x, y), mask)


def palette(theme):
    if theme == "dark":
        return {
            "bg": "#0d121a", "panel": "#141b26", "media": "#202a38",
            "ink": "#eef4ff", "muted": "#9aa8bc", "line": "#2f3b4c",
            "soft": "#202a38", "blue": "#69a4ff", "teal": "#56d0b1",
            "chip_ink": "#c3d0e2", "chip": "#1f2a39",
        }
    return {
        "bg": "#f4f6f8", "panel": "#ffffff", "media": "#f1f5f8",
        "ink": "#152033", "muted": "#647084", "line": "#dbe3ea",
        "soft": "#eef3f7", "blue": "#1769e0", "teal": "#14866d",
        "chip_ink": "#647084", "chip": "#eef3f7",
    }


class Renderer:
    def __init__(self, payload):
        self.result = payload.get("result") or {}
        self.checked_at = payload.get("checkedAt") or ""
        self.theme = payload.get("theme") or "light"
        self.c = palette(self.theme)
        self.w = 1600
        self.canvas = Image.new("RGB", (self.w, 20000), self.c["bg"])
        self.draw = ImageDraw.Draw(self.canvas)
        self.fonts = {
            "h1": {"latin": load_font(32, cjk=False), "cjk": load_font(32, cjk=True)},
            "h2": {"latin": load_font(28, cjk=False), "cjk": load_font(28, cjk=True)},
            "h3": {"latin": load_font(24, cjk=False), "cjk": load_font(24, cjk=True)},
            "body": {"latin": load_font(22, cjk=False), "cjk": load_font(22, cjk=True)},
            "small": {"latin": load_font(19, cjk=False), "cjk": load_font(19, cjk=True)},
            "tiny": {"latin": load_font(16, cjk=False), "cjk": load_font(16, cjk=True)},
            "hero": {"latin": load_font(64, cjk=False), "cjk": load_font(64, cjk=True)},
            "hero_sub": {"latin": load_font(30, cjk=False), "cjk": load_font(30, cjk=True)},
            "badge": {"latin": load_font(18, cjk=False), "cjk": load_font(18, cjk=True)},
        }

    def image(self, src):
        return fetch_image(src)

    def font(self, token, value=""):
        bundle = self.fonts[token]
        return bundle["cjk"] if has_cjk(value) else bundle["latin"]

    def pill(self, x, y, label):
        label = text(label)
        if not label:
            return x
        font = self.font("badge", label)
        width = int(self.draw.textlength(label, font=font)) + 22
        rounded_rect(self.draw, (x, y, x + width, y + 30), 15, self.c["chip"])
        self.draw.text((x + 11, y + 6), label, font=font, fill=self.c["chip_ink"])
        return x + width + 8

    def header(self, y):
        x, w = 48, self.w - 96
        rounded_rect(self.draw, (x, y, x + w, y + 112), 8, self.c["panel"], self.c["line"], 1)
        title = f'{self.result.get("country", "")} · {self.result.get("pageLabel", "")} · {self.result.get("localName") or self.result.get("countryLabel", "")}'
        self.draw.text((x + 20, y + 20), title, font=self.font("h1", title), fill=self.c["ink"])
        subtitle = f'数据源：Apple API JSON · 分析时间 {fmt_time(self.checked_at)}'
        self.draw.text((x + 20, y + 64), subtitle, font=self.font("small", subtitle), fill=self.c["muted"])
        badge = f'{len(self.result.get("matches") or [])} 命中'
        badge_font = self.font("badge", badge)
        bw = int(self.draw.textlength(badge, font=badge_font)) + 28
        rounded_rect(self.draw, (x + w - bw - 20, y + 26, x + w - 20, y + 62), 18, "#e8f5f1" if self.theme == "light" else "#12362f")
        self.draw.text((x + w - bw - 6, y + 34), badge, font=badge_font, fill=self.c["teal"])
        return y + 136

    def meta(self, x, y, labels):
        cursor = x
        for label in labels:
            cursor = self.pill(cursor, y, label)

    def icon_or_fallback(self, src, size):
        img = fit_cover(self.image(src), size)
        if img is not None:
            return img
        fallback = Image.new("RGBA", size, self.c["media"])
        d = ImageDraw.Draw(fallback)
        app_font = self.font("small", "App")
        d.text((size[0] // 2 - 22, size[1] // 2 - 9), "App", font=app_font, fill=self.c["muted"])
        return fallback

    def draw_lines(self, lines, x, y, font, fill, gap=5):
        for line in lines:
            self.draw.text((x, y), line, font=font, fill=fill)
            y += font.size + gap
        return y

    def draw_standard_card(self, match, x, y, w, h, index):
        rounded_rect(self.draw, (x, y, x + w, y + h), 8, self.c["panel"], self.c["line"], 1)
        media_w = 172
        self.draw.rectangle((x + 1, y + 1, x + media_w, y + h - 1), fill=self.c["media"])
        img_src = match.get("image") or match.get("appIcon") or match.get("iconImage")
        icon = self.icon_or_fallback(img_src, (86, 86))
        paste_round(self.canvas, icon, (x + 50, y + h // 2 - 43, 86, 86), 18)

        bx, by = x + media_w + 28, y + 24
        group_label = self.today_group_label(match)
        if match.get("pageType") == "today" and group_label:
            bx = self.pill(bx, by, f'所在栏目 {group_label}')
        bx = self.pill(bx, by, self.primary_label(match, index))
        self.pill(bx, by, self.detail_label(match))

        tx = x + media_w + 28
        kicker = "展位标题" if match.get("pageType") == "today" else "标题来源"
        kicker_font = self.font("small", kicker)
        self.draw.text((tx, y + 70), kicker, font=kicker_font, fill=self.c["blue"])
        cursor = y + 104
        title = match.get("sectionTitle") or match.get("placementTitle") or "未命名区域"
        title_font = self.font("h2", title)
        title_lines = wrap(self.draw, title, title_font, w - media_w - 70, 2)
        self.draw_lines(title_lines, tx, cursor, title_font, self.c["ink"], 4)
        cursor += 38 if len(title_lines) == 1 else 68
        if match.get("sectionSubtitle"):
            subtitle = match.get("sectionSubtitle")
            subtitle_font = self.font("small", subtitle)
            self.draw.text((tx, cursor), ellipsize(self.draw, subtitle, subtitle_font, w - media_w - 70), font=subtitle_font, fill=self.c["muted"])
            cursor += 30

        proof_x = tx
        self.draw.line((proof_x, cursor, proof_x, cursor + 48), fill=self.c["teal"], width=4)
        proof_title = match.get("placementTitle") or match.get("appTitle") or "命中游戏"
        proof_title_font = self.font("body", proof_title)
        self.draw.text((proof_x + 16, cursor), ellipsize(self.draw, proof_title, proof_title_font, w - media_w - 96), font=proof_title_font, fill=self.c["ink"])
        if match.get("subtitle") or match.get("appSubtitle"):
            proof_subtitle = match.get("subtitle") or match.get("appSubtitle")
            proof_subtitle_font = self.font("small", proof_subtitle)
            self.draw.text((proof_x + 16, cursor + 28), ellipsize(self.draw, proof_subtitle, proof_subtitle_font, w - media_w - 96), font=proof_subtitle_font, fill=self.c["muted"])

        self.meta(tx, y + h - 48, [
            f'模块时间 {fmt_time(match.get("updatedAt"))}',
            f'分析时间 {fmt_time(match.get("checkedAt") or self.checked_at)}',
        ])

    def draw_hero_card(self, match, x, y, w, index):
        group_label = self.today_group_label(match)
        group = text(group_label if group_label != match.get("sectionTitle") else "")
        group_sub = text(match.get("groupSubtitle") if match.get("groupSubtitle") != match.get("sectionSubtitle") else "")
        heading_h = 92 if group or group_sub else 0
        hero_h, lock_h, meta_h = 510, 116, 62
        h = heading_h + hero_h + lock_h + meta_h
        rounded_rect(self.draw, (x, y, x + w, y + h), 8, self.c["panel"], self.c["line"], 1)
        if heading_h:
            self.draw.text((x + 22, y + 18), group, font=self.font("h2", group), fill=self.c["ink"])
            if group_sub:
                self.draw.text((x + 22, y + 54), group_sub, font=self.font("body", group_sub), fill=self.c["muted"])

        hero_y = y + heading_h
        hero = fit_cover(self.image(match.get("image") or match.get("heroImage")), (w, hero_h)) or Image.new("RGBA", (w, hero_h), self.c["media"])
        overlay = Image.new("RGBA", (w, hero_h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for row in range(hero_h):
            t = max(0, (row - hero_h * 0.42) / (hero_h * 0.58))
            od.line((0, row, w, row), fill=(3, 31, 30, int(215 * min(1, t))))
        hero.alpha_composite(overlay)
        self.canvas.paste(hero.convert("RGB"), (x, hero_y))
        cx, cy = x + 58, hero_y + hero_h - 188
        event_kind = text(match.get("eventKind") or match.get("placementType") or "展位")
        event_kind_font = self.font("body", event_kind)
        self.draw.text((cx, cy), event_kind, font=event_kind_font, fill="#eaf7f5")
        hero_title = match.get("sectionTitle") or match.get("placementTitle")
        hero_title_font = self.font("hero", hero_title)
        hero_title_lines = wrap(self.draw, hero_title, hero_title_font, w - 120, 2)
        cy = self.draw_lines(hero_title_lines, cx, cy + 36, hero_title_font, "#ffffff", 6)
        if match.get("sectionSubtitle"):
            hero_subtitle = match.get("sectionSubtitle")
            hero_subtitle_font = self.font("hero_sub", hero_subtitle)
            self.draw.text((cx, cy + 4), ellipsize(self.draw, hero_subtitle, hero_subtitle_font, w - 120), font=hero_subtitle_font, fill="#f2f7f7")

        lock_y = hero_y + hero_h
        icon = self.icon_or_fallback(match.get("appIcon") or match.get("iconImage"), (78, 78))
        paste_round(self.canvas, icon, (x + 28, lock_y + 20, 78, 78), 18)
        app_title = match.get("appTitle") or match.get("placementTitle")
        app_title_font = self.font("body", app_title)
        self.draw.text((x + 128, lock_y + 26), ellipsize(self.draw, app_title, app_title_font, w - 280), font=app_title_font, fill=self.c["ink"])
        app_subtitle = match.get("appSubtitle") or match.get("subtitle")
        app_subtitle_font = self.font("small", app_subtitle)
        self.draw.text((x + 128, lock_y + 58), ellipsize(self.draw, app_subtitle, app_subtitle_font, w - 280), font=app_subtitle_font, fill=self.c["muted"])
        rounded_rect(self.draw, (x + w - 112, lock_y + 37, x + w - 34, lock_y + 75), 19, "#eef5ff" if self.theme == "light" else "#1b3355")
        call_to_action = text(match.get("callToAction") or "查看")
        self.draw.text((x + w - 88, lock_y + 46), call_to_action, font=self.font("badge", call_to_action), fill=self.c["blue"])
        self.meta(x + 28, lock_y + lock_h + 8, [
            f'所在栏目 {group_label}',
            self.primary_label(match, index),
            self.detail_label(match),
            f'模块时间 {fmt_time(match.get("updatedAt"))}',
            f'分析时间 {fmt_time(match.get("checkedAt") or self.checked_at)}',
        ])
        return h

    def primary_label(self, match, index):
        if match.get("pageType") == "today" and match.get("modulePosition"):
            return f'{match.get("pageLabel") or "Today"} 栏目第 {match.get("modulePosition")} 位'
        return f'{match.get("pageLabel") or ""} 展位 {index + 1}'.strip()

    def today_group_label(self, match):
        if match.get("pageType") != "today":
            return ""
        return text(match.get("groupTitle") or match.get("pageLabel") or "Today")

    def detail_label(self, match):
        pos = match.get("itemPosition") or match.get("position")
        if match.get("pageType") == "today":
            if not pos:
                return "组内位置未标明"
            return f'组内第 {pos} 位'
        return f'{match.get("placementType") or "展位"} · 第 {pos} 位' if pos else f'{match.get("placementType") or "展位"} · 位置未标明'

    def render(self):
        y = self.header(36)
        matches = self.result.get("matches") or []
        if not matches:
            rounded_rect(self.draw, (62, y, self.w - 62, y + 150), 8, self.c["panel"], self.c["line"], 1)
            empty_text = "当前 API 数据里没有找到该游戏。"
            self.draw.text((100, y + 58), empty_text, font=self.font("h2", empty_text), fill=self.c["muted"])
            y += 190
        elif self.result.get("pageType") == "games":
            pad, gap = 62, 22
            col_w = (self.w - pad * 2 - gap) // 2
            card_h = 276
            for index, match in enumerate(matches):
                col = index % 2
                row = index // 2
                x = pad + col * (col_w + gap)
                cy = y + row * (card_h + gap)
                self.draw_standard_card(match, x, cy, col_w, card_h, index)
            y += ((len(matches) + 1) // 2) * (card_h + gap)
        else:
            for index, match in enumerate(matches):
                if match.get("mediaMode") in ("hero", "carousel", "event"):
                    h = self.draw_hero_card(match, 62, y, self.w - 124, index)
                    y += h + 24
                else:
                    self.draw_standard_card(match, 62, y, self.w - 124, 252, index)
                    y += 276
        return self.canvas.crop((0, 0, self.w, min(y + 36, self.canvas.height)))


def main():
    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    image = Renderer(payload).render()
    image.save(sys.argv[2], "PNG", optimize=True)


if __name__ == "__main__":
    main()
