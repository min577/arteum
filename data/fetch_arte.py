# -*- coding: utf-8 -*-
"""
이음(EUM) - ARTE 자원지도 OpenAPI 호출 테스트
================================================
목적: (1) 인증키가 작동하는지 확인, (2) 응답 필드(특히 대상/연령·지역·좌표) 확인

설정: 같은 폴더의 .env 파일에 ARTE_KEY / ARTE_ORG_URL / ARTE_PROGRAM_URL 을 채우세요.
실행: python "C:\\Users\\김민우\\Desktop\\공모전\\eum\\data\\fetch_arte.py"

의존성 없음(urllib만 사용). pip install 불필요.
"""

import os
import json
import urllib.parse
import urllib.request

# ── .env 로더 (python-dotenv 불필요) ────────────────────────
def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_HERE = os.path.dirname(os.path.abspath(__file__))
load_env(os.path.join(_HERE, ".env"))

# ── 설정값 읽기 ─────────────────────────────────────────────
SERVICE_KEY = os.environ.get("ARTE_KEY", "").strip()
ORG_URL     = os.environ.get("ARTE_ORG_URL", "").strip()
PROGRAM_URL = os.environ.get("ARTE_PROGRAM_URL", "").strip()
TYPE_PARAM  = os.environ.get("ARTE_TYPE_PARAM", "type").strip() or "type"


def call(label, url):
    if not url:
        print(f"\n[{label}] ⚠️  .env에 요청주소가 비어있음 — 건너뜀")
        return
    params = {
        "serviceKey": SERVICE_KEY,   # Decoding 키 기준 (urlencode가 처리)
        "pageNo": "1",
        "numOfRows": "5",
        TYPE_PARAM: "json",
    }
    query = urllib.parse.urlencode(params, safe="")
    full = f"{url}?{query}"
    print(f"\n=== {label} ===")
    print(f"[요청] {url}")
    try:
        req = urllib.request.Request(full, headers={"User-Agent": "eum-test"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        print(f"[상태] {resp.status}")
        try:
            data = json.loads(raw)
            print("[응답 JSON]")
            print(json.dumps(data, ensure_ascii=False, indent=2)[:3500])
            print("\n>>> '대상/연령', '주소/지역', '위도/경도', '분야', '운영주체', '신청방법' 필드 확인!")
        except json.JSONDecodeError:
            print("[응답 원문 (JSON 아님 — XML/에러일 수 있음)]")
            print(raw[:2000])
    except Exception as e:
        print(f"[에러] {e}")
        print(">>> 키 미승인/엔드포인트 오류/서비스 종료 가능성. 안 되면 파일데이터로 대체.")


if __name__ == "__main__":
    if not SERVICE_KEY:
        print("⚠️  .env의 ARTE_KEY가 비어있습니다. 일반 인증키(Decoding)를 넣어주세요.")
    if not ORG_URL and not PROGRAM_URL:
        print("⚠️  .env의 ARTE_ORG_URL / ARTE_PROGRAM_URL 요청주소가 비어있습니다.")
    call("단체 조회", ORG_URL)
    call("프로그램 조회", PROGRAM_URL)
