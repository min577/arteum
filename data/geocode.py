# -*- coding: utf-8 -*-
"""운영주소 → 카카오 지오코딩(좌표+시도/시군구). 캐시로 재실행 안전."""
import os, csv, json, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))

def load_env(path):
    if not os.path.exists(path): return
    for line in open(path, encoding="utf-8"):
        line=line.strip()
        if line and not line.startswith("#") and "=" in line:
            k,v=line.split("=",1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
load_env(os.path.join(HERE, ".env"))

KEY = (os.environ.get("KAKAO_REST_API_KEY") or os.environ.get("KAKAO_REST_KEY") or "").strip()
PROG = r"C:\Users\김민우\Desktop\공모전\한국문화예술교육진흥원_문화예술교육 프로그램 목록_20251201.csv"
CACHE = os.path.join(HERE, "cache", "geocode_cache.json")
OUT = os.path.join(HERE, "programs_geocoded.csv")

ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json?query="
KW_URL   = "https://dapi.kakao.com/v2/local/search/keyword.json?query="

def req(url):
    r = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {KEY}"})
    with urllib.request.urlopen(r, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def geocode(addr):
    """주소검색 → 실패시 키워드검색. 반환: dict(lat,lon,sido,sigungu,src) or None"""
    q = urllib.parse.quote(addr)
    try:
        d = req(ADDR_URL+q)
        docs = d.get("documents",[])
        if docs:
            a = docs[0].get("address") or docs[0].get("road_address") or docs[0]
            return {"lat":float(docs[0]["y"]),"lon":float(docs[0]["x"]),
                    "sido":a.get("region_1depth_name",""),"sigungu":a.get("region_2depth_name",""),"src":"addr"}
    except Exception:
        pass
    try:
        d = req(KW_URL+q)
        docs = d.get("documents",[])
        if docs:
            return {"lat":float(docs[0]["y"]),"lon":float(docs[0]["x"]),
                    "sido":docs[0].get("region_1depth_name",""),"sigungu":docs[0].get("region_2depth_name",""),"src":"kw"}
    except Exception:
        pass
    return None

if not KEY:
    print("⚠️ .env에 KAKAO_REST_KEY가 없음"); raise SystemExit

# 자가 테스트
print("[테스트]", geocode("서울특별시 중구 세종대로 110"))

cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
rows = list(csv.DictReader(open(PROG, encoding="cp949")))
addrs = sorted({(r.get("운영주소","") or "").strip() for r in rows if (r.get("운영주소","") or "").strip()})
print(f"고유 주소 {len(addrs)}개 / 캐시 {len(cache)}개")

new=0; fail=0
for i,a in enumerate(addrs):
    if a in cache: continue
    res = geocode(a)
    cache[a] = res
    new += 1
    if res is None: fail += 1
    if new % 50 == 0:
        json.dump(cache, open(CACHE,"w",encoding="utf-8"), ensure_ascii=False)
        print(f"  ...{new} 신규 처리 (실패 {fail})")
    time.sleep(0.03)
json.dump(cache, open(CACHE,"w",encoding="utf-8"), ensure_ascii=False)

ok = sum(1 for a in addrs if cache.get(a))
print(f"\n지오코딩 성공 {ok}/{len(addrs)} ({ok/len(addrs)*100:.0f}%), 신규 {new}, 실패 {fail}")

# enriched CSV
cols=["구분","단체이름","프로그램명","운영장소명","지원사업명","프로그램분야","프로그램대상","운영기간시작","운영기간종료","운영주소","시도","시군구","lat","lon"]
with open(OUT,"w",encoding="utf-8-sig",newline="") as f:
    w=csv.writer(f); w.writerow(cols)
    for r in rows:
        a=(r.get("운영주소","") or "").strip(); g=cache.get(a) or {}
        w.writerow([r.get("구분",""),r.get("단체이름",""),r.get("프로그램명",""),r.get("운영장소명",""),
                    r.get("지원사업명",""),r.get("프로그램분야",""),r.get("프로그램대상",""),
                    r.get("운영기간시작",""),r.get("운영기간종료",""),a,
                    g.get("sido",""),g.get("sigungu",""),g.get("lat",""),g.get("lon","")])
print("저장:", OUT)

# 정확 분석
from collections import Counter, defaultdict
sgg=set(); cross=defaultdict(Counter)
for r in rows:
    a=(r.get("운영주소","") or "").strip(); g=cache.get(a)
    if not g: continue
    sd,sg=g.get("sido",""),g.get("sigungu","")
    if sd and sg: sgg.add((sd,sg))
    for t in [x.strip() for x in (r.get("프로그램대상","") or "").split(",") if x.strip()]:
        if sd: cross[sd][t]+=1
print(f"\n프로그램이 존재하는 시군구: {len(sgg)}곳")
