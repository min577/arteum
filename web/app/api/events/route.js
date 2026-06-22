export const runtime = "nodejs";
export const maxDuration = 30;

// 전국공연행사정보표준데이터(data.go.kr) — 현재·예정 행사 캐시
let CACHE = { ts: 0, events: [] };
const TTL = 60 * 60 * 1000; // 1시간
// JSON에서 허용되지 않는 제어문자 제거용 (리터럴 제어문자 회피)
const CTRL = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");

function dist(aLat, aLon, bLat, bLon) {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLon = (bLon - aLon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function loadEvents(key) {
  const now = Date.now();
  if (CACHE.events.length && now - CACHE.ts < TTL) return CACHE.events;
  const today = new Date().toISOString().slice(0, 10);
  const all = [];
  for (let pg = 1; pg <= 10; pg++) {
    let raw;
    try {
      const url = `https://api.data.go.kr/openapi/tn_pubr_public_pblprfr_event_info_api?serviceKey=${encodeURIComponent(key)}&pageNo=${pg}&numOfRows=1000&type=json`;
      const res = await fetch(url);
      raw = await res.text();
    } catch { break; }
    raw = raw.replace(CTRL, " ");
    let items;
    try { items = JSON.parse(raw)?.response?.body?.items || []; } catch { continue; }
    if (!items.length) break;
    for (const x of items) {
      const lat = parseFloat(x.latitude), lon = parseFloat(x.longitude);
      if (!x.eventEndDate || x.eventEndDate < today) continue;
      if (!isFinite(lat) || !isFinite(lon)) continue;
      all.push({
        name: x.eventNm, field: x.eventCo, place: x.opar, addr: x.rdnmadr || x.lnmadr || "",
        start: x.eventStartDate, end: x.eventEndDate, charge: x.chrgeInfo || "", org: x.mnnstNm || "",
        url: x.homepageUrl || "", lat, lon,
      });
    }
  }
  if (all.length) CACHE = { ts: now, events: all };
  return all;
}

export async function GET(req) {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return Response.json({ error: "DATA_GO_KR_KEY 미설정" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const cx = parseFloat(searchParams.get("cx"));
  const cy = parseFloat(searchParams.get("cy"));
  try {
    const events = await loadEvents(key);
    let out;
    if (isFinite(cx) && isFinite(cy)) {
      out = events.map((e) => ({ ...e, d: Math.round(dist(cy, cx, e.lat, e.lon)) }))
        .filter((e) => e.d <= 40).sort((a, b) => a.d - b.d).slice(0, 15);
    } else out = events.slice(0, 15);
    return Response.json({ count: out.length, total: events.length, events: out });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
