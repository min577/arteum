# -*- coding: utf-8 -*-
"""점(프로그램) → 시군구 폴리곤 집계 + 연계용 데이터 생성"""
import csv, os, json
from collections import defaultdict, Counter
from shapely.geometry import shape, Point, mapping
from shapely.strtree import STRtree

HERE=os.path.dirname(os.path.abspath(__file__))
GEO=os.path.join(HERE,"raw","skorea-sigungu.geojson")
PROG=os.path.join(HERE,"programs_geocoded.csv")
WEBPUB=r"C:\Users\김민우\Desktop\공모전\eum\web\public"
os.makedirs(WEBPUB, exist_ok=True)

# 이 GeoJSON(southkorea-maps, base_year 2018)은 옛 통계청 코드 체계 사용
SIDO_CODE={"11":"서울","21":"부산","22":"대구","23":"인천","24":"광주","25":"대전","26":"울산",
"29":"세종","31":"경기","32":"강원","33":"충북","34":"충남","35":"전북","36":"전남",
"37":"경북","38":"경남","39":"제주"}
TGT=["유아","아동","청소년","청년","중장년","노년","장애인"]

gj=json.load(open(GEO,encoding="utf-8"))
feats=gj["features"]
geoms=[shape(f["geometry"]) for f in feats]
tree=STRtree(geoms)
reps=[g.representative_point() for g in geoms]  # 폴리곤 내부 대표점(연결선 끝점)

agg=[{"total":0,"tgt":Counter()} for _ in feats]
rows=list(csv.DictReader(open(PROG,encoding="utf-8-sig")))
row_code=[None]*len(rows)  # 각 프로그램이 속한 지역코드
placed=miss=0
for ri,r in enumerate(rows):
    try: pt=Point(float(r["lon"]),float(r["lat"]))
    except: miss+=1; continue
    hit=None
    for i in tree.query(pt):
        if geoms[i].contains(pt): hit=int(i); break
    if hit is None: miss+=1; continue
    placed+=1
    row_code[ri]=feats[hit]["properties"].get("code","")
    agg[hit]["total"]+=1
    for t in [x.strip() for x in (r.get("프로그램대상","") or "").split(",") if x.strip()]:
        agg[hit]["tgt"][t]+=1
print(f"폴리곤 배정 {placed} / 미배정 {miss}")

# 경량 GeoJSON (단순화 + 통계 + 중심좌표)
out=[]; empty=have=0
for f,g,a,rp in zip(feats,geoms,agg,reps):
    code=f["properties"].get("code",""); sido=SIDO_CODE.get(code[:2],"")
    tgt=dict(a["tgt"]); covered=sum(1 for t in TGT if tgt.get(t,0)>0)
    empty+=(a["total"]==0); have+=(a["total"]>0)
    out.append({"type":"Feature","geometry":mapping(g.simplify(0.004,preserve_topology=True)),
        "properties":{"code":code,"name":f["properties"].get("name",""),"sido":sido,
                      "total":a["total"],"covered":covered,"cx":rp.x,"cy":rp.y,
                      **{t:tgt.get(t,0) for t in TGT}}})
json.dump({"type":"FeatureCollection","features":out},
          open(os.path.join(WEBPUB,"sigungu.geojson"),"w",encoding="utf-8"),ensure_ascii=False)
print(f"sigungu.geojson 저장 ({os.path.getsize(os.path.join(WEBPUB,'sigungu.geojson'))/1024/1024:.1f}MB) | 있음 {have} / 공백 {empty}")

# 프로그램 점 데이터 (코드·기간 포함)
pts=[]
for ri,r in enumerate(rows):
    try: lat=float(r["lat"]); lon=float(r["lon"])
    except: continue
    pts.append({"name":r.get("프로그램명",""),"org":r.get("단체이름",""),
                "place":r.get("운영장소명",""),"support":r.get("지원사업명",""),
                "field":r.get("프로그램분야",""),"target":r.get("프로그램대상",""),
                "start":r.get("운영기간시작",""),"end":r.get("운영기간종료",""),
                "sido":r.get("시도",""),"sigungu":r.get("시군구",""),
                "code":row_code[ri] or "","lat":lat,"lon":lon})
json.dump(pts,open(os.path.join(WEBPUB,"programs.json"),"w",encoding="utf-8"),ensure_ascii=False)
print(f"programs.json 저장 ({len(pts)}건)")
