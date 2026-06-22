# -*- coding: utf-8 -*-
"""일자리 창출(2017) + 연수 양성(2004~2015) → web/public/jobs.json"""
import csv, io, os, json
from collections import Counter

PARENT = r"C:\Users\김민우\Desktop\공모전"
WEBPUB = r"C:\Users\김민우\Desktop\공모전\eum\web\public"
JOB = os.path.join(PARENT, "한국문화예술교육진흥원 문화예술교육활성화 일자리 창출 현황(20171231)..csv")
TR  = os.path.join(PARENT, "한국문화예술교육진흥원_전문인력양성사업_연수정보_12_31_2015.csv")

def read(p):
    for enc in ("cp949","utf-8-sig","euc-kr"):
        try: return list(csv.DictReader(io.StringIO(open(p,encoding=enc).read())))
        except: pass
    return []

# 사업 → 대상군 태그 (수요-공급-인력 연결용)
TARGET_TAG = {
    "학교 예술강사":"아동·청소년","예술꽃씨앗학교":"아동·청소년","꿈의 오케스트라":"아동·청소년",
    "유아문화예술교육 지원사업":"유아","아동보호시설":"아동","지역아동센터":"아동",
    "노인복지관":"노년","장애인복지관":"장애인",
    "문화예술교육사 통합문화예술교육 프로그램":"전체","문화파출소 운영사업":"전체","지역특성화":"전체",
}

jobs=[]; total=0
for r in read(JOB):
    name=(r.get("사업명","") or "").strip()
    v=(r.get("수혜자 수(2017)","") or "").replace(",","").strip()
    if not name or not v.isdigit(): continue
    n=int(v); total+=n
    jobs.append({"name":name,"target":TARGET_TAG.get(name,"전체"),"n":n})
jobs.sort(key=lambda x:-x["n"])

field=Counter((r.get("연수분야","") or "").strip() for r in read(TR) if (r.get("연수분야","") or "").strip())
training=field.most_common(12)

# 프로그램 분포 기반 추정 파라미터
prog=json.load(open(os.path.join(WEBPUB,"programs.json"),encoding="utf-8"))
geo=json.load(open(os.path.join(WEBPUB,"sigungu.geojson"),encoding="utf-8"))
active=sum(1 for f in geo["features"] if f["properties"]["total"]>0)
empty=sum(1 for f in geo["features"] if f["properties"]["total"]==0)
avg=round(len(prog)/max(active,1),1)

out={
  "totalJobs2017": total,
  "jobsBySaup": jobs,
  "trainingByField": training,
  "totalPrograms": len(prog), "activeRegions": active, "emptyRegions": empty,
  "avgPerActiveRegion": avg,
  "potentialJobsIfAvg": round(empty*avg),  # 사각지대가 평균 수준 도달 시 최소 신규 강사 일자리(보수적)
  "note": "일자리=2017년, 연수=2004~2015 기준 ARTE 개방데이터. 지역별 강사 데이터는 미개방(향후 개방 제언). 일자리 추정은 '프로그램 1건당 최소 강사 1명' 보수적 가정.",
}
json.dump(out, open(os.path.join(WEBPUB,"jobs.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("jobs.json 저장")
print(f"  총 일자리(2017) {total:,} | 사업 {len(jobs)}개 | 양성분야 {len(training)}")
print(f"  활성 시군구 {active} / 공백 {empty} | 평균 {avg}건 | 사각지대 평균도달시 ≈{out['potentialJobsIfAvg']}개 일자리")
