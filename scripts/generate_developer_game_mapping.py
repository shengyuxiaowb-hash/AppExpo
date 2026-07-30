#!/usr/bin/env python3
import csv
import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
APP_DATA = json.loads((ROOT / "scripts" / "app_data.json").read_text(encoding="utf-8"))
COUNTRIES = APP_DATA["countries"]
COUNTRY_ORDER = ["CN", "HK", "TW", "US", "CA", "GB", "SG", "AU", "NZ", "IN", "ZA", "SA", "JP", "KR", "DE", "FR", "BR", "MX"]
KNOWN_NAMES = APP_DATA["knownNames"]
STATIC_GAMES = APP_DATA["staticGames"]
EXTRA_GAMES = {
    "CN": [
        ["6446981035", "星落", "星落"],
        ["6476490214", "洛伊的移动要塞", "洛伊的移动要塞"],
    ],
    "HK": [["6758334085", "嘎嘎奇兵：蛋力來勝", "嘎嘎奇兵：蛋力來勝"]],
    "TW": [
        ["6758334085", "嘎嘎奇兵：蛋力來勝", "嘎嘎奇兵：蛋力來勝"],
        ["1638260214", "月夜降臨", "月夜降臨"],
        ["1600013128", "雲圖計劃", "云图计划"],
    ],
    "US": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "CA": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "GB": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "SG": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "AU": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "NZ": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "IN": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "ZA": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "SA": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "JP": [
        ["6758334085", "ダックスクワッド：バウンドエッグ", "嘎嘎奇兵：蛋力來勝"],
        ["6737179424", "星落：深淵のエルピス", "星落"],
    ],
    "KR": [
        ["6758334085", "꽥꽥 구조대 - 알 폭격 디펜스", "嘎嘎奇兵：蛋力來勝"],
        ["1599710020", "뉴럴 클라우드", "云图计划"],
        ["6449023119", "리버스: 1999", "Reverse: 1999"],
        ["6479982276", "빛과 밤의 사랑 - 로맨틱 판타지", "光与夜之恋"],
        ["6449961207", "소드 오브 콘발라리아", "Sword of Convallaria"],
    ],
    "DE": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "FR": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "BR": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
    "MX": [["6758334085", "Quack Quack Attack", "嘎嘎奇兵：蛋力來勝"]],
}
EXCLUDED_APP_IDS = {
    "1633942599",  # Viart
    "1589399089",  # WePlay - Game & Party
    "1580330718",  # WePlay - Game and Party
    "1557823712",  # WePlay - 線上桌遊吧
    "1619262637",  # WePlay - 파티게임
    "1583719227",  # WePlay(ウィプレー) - パーティゲーム
    "1603751166",  # 神仙道小助手
}

CN_DEVS = ["1618718019", "929034871"]
OTHER_DEVS = ["1563750317", "1559722257", "1518979561", "1810952934", "929034871"]


def build_url(country, developer_id):
    query = [
        ("platform", "web"),
        ("additionalPlatforms", "appletv,ipad,iphone,mac,realityDevice,watch"),
        ("extend", "ageRating,customArtwork,customDeepLink,customIconArtwork,editorialArtwork,editorialVideo,iconArtwork,isAppleWatchSupported,macRequiredCapabilities,minimumOSVersion,requiredCapabilities"),
        ("extend[apps]", "isVerifiedForAppleSiliconMac"),
        ("include", "app-bundles,arcade-apps,atv-apps,imessage-apps,ios-apps,latest-release-app,mac-apps,system-apps,watch-apps,xros-apps"),
        ("sparseLimit[developers:ios-apps]", "40"),
        ("with", "macOSCompatibleIOSApps"),
        ("l", country["locale"]),
    ]
    return f"https://apps.apple.com/api/apps/v1/catalog/{country['path']}/developers/{developer_id}?{urllib.parse.urlencode(query)}"


def curl_json(url, locale, retries=4):
    command = [
        "curl", "-sS", "--compressed", url,
        "-H", "Accept: */*",
        "-H", f"Accept-Language: {locale},zh-Hans;q=0.9,zh-CN;q=0.8,en;q=0.7",
        "-H", "Cookie: geo=SG",
        "-H", "Referer: https://apps.apple.com/",
        "-H", "Sec-Fetch-Dest: empty",
        "-H", "Sec-Fetch-Mode: cors",
        "-H", "Sec-Fetch-Site: same-origin",
        "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
        "-H", "x-apple-client-version: 2626.4.0-external",
        "-w", "\n%{http_code}",
    ]
    last_error = None
    for attempt in range(retries + 1):
        output = subprocess.check_output(command, text=True)
        body, status = output.rsplit("\n", 1)
        status = int(status.strip())
        if status == 200:
            return json.loads(body)
        last_error = f"HTTP {status}: {body[:160]}"
        if status == 429 and attempt < retries:
            time.sleep(2 + attempt * 2)
            continue
        if attempt < retries:
            time.sleep(1.2 + attempt)
    raise RuntimeError(last_error or "curl failed")


def has_cjk(text):
    return bool(re.search(r"[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]", text or ""))


def is_chinese(text):
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def is_game_item(item):
    attributes = item.get("attributes") or {}
    relationships = item.get("relationships") or {}
    genre_display_name = (attributes.get("genreDisplayName") or "").strip().lower()
    if genre_display_name in {
        "action", "adventure", "arcade", "board", "card", "casino", "casual",
        "family", "music", "puzzle", "racing", "roleplaying", "simulation",
        "sports", "strategy", "trivia", "word",
    }:
        return True
    genres = ((relationships.get("genres") or {}).get("data") or [])
    for genre in genres:
        genre_attributes = genre.get("attributes") or {}
        if (genre_attributes.get("parentName") or "").strip() == "Games":
            return True
        if (genre_attributes.get("name") or "").strip() == "Games":
            return True
    return False


def normalize_key(value):
    return re.sub(r"[^a-z0-9\u3400-\u9fff]+", "", (value or "").strip().lower())


def collect_apps(payload, country_code, developer_id):
    rows = []
    seen = set()
    root_item = (payload.get("data") or [{}])[0]
    apps = ((root_item.get("relationships") or {}).get("ios-apps") or {}).get("data") or []
    for item in apps:
        if item.get("type") != "apps" or not is_game_item(item):
            continue
        attributes = item.get("attributes") or {}
        app_id = str(item.get("id") or "").strip()
        name = (attributes.get("name") or "").strip()
        if not app_id or not name:
            continue
        if app_id in EXCLUDED_APP_IDS:
            continue
        key = (app_id, name)
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "id": app_id,
            "name": name,
            "country": country_code,
            "developerId": developer_id,
        })
    return rows


def collect_static_rows():
    rows = []
    merged = {key: list(value) for key, value in STATIC_GAMES.items()}
    for country_code, entries in EXTRA_GAMES.items():
        merged.setdefault(country_code, [])
        merged[country_code].extend(entries)
    for country_code, entries in merged.items():
        for entry in entries:
            if len(entry) < 2:
                continue
            app_id = str(entry[0]).strip()
            name = (entry[1] or "").strip()
            chinese_name = (entry[2] or "").strip() if len(entry) > 2 else ""
            if not app_id or not name:
                continue
            rows.append({
                "id": app_id,
                "name": name,
                "country": country_code,
                "developerId": "static",
            })
            if chinese_name and chinese_name != name:
                rows.append({
                    "id": app_id,
                    "name": chinese_name,
                    "country": country_code,
                    "developerId": "static",
                })
    return rows


def pick_preferred_name(rows):
    for country_code in ("CN", "HK", "TW"):
        for row in rows:
            if row["country"] == country_code and is_chinese(row["name"]):
                return row["name"]
    for row in rows:
        if is_chinese(row["name"]):
            return row["name"]
    for row in rows:
        alias = KNOWN_NAMES.get(row["id"]) or KNOWN_NAMES.get(normalize_key(row["name"]))
        if alias and is_chinese(alias):
            return alias
    for row in rows:
        if has_cjk(row["name"]):
            return row["name"]
    for country_code in ("US", "GB", "SG", "AU", "NZ", "IN", "ZA", "SA"):
        for row in rows:
            if row["country"] == country_code:
                return row["name"]
    return rows[0]["name"] if rows else ""


def pick_english_name(rows):
    for country_code in ("US", "GB", "SG", "AU", "NZ", "IN", "ZA", "SA"):
        for row in rows:
            if row["country"] == country_code and not has_cjk(row["name"]):
                return row["name"]
    for row in rows:
        if not has_cjk(row["name"]):
            return row["name"]
    return ""


def main():
    all_rows = [row for row in collect_static_rows() if row["id"] not in EXCLUDED_APP_IDS]
    errors = []
    for country_code in COUNTRY_ORDER:
        country = COUNTRIES[country_code]
        developer_ids = CN_DEVS if country_code == "CN" else OTHER_DEVS
        for developer_id in developer_ids:
            url = build_url(country, developer_id)
            try:
                payload = curl_json(url, country["locale"])
                all_rows.extend(collect_apps(payload, country_code, developer_id))
            except Exception as error:
                errors.append({
                    "country": country_code,
                    "developer_id": developer_id,
                    "error": str(error),
                    "url": url,
                })
            time.sleep(0.25)

    by_id = {}
    for row in all_rows:
        by_id.setdefault(row["id"], []).append(row)

    apps = []
    def sort_key(item):
        _app_id, rows = item
        has_cn = any(row["country"] == "CN" for row in rows)
        return (0 if has_cn else 1, pick_preferred_name(rows).lower())

    for app_id, rows in sorted(by_id.items(), key=sort_key):
        countries = {}
        for country_code in COUNTRY_ORDER:
            names = []
            for row in rows:
                if row["country"] == country_code and row["name"] not in names:
                    names.append(row["name"])
            if names:
                countries[country_code] = names
        apps.append({
            "id": app_id,
            "preferredName": pick_preferred_name(rows),
            "primaryEnglishName": pick_english_name(rows),
            "countries": countries,
            "countryCount": len(countries),
        })

    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "countryCodes": COUNTRY_ORDER,
        "totalApps": len(apps),
        "errors": errors,
        "apps": apps,
    }

    json_path = ROOT / "data" / "developer_game_mapping_2026-07-06.json"
    csv_path = ROOT / "data" / "developer_game_mapping_2026-07-06.csv"
    md_path = ROOT / "data" / "developer_game_mapping_2026-07-06.md"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["preferred_name", "primary_english_name", "app_id", "country_count", "countries"])
        for app in apps:
            country_segments = []
            for country_code in COUNTRY_ORDER:
                if country_code in app["countries"]:
                    country_segments.append(f"{country_code}:{' | '.join(app['countries'][country_code])}")
            writer.writerow([
                app["preferredName"],
                app["primaryEnglishName"],
                app["id"],
                app["countryCount"],
                " ; ".join(country_segments),
            ])

    cn_apps = [app for app in apps if "CN" in app["countries"]]
    other_apps = [app for app in apps if "CN" not in app["countries"]]

    lines = ["# AppExpo 游戏名 - ID 对照", "", f"总数：{len(apps)}", ""]
    lines.append("## 中国大陆")
    lines.append("")
    for app in cn_apps:
        title = app["preferredName"]
        if app["primaryEnglishName"] and app["primaryEnglishName"] != app["preferredName"]:
            title = f"{app['preferredName']} / {app['primaryEnglishName']}"
        lines.append(f"- {title} — `{app['id']}`")
    lines.append("")
    lines.append("## 其他地区")
    lines.append("")
    for app in other_apps:
        title = app["preferredName"]
        if app["primaryEnglishName"] and app["primaryEnglishName"] != app["preferredName"]:
            title = f"{app['preferredName']} / {app['primaryEnglishName']}"
        lines.append(f"- {title} — `{app['id']}`")
    md_path.write_text("\n".join(lines), encoding="utf-8")

    print(json_path)
    print(csv_path)
    print(md_path)
    print(f"total_apps={len(apps)}")
    print(f"errors={len(errors)}")


if __name__ == "__main__":
    main()
