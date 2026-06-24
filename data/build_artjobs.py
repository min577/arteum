# -*- coding: utf-8 -*-
"""문화예술 채용공고(ARKO) → 예술강사 관련 큐레이션 스냅샷 web/public/artJobs.json
   * 과거 누적 공고(2007~2022). '현재 채용중'이 아니라 '실제 채용 사례 + 요구역량 참고'용.
   * 수도권 편중 통계도 함께 산출(지역 일자리 불균형 근거)."""
import os, re, csv, io, glob, json
from collections import Counter

SRC = r"C:\Users\김민우\Desktop\공모전\문화예술채용정보"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public", "artJobs.json")
SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]

def to_sido(a):
    a = (a or "").replace("특별시", "").replace("광역시", "").replace("특별자치도", "").replace("특별자치시", "").strip()
    for s in SIDO:
        if a.startswith(s) or a.startswith(s[:2]):
            return s
    return ""

def normd(d):
    d = (d or "").strip()
    if re.fullmatch(r"\d{8}", d): return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", d)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else ""

def clean(t):
    t = re.sub(r"&#\d+;", " ", t or "")
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def snippet(cn):
    cn = clean(cn)
    for kw in ["모집분야", "지원자격", "자격요건", "응시자격", "자격"]:
        i = cn.find(kw)
        if i >= 0:
            return cn[i:i + 90].strip()
    return cn[:90]

# 수집 + 중복 제거
seen, rows = set(), []
for fn in glob.glob(os.path.join(SRC, "ak_empmn_info_*.csv")):
    txt = open(fn, "rb").read().decode("utf-8-sig", "replace")
    for r in csv.DictReader(io.StringIO(txt)):
        u = r.get("DETAIL_VIEW_URL") or (r.get("EMPMN_TITLE_NM", "") + r.get("CLOS_DE_DC", ""))
        if u in seen: continue
        seen.add(u); rows.append(r)

# 전체 지역 편중 통계
filled = [r for r in rows if to_sido(r.get("EMPMN_ACT_AREA_DC"))]
sc = Counter(to_sido(r.get("EMPMN_ACT_AREA_DC")) for r in filled)
metro = sc["서울"] + sc["경기"] + sc["인천"]
stat = {"totalPostings": len(rows), "withRegion": len(filled),
        "metroShare": round(metro / len(filled) * 100) if filled else 0,
        "bySido": dict(sc.most_common())}

# 예술강사 관련만 큐레이션
def relevant(r):
    t = r.get("EMPMN_TITLE_NM", "")
    return ("강사" in t) or ("문화예술교육" in t) or ("예술교육" in t)

jobs = []
for r in rows:
    if not relevant(r): continue
    t = clean(r.get("EMPMN_TITLE_NM", ""))
    if any(x in t for x in ["대표이사", "무대", "회계", "총무", "시설", "경비", "미화"]):
        continue
    jobs.append({
        "title": t,
        "org": clean(r.get("INSTT_NM", "")),
        "sido": to_sido(r.get("EMPMN_ACT_AREA_DC")),
        "area": clean(r.get("EMPMN_ACT_AREA_DC", "")),
        "clos": normd(r.get("CLOS_DE_DC", "")),
        "nmpr": clean(r.get("RCRIT_NMPR_DC", "")),
        "req": snippet(r.get("EMPMN_CN", "")),
        "url": (r.get("DETAIL_VIEW_URL") or r.get("HMPG_URL") or "").strip(),
    })
jobs.sort(key=lambda j: j["clos"], reverse=True)  # 최신 마감 먼저

out = {"stat": stat, "jobs": jobs}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print(f"저장: {os.path.relpath(OUT)}")
print(f"  큐레이션 강사 채용 사례: {len(jobs)}건 | 전체 {stat['totalPostings']} | 수도권 {stat['metroShare']}%")
print(f"  지역분포(강사사례):", Counter(j['sido'] or '미상' for j in jobs).most_common(8))
