# -*- coding: utf-8 -*-
"""문화예술 관람 추이(주간 설문) → web/public/viewTrend.json
   전년대비 '증가' - '감소' 응답수 = 순증가(net) 1년+ 추이. 예술강사 분야 선택 참고용."""
import os, csv, io, glob
from collections import Counter
import json

SRC = r"C:\Users\김민우\Desktop\공모전\기타"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public", "viewTrend.json")
ARTS = ["연극-뮤지컬", "음악 공연", "미술관-전시관", "박물관", "무용 공연", "문학 행사"]

files = sorted(glob.glob(os.path.join(SRC, "CI_CLTUR_ART_VIEWNG_CRSTAT_INFO_*.csv")))
weeks, resp = [], []
incr = {a: [] for a in ARTS}
decr = {a: [] for a in ARTS}
for fn in files:
    d = os.path.basename(fn)[-12:-4]
    weeks.append(f"{d[:4]}-{d[4:6]}-{d[6:8]}")
    rows = list(csv.DictReader(io.StringIO(open(fn, "rb").read().decode("utf-8-sig", "replace"))))
    resp.append(len(rows))
    ci, cd = Counter(), Counter()
    for r in rows:
        for k, v in r.items():
            if v in ARTS:
                if "INCR_ACT" in k: ci[v] += 1
                elif "DECR_ACT" in k: cd[v] += 1
    for a in ARTS:
        incr[a].append(ci[a]); decr[a].append(cd[a])

series = []
for a in ARTS:
    net = [incr[a][i] - decr[a][i] for i in range(len(weeks))]
    series.append({"key": a, "incr": incr[a], "decr": decr[a], "net": net,
                   "recentNet": round(sum(net[-8:]) / 8, 1), "firstNet": round(sum(net[:8]) / 8, 1)})

out = {"weeks": weeks, "respondents": resp, "series": series}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print(f"저장: {os.path.relpath(OUT)} | {len(weeks)}주 ({weeks[0]}~{weeks[-1]})")
for s in sorted(series, key=lambda x: x["recentNet"] - x["firstNet"], reverse=True):
    print(f"  {s['key']}: 최근순증 {s['recentNet']} (초기 {s['firstNet']}, 변화 {round(s['recentNet']-s['firstNet'],1):+})")
