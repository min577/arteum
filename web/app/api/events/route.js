import EVENTS from "./events.json";

export const runtime = "nodejs";

// 현재·예정 문화행사 — 정적 스냅샷(공공데이터포털 표준데이터+한눈에보는)을 읽어 거리 필터.
// 갱신: data/build_events.py 재실행 → events.json 갱신 → 재배포.

function dist(aLat, aLon, bLat, bLon) {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLon = (bLon - aLon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const cx = parseFloat(searchParams.get("cx"));
  const cy = parseFloat(searchParams.get("cy"));
  const today = new Date().toISOString().slice(0, 10);
  // 스냅샷 중 아직 종료되지 않은 행사만 (현재성 유지)
  const events = (Array.isArray(EVENTS) ? EVENTS : []).filter((e) => (e.end || "") >= today);
  if (!(isFinite(cx) && isFinite(cy))) {
    return Response.json({ count: events.length, total: events.length, far: false, events: events.slice(0, 15) });
  }
  const ranked = events.map((e) => ({ ...e, d: Math.round(dist(cy, cx, e.lat, e.lon)) })).sort((a, b) => a.d - b.d);
  const near = ranked.filter((e) => e.d <= 40).slice(0, 15);
  const far = near.length === 0;
  return Response.json({ count: near.length, total: events.length, far, events: far ? ranked.slice(0, 3) : near });
}
