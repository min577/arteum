# -*- coding: utf-8 -*-
"""CSV 인코딩 자동감지 + 컬럼/샘플 출력"""
import csv, os, sys, io

FILES = [
    r"C:\Users\김민우\Desktop\공모전\한국문화예술교육진흥원_문화예술교육 프로그램 목록_20251201.csv",
    r"C:\Users\김민우\Desktop\공모전\한국문화예술교육진흥원_문화예술교육 단체 목록_20251201.csv",
    r"C:\Users\김민우\Desktop\공모전\한국문화예술교육진흥원_문화예술교육 사업단위별 강사수 통계자료_20250630.csv",
]

def read_text(path):
    for enc in ("utf-8-sig", "cp949", "euc-kr", "utf-8"):
        try:
            with open(path, encoding=enc) as f:
                return f.read(), enc
        except (UnicodeDecodeError, LookupError):
            continue
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read(), "utf-8(replace)"

for path in FILES:
    name = os.path.basename(path)
    print("=" * 80)
    print(name)
    if not os.path.exists(path):
        print("  ⚠️ 파일 없음")
        continue
    text, enc = read_text(path)
    reader = list(csv.reader(io.StringIO(text)))
    if not reader:
        print("  (빈 파일)")
        continue
    header = reader[0]
    rows = reader[1:]
    print(f"  [인코딩] {enc}   [행수] {len(rows):,}   [컬럼수] {len(header)}")
    print(f"  [컬럼] {header}")
    print("  [샘플 2행]")
    for r in rows[:2]:
        # 컬럼:값 매핑으로 보기 좋게
        pairs = {header[i]: (r[i] if i < len(r) else "") for i in range(len(header))}
        print("   ", {k: v for k, v in pairs.items()})
    # '대상' 관련 컬럼 탐지 + 분포
    for i, col in enumerate(header):
        if any(key in col for key in ("대상", "연령", "수강")):
            vals = [r[i] for r in rows if i < len(r) and r[i].strip()]
            uniq = {}
            for v in vals:
                uniq[v] = uniq.get(v, 0) + 1
            top = sorted(uniq.items(), key=lambda x: -x[1])[:15]
            print(f"  ⭐ '{col}' 컬럼 값 분포 TOP15 (고유 {len(uniq)}개): {top}")
