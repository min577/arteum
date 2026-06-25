# -*- coding: utf-8 -*-
"""현재·예정 문화행사 스냅샷 생성 → web/app/api/events/events.json
   소스: 전국공연행사정보표준데이터(표준) + 한눈에보는(B553457). 순차+재시도로 안정 수집."""
import os, re, json, time, urllib.parse, urllib.request, ssl, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "web", "app", "api", "events", "events.json")
env = {}
for l in open(os.path.join(HERE, ".env"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip()
KEY = env["ARTE_KEY"]
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
CTRL = re.compile(r"[\x00-\x1f]")
TODAY = datetime.date.today().isoformat()

def get(url, timeout=30):
    return CTRL.sub(" ", urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": "eum"}), timeout=timeout, context=ctx
    ).read().decode("utf-8", "replace"))

def fin(v):
    try: return float(v)
    except: return None

def cleandate(s):
    s = (s or "").strip()
    m = re.fullmatch(r"(\d{4})(\d{2})(\d{2})", s) or re.match(r"(\d{4})[-.](\d{1,2})[-.](\d{1,2})", s)
    if not m: return ""
    y, mo, da = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (2000 <= y <= 2035 and 1 <= mo <= 12 and 1 <= da <= 31): return ""
    return f"{y:04d}-{mo:02d}-{da:02d}"

SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
def sido_of(addr):
    a = (addr or "").strip()
    for s in SIDO:
        if a.startswith(s) or a.startswith(s[:2]): return s
    m = {"강원특별자치도": "강원", "전북특별자치도": "전북", "충청북도": "충북", "충청남도": "충남",
         "전라북도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남",
         "제주특별자치도": "제주", "세종특별자치시": "세종"}
    for k, v in m.items():
        if a.startswith(k) or a.startswith(k[:2]): return v
    return ""

events = []

# 1) 표준데이터 (순차 + 재시도)
for pg in range(1, 11):
    items = None
    for a in range(3):
        try:
            raw = get("https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api?" +
                      urllib.parse.urlencode({"serviceKey": KEY, "pageNo": pg, "numOfRows": 1000, "type": "json"}))
            items = json.loads(raw)["response"]["body"].get("items", []); break
        except Exception as e:
            print(f"  표준 p{pg} 시도{a+1} 실패: {str(e)[:40]}"); time.sleep(1)
    if not items: continue
    for x in items:
        lat, lon = fin(x.get("latitude")), fin(x.get("longitude"))
        if lat is None or lon is None or (x.get("eventEndDate") or "") < TODAY: continue
        addr = x.get("rdnmadr") or x.get("lnmadr") or ""
        events.append({"name": x.get("eventNm", ""), "field": x.get("eventCo", ""), "place": x.get("opar", ""),
                       "thumb": "", "addr": addr, "sido": sido_of(addr), "start": cleandate(x.get("eventStartDate", "")),
                       "end": cleandate(x.get("eventEndDate", "")), "charge": x.get("chrgeInfo", ""), "org": x.get("mnnstNm", ""),
                       "url": x.get("homepageUrl", ""), "lat": lat, "lon": lon, "src": "표준데이터"})
print(f"표준데이터 현재행사: {len(events)}")

# 2) 한눈에보는 (B553457) — XML, gps 좌표
def xt(b, names):
    for n in names:
        m = re.search(rf"<{n}>([\s\S]*?)</{n}>", b, re.I)
        if m: return re.sub(r"<!\[CDATA\[|\]\]>", "", m.group(1)).strip()
    return ""
def fmt(s): return cleandate(s)
to = (datetime.date.today() + datetime.timedelta(days=180)).strftime("%Y%m%d")
b_cnt = 0
for pg in range(1, 13):
    try:
        raw = get("https://apis.data.go.kr/B553457/cultureinfo/period2?" +
                  urllib.parse.urlencode({"serviceKey": KEY, "numOfRows": 500, "PageNo": pg,
                                          "from": TODAY.replace("-", ""), "to": to}))
    except Exception as e:
        print(f"  한눈에보는 p{pg} 실패: {str(e)[:40]}"); break
    blocks = re.findall(r"<item>[\s\S]*?</item>", raw, re.I)
    if not blocks: break
    for b in blocks:
        lat, lon = fin(xt(b, ["gpsY", "latitude"])), fin(xt(b, ["gpsX", "longitude"]))
        end = fmt(xt(b, ["endDate", "eventEndDate"]))
        if lat is None or lon is None or end < TODAY: continue
        addr = xt(b, ["addr"])
        events.append({"name": xt(b, ["title", "eventNm"]), "field": xt(b, ["realmName", "realm"]),
                       "place": xt(b, ["place", "spatial"]), "thumb": (xt(b, ["thumbnail", "imageObject"]) or "").replace("http://", "https://"),
                       "addr": addr, "sido": sido_of(addr) or sido_of(xt(b, ["place", "spatial"])),
                       "start": fmt(xt(b, ["startDate", "eventStartDate"])), "end": end,
                       "charge": xt(b, ["charge", "price"]), "org": xt(b, ["place"]), "url": xt(b, ["url"]),
                       "lat": lat, "lon": lon, "src": "한눈에보는"})
        b_cnt += 1
print(f"한눈에보는 현재행사: {b_cnt}")

# 중복 제거(이름+시작일)
seen, merged = set(), []
for e in events:
    k = (e["name"], e["start"])
    if k in seen: continue
    seen.add(k); merged.append(e)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(merged, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print(f"저장: {os.path.relpath(OUT)} | 총 {len(merged)}건 (기준일 {TODAY})")
