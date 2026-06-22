# -*- coding: utf-8 -*-
"""지오코딩 완료 데이터로 최종 분석 + 차트(히트맵 갱신 + 점지도 미리보기)"""
import csv, os
from collections import defaultdict, Counter
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
plt.rcParams["font.family"]="Malgun Gothic"; plt.rcParams["axes.unicode_minus"]=False

HERE=os.path.dirname(os.path.abspath(__file__))
GEO=os.path.join(HERE,"programs_geocoded.csv")
OUT=r"C:\Users\김민우\Desktop\공모전\eum\assets"

NORM={"강원특별자치도":"강원","전북특별자치도":"전북","제주특별자치도":"제주","세종특별자치시":"세종"}
def n(s): return NORM.get(s,s)
SIDO=["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"]
TGT=["유아","아동","청소년","청년","중장년","노년","장애인"]

rows=list(csv.DictReader(open(GEO,encoding="utf-8-sig")))
cross=defaultdict(Counter); scount=Counter(); sgg=set(); pts=[]
for r in rows:
    sd=n(r.get("시도","")); sg=r.get("시군구","")
    tg=[t.strip() for t in (r.get("프로그램대상","") or "").split(",") if t.strip()]
    if sd:
        scount[sd]+=1
        for t in tg: cross[sd][t]+=1
        if sg: sgg.add((sd,sg))
    try: pts.append((float(r["lon"]),float(r["lat"]),tg[0] if tg else "기타"))
    except: pass

# 히트맵(전체 데이터)
M=np.array([[cross[s][t] for t in TGT] for s in SIDO],dtype=float)
fig,ax=plt.subplots(figsize=(8.5,7))
im=ax.imshow(M,cmap="YlOrRd",aspect="auto")
ax.set_xticks(range(len(TGT))); ax.set_xticklabels(TGT)
ax.set_yticks(range(len(SIDO))); ax.set_yticklabels(SIDO)
for i in range(len(SIDO)):
    for j in range(len(TGT)):
        v=int(M[i,j])
        ax.text(j,i,v if v else "0",ha="center",va="center",
                color="white" if v>M.max()*0.5 else ("#c00" if v==0 else "black"),
                fontsize=8,fontweight="bold" if v==0 else "normal")
zero=int((M==0).sum())
ax.set_title("시도 × 대상군 공급 교차표 — 전체 지오코딩 데이터",fontsize=12,fontweight="bold")
ax.set_xlabel(f"공백(0) 칸: {zero}/{M.size}")
plt.colorbar(im,ax=ax,shrink=0.7,label="프로그램 수")
plt.tight_layout(); plt.savefig(os.path.join(OUT,"02_시도대상히트맵.png"),dpi=130); plt.close()

# 점지도 미리보기
fig,ax=plt.subplots(figsize=(7,8))
cmap={"아동":"#4C78A8","청소년":"#54A24B","청년":"#EECA3B","중장년":"#F58518","노년":"#B279A2","장애인":"#E45756","유아":"#72B7B2","기타":"#999"}
for tg,c in cmap.items():
    xs=[p[0] for p in pts if p[2]==tg]; ys=[p[1] for p in pts if p[2]==tg]
    ax.scatter(xs,ys,s=12,c=c,label=tg,alpha=0.6,edgecolors="none")
ax.set_title("전국 문화예술교육 프로그램 분포 (대표 대상군별)",fontsize=12,fontweight="bold")
ax.set_xlabel("경도"); ax.set_ylabel("위도"); ax.legend(fontsize=8,markerscale=1.5,loc="upper right")
ax.set_xlim(125.5,130.0); ax.set_ylim(33.0,38.7)
plt.tight_layout(); plt.savefig(os.path.join(OUT,"04_점지도미리보기.png"),dpi=130); plt.close()

print(f"프로그램 존재 시군구: {len(sgg)}곳 / 전국 229개 기준 약 {229-len(sgg)}곳 미분포")
print(f"시도×대상 공백: {zero}칸")
print(f"최다 {scount.most_common(1)[0]} vs 최소 {min(scount.items(),key=lambda x:x[1])}")
print("저장:", [f for f in os.listdir(OUT)])
