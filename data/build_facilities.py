# -*- coding: utf-8 -*-
"""문화기반시설·여가활동 → web/public/facilities.json
   - houses: 문화의집 45곳(좌표·운영프로그램) = 활용 가능 거점
   - hallKeys: 문화예술회관 보유 시군구(시도|시군구명)
   - leisure: 시도별 문화예술 참여활동(2024) + 전국순위 = 실제 향유 수요 지표"""
import os, csv, io, json

SRC = r"C:\Users\김민우\Desktop\공모전\문화의집문화예술회관"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public", "facilities.json")

def rd(fn):
    return list(csv.DictReader(io.StringIO(open(os.path.join(SRC, fn), "rb").read().decode("utf-8-sig", "replace"))))

def sido2(nm):  # 서울특별시→서울, 전라북도→전북, 충청남도→충남
    nm = (nm or "").strip()
    m = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
         "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
         "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
         "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남", "경상북도": "경북",
         "경상남도": "경남", "제주특별자치도": "제주", "제주도": "제주"}
    return m.get(nm, nm[:2])

def f(v):
    try: return float(v)
    except: return None

# 문화의집
houses = []
for r in rd("KC_481_DMSTC_MCST_CLTHOUSE_2025.csv"):
    lat, lon = f(r.get("FCLTY_LA")), f(r.get("FCLTY_LO"))
    if lat is None or lon is None: continue
    progs = (r.get("PROGRM_NM") or "").strip()
    houses.append({"name": r.get("FCLTY_NM", "").strip(), "sido": sido2(r.get("CTPRVN_NM")),
                   "sigungu": (r.get("SIGNGU_NM") or "").strip(), "lat": lat, "lon": lon,
                   "oper": (r.get("OPER_STLE_NM") or "").strip(), "tel": (r.get("TEL_NO") or "").strip(),
                   "progN": (r.get("TOT_PROGRM_CO") or "").strip(), "clubN": (r.get("TOT_CLUB_CO") or "").strip(),
                   "programs": progs[:120]})

# 문화예술회관 보유 시군구
hallKeys = sorted({f"{sido2(r.get('CTPRVN_NM'))}|{(r.get('SIGNGU_CD_NM') or '').strip()}" for r in rd("ak_korea_clturart_union_signgu_2021.csv")})

# 여가활동조사 2024 — 문화예술 참여 + 순위
lsr = rd("KC_MRFN_LSR_ACT_SURVEY_INFO_2024.csv")
parts = [(r["AREA_NM"].strip(), f(r.get("TY_ACCTO_CLTUR_ART_PARTCPTN_ACT_CO")) or 0,
          f(r.get("TY_ACCTO_CLTUR_ART_VIEWNG_ACT_CO")) or 0) for r in lsr]
ranked = sorted(parts, key=lambda x: x[1], reverse=True)
leisure = {}
for i, (nm, part, view) in enumerate(ranked):
    leisure[nm] = {"part": round(part, 1), "view": round(view, 1), "rank": i + 1, "of": len(ranked)}

out = {"houses": houses, "hallKeys": hallKeys, "leisure": leisure}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print(f"저장: {os.path.relpath(OUT)}")
print(f"  문화의집 {len(houses)}곳 | 회관보유 시군구 {len(hallKeys)} | 여가조사 시도 {len(leisure)}")
print(f"  참여 1위 {ranked[0][0]}({ranked[0][1]}) / 꼴찌 {ranked[-1][0]}({ranked[-1][1]})")
