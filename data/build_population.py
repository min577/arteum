# -*- coding: utf-8 -*-
"""KOSIS 시군구 인구 → web/public/popByCode.json (geojson code별 인구)
   + 도시규모(대도시/중소도시/읍면) 교육 격차 헤드라인 추출(제안서 근거)."""
import os, csv, io, json, re

SRC = r"C:\Users\김민우\Desktop\공모전\필요"
WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public")
SIDO_FULL = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
             "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
             "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북",
             "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
             "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주"}

def rd(fn):
    return list(csv.reader(io.StringIO(open(os.path.join(SRC, fn), "rb").read().decode("cp949", "replace"))))

def num(s):
    s = re.sub(r"[^\d.-]", "", s or "")
    try: return float(s)
    except: return None

# 1) 인구 파싱(계층: 시도 → 시군구)
pop = rd("인구__가구_및_주택_–_읍면동_연도_끝자리_0__5___시군구_그_외_연도__20260624163820.csv")
popmap, sidoTotal, cur = {}, {}, None
national = None
for r in pop[2:]:
    if not r or not r[0]: continue
    nm = r[0].strip(); p = num(r[1])
    if nm == "전국": national = int(p); continue
    if nm in ("읍부", "면부", "동부"): continue
    if nm in SIDO_FULL:
        cur = SIDO_FULL[nm]; sidoTotal[cur] = int(p) if p else 0; continue
    if cur and p is not None:
        popmap[f"{cur}|{nm}"] = int(p)

def norm(s): return re.sub(r"\s+", "", s or "")
popmapN = {norm(k): v for k, v in popmap.items()}

# 2) geojson 매칭 → code별 인구
geo = json.load(open(os.path.join(WEB, "sigungu.geojson"), encoding="utf-8"))
byCode, miss, progTotal = {}, [], 0
for f in geo["features"]:
    pr = f["properties"]; sido, name, code = pr.get("sido"), pr.get("name"), pr.get("code")
    progTotal += pr.get("total", 0)
    key = norm(f"{sido}|{name}")
    v = popmapN.get(key)
    if v is None and sido == "세종":  # 단층제
        v = sidoTotal.get("세종")
    if v is None:  # 부분일치(시 통합 등)
        cand = [vv for kk, vv in popmapN.items() if kk.startswith(norm(sido)) and (norm(name) in kk or kk.split("|")[-1] in norm(name))]
        v = cand[0] if cand else None
    if v: byCode[str(code)] = v
    else: miss.append(f"{sido} {name}")

matchedPop = sum(byCode.values())
out = {"national": national, "byCode": byCode,
       "per10kNational": round(progTotal / national * 10000, 2) if national else None}
json.dump(out, open(os.path.join(WEB, "popByCode.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"popByCode.json | 매칭 {len(byCode)}/{len(geo['features'])} (미매칭 {len(miss)}) | 전국인구 {national:,}")
print(f"  전국 프로그램 {progTotal} → 인구 1만명당 {out['per10kNational']}건")
if miss: print("  미매칭 일부:", miss[:8])

# 3) 도시규모 교육 격차 헤드라인(있으면)
def urbanRows(fn, valcol=2):
    try: rows = rd(fn)
    except: return None
    hdr = rows[1]; out = {}
    for r in rows[2:]:
        if len(r) > 1 and r[0].strip() in ("대도시읍면별", "대도시·읍면별", "거주지역별"):
            out[r[1].strip()] = r
    return out, hdr

urbanExp, expBySido = {}, {}
rows = rd("1년_이내_문화예술교육_경험_여부_20260624164626.csv")
for r in rows[2:]:
    if not r or len(r) < 4: continue
    c1 = r[0].strip()
    if c1 == "지역규모별": urbanExp[r[1].strip()] = num(r[3])      # 있다(경험률 %)
    elif c1 == "17개 시도별": expBySido[r[1].strip()] = num(r[3])
# 시도별 등록 장애인 인구 (장애인 사각지대 근거)
disabledBySido = {}
try:
    drows = list(csv.reader(io.StringIO(open(os.path.join(r"C:\Users\김민우\Desktop\공모전", "연령_및_성별_장애인_인구__시군구_20260624170400.csv"), "rb").read().decode("cp949", "replace"))))
    for r in drows[2:]:
        if len(r) >= 3 and r[0].strip() in SIDO_FULL and r[1].strip() == "합계":
            disabledBySido[SIDO_FULL[r[0].strip()]] = int(num(r[2]) or 0)
except Exception as e:
    print("장애인 파싱 오류", e)

demand = {"urbanExp": urbanExp, "expBySido": expBySido, "disabledBySido": disabledBySido, "per10kNational": out["per10kNational"]}
json.dump(demand, open(os.path.join(WEB, "demand.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("\ndemand.json | 지역규모 경험률:", urbanExp)
print("  시도별 경험률 일부:", dict(list(expBySido.items())[:5]))
