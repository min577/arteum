# -*- coding: utf-8 -*-
"""프로그램 목록: 지역 × 대상 교차분석으로 '사각지대(공백)' 검증"""
import csv, io, os
from collections import defaultdict, Counter

PROG = r"C:\Users\김민우\Desktop\공모전\한국문화예술교육진흥원_문화예술교육 프로그램 목록_20251201.csv"

def read_rows(path):
    for enc in ("cp949", "utf-8-sig", "euc-kr"):
        try:
            with open(path, encoding=enc) as f:
                return list(csv.DictReader(f))
        except (UnicodeDecodeError, LookupError):
            continue
    with open(path, encoding="utf-8", errors="replace") as f:
        return list(csv.DictReader(f))

SIDO_NORM = {
    "서울특별시":"서울","부산광역시":"부산","대구광역시":"대구","인천광역시":"인천",
    "광주광역시":"광주","대전광역시":"대전","울산광역시":"울산","세종특별자치시":"세종",
    "경기도":"경기","강원특별자치도":"강원","강원도":"강원","충청북도":"충북","충청남도":"충남",
    "전북특별자치도":"전북","전라북도":"전북","전라남도":"전남","경상북도":"경북","경상남도":"경남",
    "제주특별자치도":"제주","제주도":"제주",
}
SIDO_ORDER = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"]
TARGETS = ["유아","아동","청소년","청년","중장년","노년","장애인"]

rows = read_rows(PROG)
print(f"총 프로그램: {len(rows)}건\n")

def parse_sido(addr):
    if not addr: return None
    t = addr.strip().split()
    if not t: return None
    return SIDO_NORM.get(t[0])

def parse_sigungu(addr):
    t = (addr or "").strip().split()
    return t[1] if len(t) > 1 else None

# 대상 분해
target_counter = Counter()
sido_counter = Counter()
cross = defaultdict(Counter)          # cross[sido][target] = count
sigungu_set = set()
sigungu_cross = defaultdict(set)      # sigungu -> set(targets present)
no_addr = 0

for r in rows:
    addr = r.get("운영주소","")
    sido = parse_sido(addr)
    sgg = parse_sigungu(addr)
    if not sido:
        no_addr += 1
    else:
        sido_counter[sido] += 1
    tgts = [t.strip() for t in (r.get("프로그램대상","") or "").split(",") if t.strip()]
    for t in tgts:
        target_counter[t] += 1
        if sido:
            cross[sido][t] += 1
    if sido and sgg:
        key = (sido, sgg)
        sigungu_set.add(key)
        for t in tgts:
            sigungu_cross[key].add(t)

print("■ 대상별 프로그램 수(중복 분해):")
for t,_ in target_counter.most_common():
    print(f"   {t}: {target_counter[t]}")
print(f"\n■ 주소 파싱 실패/광역미상: {no_addr}건")

print("\n■ 시도 × 대상 교차표 (빈칸=0=사각지대):")
header = "시도 |" + "".join(f"{t:>5}" for t in TARGETS)
print("   " + header)
zero_cells = 0
for s in SIDO_ORDER:
    line = f"{s:>3} |"
    for t in TARGETS:
        c = cross[s][t]
        if c == 0: zero_cells += 1
        line += f"{(c if c else '·'):>5}"
    print("   " + line)
print(f"\n   → 17시도 × 7대상 = 119칸 중 공백(0): {zero_cells}칸 ({zero_cells/119*100:.0f}%)")

# 시군구 단위 공백
print(f"\n■ 시군구 단위: 프로그램이 있는 시군구 {len(sigungu_set)}곳")
full = sum(1 for k in sigungu_set if len(sigungu_cross[k])>=5)
sparse = sum(1 for k in sigungu_set if len(sigungu_cross[k])<=2)
print(f"   - 5개 대상 이상 커버: {full}곳")
print(f"   - 2개 대상 이하만 커버(편중): {sparse}곳 ({sparse/len(sigungu_set)*100:.0f}%)")

# 분야 분포
field_counter = Counter()
for r in rows:
    for fld in (r.get("프로그램분야","") or "").split(","):
        if fld.strip(): field_counter[fld.strip()] += 1
print("\n■ 분야 분포 TOP10:", field_counter.most_common(10))
