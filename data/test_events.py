# -*- coding: utf-8 -*-
"""현재 진행중 문화행사 API 3종 탐색 (응답구조·파라미터 파악)"""
import os, json, urllib.parse, urllib.request, ssl

HERE = os.path.dirname(os.path.abspath(__file__))
env = {}
for line in open(os.path.join(HERE, ".env"), encoding="utf-8"):
    s = line.strip()
    if s and not s.startswith("#") and "=" in s:
        k, v = s.split("=", 1); env[k.strip()] = v.strip()

print("== .env 키 목록 ==")
for k in env: print(f"  {k} (길이 {len(env[k])})")

DATAGO = env.get("ARTE_KEY", "")  # data.go.kr 계정 일반 인증키(Decoding) — 계정 단위라 타 API에도 통함
# kcisa 키 후보: ARTE/KAKAO/ANTHROPIC 아닌 것
KCISA = ""
for k, v in env.items():
    if any(x in k.upper() for x in ["CNV", "KCISA", "CULTURE", "EVENT", "PERF", "공연"]):
        KCISA = v; print(f"  → kcisa 키로 '{k}' 사용"); break
if not KCISA:
    cand = [v for k, v in env.items() if not any(x in k.upper() for x in ["ARTE", "KAKAO", "ANTHROPIC"])]
    KCISA = cand[-1] if cand else DATAGO

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def call(label, url, params):
    q = urllib.parse.urlencode(params, safe="")
    full = f"{url}?{q}"
    print(f"\n===== {label} =====\n{url}")
    try:
        req = urllib.request.Request(full, headers={"User-Agent": "eum"})
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            raw = r.read().decode("utf-8", "replace")
        print(f"[상태] {r.status}")
        try:
            print(json.dumps(json.loads(raw), ensure_ascii=False, indent=1)[:2200])
        except Exception:
            print("[원문]\n" + raw[:2200])
    except Exception as e:
        print(f"[에러] {e}")

# 1) 전국공연행사정보표준데이터 (data.go.kr 표준)
call("전국공연행사 표준데이터", "https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api",
     {"serviceKey": DATAGO, "pageNo": "1", "numOfRows": "3", "type": "json"})

# 2) 한눈에보는 문화정보조회 (B553457) — operation 후보 탐색
for op in ["/period2", "/area2", "/realm2", ""]:
    call(f"한눈에보는{op or '(base)'}", "https://apis.data.go.kr/B553457/cultureinfo" + op,
         {"serviceKey": DATAGO, "numOfRows": "3", "PageNo": "1", "from": "20260601", "to": "20260831"})

# 3) 문체부 문화예술공연 (kcisa CNV_060)
call("문체부 CNV_060", "https://api.kcisa.kr/openapi/CNV_060/request",
     {"serviceKey": KCISA, "numOfRows": "3", "pageNo": "1"})
