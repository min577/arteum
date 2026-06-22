# -*- coding: utf-8 -*-
"""제안서용 분석 + 차트(PNG) 생성"""
import csv, os
from collections import defaultdict, Counter
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

PROG = r"C:\Users\김민우\Desktop\공모전\한국문화예술교육진흥원_문화예술교육 프로그램 목록_20251201.csv"
OUT = r"C:\Users\김민우\Desktop\공모전\eum\assets"

SIDO_NORM = {"서울특별시":"서울","부산광역시":"부산","대구광역시":"대구","인천광역시":"인천",
"광주광역시":"광주","대전광역시":"대전","울산광역시":"울산","세종특별자치시":"세종","경기도":"경기",
"강원특별자치도":"강원","강원도":"강원","충청북도":"충북","충청남도":"충남","전북특별자치도":"전북",
"전라북도":"전북","전라남도":"전남","경상북도":"경북","경상남도":"경남","제주특별자치도":"제주"}
SIDO = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"]
TGT = ["유아","아동","청소년","청년","중장년","노년","장애인"]

rows = list(csv.DictReader(open(PROG, encoding="cp949")))
cross = defaultdict(Counter); tcount = Counter(); scount = Counter()
parsed = 0
for r in rows:
    a = (r.get("운영주소","") or "").split()
    sido = SIDO_NORM.get(a[0]) if a else None
    tg = [t.strip() for t in (r.get("프로그램대상","") or "").split(",") if t.strip()]
    for t in tg: tcount[t]+=1
    if sido:
        parsed += 1; scount[sido]+=1
        for t in tg: cross[sido][t]+=1

print(f"총 {len(rows)}건, 광역 파싱 {parsed}건")

# ── 차트1: 대상별 ──
fig, ax = plt.subplots(figsize=(8,4.5))
items = [(t, tcount[t]) for t in ["아동","중장년","청소년","노년","청년","장애인","유아"]]
labels=[i[0] for i in items]; vals=[i[1] for i in items]
colors=["#4C78A8"]*5+["#E45756","#E45756"]
bars=ax.bar(labels, vals, color=colors)
ax.set_title("문화예술교육 프로그램 대상군별 공급량 (ARTE 개방데이터 1,311건)", fontsize=12, fontweight="bold")
ax.set_ylabel("프로그램 수(중복 분해)")
for b,v in zip(bars,vals): ax.text(b.get_x()+b.get_width()/2, v+5, str(v), ha="center", fontsize=10)
ax.text(5.0, max(vals)*0.85, "장애인·유아\n구조적 사각지대", color="#E45756", fontsize=10, ha="center", fontweight="bold")
plt.tight_layout(); plt.savefig(os.path.join(OUT,"01_대상별공급.png"), dpi=130); plt.close()

# ── 차트2: 시도×대상 히트맵 ──
M = np.array([[cross[s][t] for t in TGT] for s in SIDO], dtype=float)
fig, ax = plt.subplots(figsize=(8.5,7))
im = ax.imshow(M, cmap="YlOrRd", aspect="auto")
ax.set_xticks(range(len(TGT))); ax.set_xticklabels(TGT)
ax.set_yticks(range(len(SIDO))); ax.set_yticklabels(SIDO)
for i in range(len(SIDO)):
    for j in range(len(TGT)):
        v=int(M[i,j])
        ax.text(j,i, v if v else "0", ha="center", va="center",
                color="white" if v>M.max()*0.5 else ("#c00" if v==0 else "black"),
                fontsize=8, fontweight="bold" if v==0 else "normal")
ax.set_title("시도 × 대상군 공급 교차표 (빨강=공백)", fontsize=12, fontweight="bold")
zero=int((M==0).sum())
ax.set_xlabel(f"공백(0) 칸: {zero}/{M.size}칸")
plt.colorbar(im, ax=ax, label="프로그램 수", shrink=0.7)
plt.tight_layout(); plt.savefig(os.path.join(OUT,"02_시도대상히트맵.png"), dpi=130); plt.close()

# ── 차트3: 시도별 총량 ──
fig, ax = plt.subplots(figsize=(9,4.5))
sv=[scount[s] for s in SIDO]
bars=ax.bar(SIDO, sv, color=["#4C78A8" if v>=20 else "#E45756" for v in sv])
ax.set_title("시도별 문화예술교육 프로그램 분포 (편중 확인)", fontsize=12, fontweight="bold")
ax.set_ylabel("프로그램 수")
for b,v in zip(bars,sv): ax.text(b.get_x()+b.get_width()/2, v+1, str(v), ha="center", fontsize=9)
plt.tight_layout(); plt.savefig(os.path.join(OUT,"03_시도별분포.png"), dpi=130); plt.close()

print("저장 완료:", os.listdir(OUT))
print("\n[제안서 인용 수치]")
print(f"- 장애인 {tcount['장애인']}건, 유아 {tcount['유아']}건 (최소 대상군)")
print(f"- 시도×대상 119칸 중 공백 {zero}칸")
print(f"- 최다 경기 {scount['경기']} vs 최소 세종 {scount['세종']} (광역 격차 {scount['경기']//max(scount['세종'],1)}배)")
