# -*- coding: utf-8 -*-
"""점(프로그램) → 시군구 폴리곤 집계 + 웹용 경량 GeoJSON/JSON 생성"""
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

# 집계 구조
agg=[{"total":0, "tgt":Counter(), "pts":[]} for _ in feats]

rows=list(csv.DictReader(open(PROG,encoding="utf-8-sig")))
placed=0; miss=0
for r in rows:
    try:
        pt=Point(float(r["lon"]), float(r["lat"]))
    except:
        miss+=1; continue
    idxs=tree.query(pt)   # 후보 인덱스
    hit=None
    for i in idxs:
        if geoms[i].contains(pt):
            hit=int(i); break
    if hit is None:
        miss+=1; continue
    placed+=1
    agg[hit]["total"]+=1
    for t in [x.strip() for x in (r.get("프로그램대상","") or "").split(",") if x.strip()]:
        agg[hit]["tgt"][t]+=1

print(f"폴리곤 배정 {placed} / 미배정 {miss}")

# 경량 GeoJSON (geometry 단순화 + 통계 임베드)
out_feats=[]
empty=0; have=0
for f,g,a in zip(feats, geoms, agg):
    code=f["properties"].get("code","")
    sido=SIDO_CODE.get(code[:2],"")
    name=f["properties"].get("name","")
    simp=g.simplify(0.004, preserve_topology=True)
    tgt=dict(a["tgt"])
    covered=sum(1 for t in TGT if tgt.get(t,0)>0)
    if a["total"]==0: empty+=1
    else: have+=1
    out_feats.append({
        "type":"Feature",
        "geometry":mapping(simp),
        "properties":{"code":code,"name":name,"sido":sido,
                      "total":a["total"],"covered":covered,
                      **{t:tgt.get(t,0) for t in TGT}}
    })

json.dump({"type":"FeatureCollection","features":out_feats},
          open(os.path.join(WEBPUB,"sigungu.geojson"),"w",encoding="utf-8"),
          ensure_ascii=False)
sz=os.path.getsize(os.path.join(WEBPUB,"sigungu.geojson"))/1024/1024
print(f"sigungu.geojson 저장 ({sz:.1f}MB) | 프로그램 있는 구역 {have} / 공백 {empty}")

# 점 데이터(마커용) — 가벼운 JSON
pts=[]
for r in rows:
    try: lon=float(r["lon"]); lat=float(r["lat"])
    except: continue
    pts.append({"name":r.get("프로그램명",""),"org":r.get("단체이름",""),
                "place":r.get("운영장소명",""),"field":r.get("프로그램분야",""),
                "target":r.get("프로그램대상",""),"sido":r.get("시도",""),
                "sigungu":r.get("시군구",""),"lat":lat,"lon":lon})
json.dump(pts, open(os.path.join(WEBPUB,"programs.json"),"w",encoding="utf-8"), ensure_ascii=False)
print(f"programs.json 저장 ({len(pts)}건)")

# 공백 구역 리스트(제안서용)
empties=sorted([(SIDO_CODE.get(f['properties'].get('code','')[:2],''), f['properties'].get('name',''))
                for f,a in zip(feats,agg) if a['total']==0])
print(f"\n■ 프로그램 0건 구역 {len(empties)}곳 (샘플 25):")
print("  ", empties[:25])
