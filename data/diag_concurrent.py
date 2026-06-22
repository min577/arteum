# -*- coding: utf-8 -*-
import os, json, re, urllib.parse, urllib.request, ssl
import concurrent.futures as cf

env = {}
for l in open(os.path.join(os.path.dirname(__file__), ".env"), encoding="utf-8"):
    l = l.strip()
    if l and not l.startswith("#") and "=" in l:
        k, v = l.split("=", 1); env[k.strip()] = v.strip()
KEY = env["ARTE_KEY"]
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

def page(pg):
    url = "https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api?" + urllib.parse.urlencode(
        {"serviceKey": KEY, "pageNo": pg, "numOfRows": 1000, "type": "json"})
    try:
        with urllib.request.urlopen(url, timeout=25, context=ctx) as r:
            raw = CTRL.sub(" ", r.read().decode("utf-8", "replace"))
        n = len(json.loads(raw)["response"]["body"]["items"])
        return (pg, "OK", n)
    except Exception as e:
        return (pg, "ERR", str(e)[:70])

print("single page1:", page(1))
print("10 concurrent:")
with cf.ThreadPoolExecutor(max_workers=10) as ex:
    for r in sorted(ex.map(page, range(1, 11))):
        print("  ", r)
