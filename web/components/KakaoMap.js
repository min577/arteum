"use client";
import { useEffect, useRef, useState } from "react";

const TARGETS = ["전체", "유아", "아동", "청소년", "청년", "중장년", "노년", "장애인"];
const TGT = ["유아", "아동", "청소년", "청년", "중장년", "노년", "장애인"];
const TODAY = "2026-06-22";

function shade(v, max) {
  if (v === 0) return "#E4572E";
  const t = Math.min(v / max, 1);
  const a = [209, 231, 221], b = [11, 94, 109];
  const c = a.map((l, i) => Math.round(l + (b[i] - l) * Math.sqrt(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function geomToPaths(geometry) {
  const kakao = window.kakao;
  const rings = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return rings.map((poly) => poly[0].map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
}
function dist(aLat, aLon, bLat, bLon) {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLon = (bLon - aLon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export default function KakaoMap() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const polysRef = useRef([]);
  const overlaysRef = useRef([]);
  const linesRef = useRef([]);
  const [geo, setGeo] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [jobs, setJobs] = useState(null);
  const [target, setTarget] = useState("전체");
  const [sel, setSel] = useState(null);
  const [showJobs, setShowJobs] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) { setErr("NEXT_PUBLIC_KAKAO_JS_KEY가 비어있습니다"); return; }
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    s.onload = () => window.kakao.maps.load(() => {
      mapRef.current = new window.kakao.maps.Map(mapEl.current, { center: new window.kakao.maps.LatLng(36.3, 127.8), level: 13 });
      setReady(true);
    });
    s.onerror = () => setErr("카카오 지도 SDK 로드 실패 (JS키/도메인 등록 확인)");
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    fetch("/sigungu.geojson").then((r) => r.json()).then(setGeo).catch(() => setErr("sigungu.geojson 로드 실패"));
    fetch("/programs.json").then((r) => r.json()).then(setPrograms).catch(() => {});
    fetch("/jobs.json").then((r) => r.json()).then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !geo) return;
    const kakao = window.kakao;
    polysRef.current.forEach((p) => p.setMap(null));
    polysRef.current = [];
    const valOf = (f) => (target === "전체" ? f.properties.total : f.properties[target] || 0);
    const max = Math.max(...geo.features.map(valOf), 1);
    geo.features.forEach((f) => {
      const color = shade(valOf(f), max);
      geomToPaths(f.geometry).forEach((path) => {
        const poly = new kakao.maps.Polygon({ path, fillColor: color, fillOpacity: 0.72, strokeWeight: 1, strokeColor: "#fff", strokeOpacity: 0.7 });
        poly.setMap(mapRef.current);
        kakao.maps.event.addListener(poly, "mouseover", () => poly.setOptions({ fillOpacity: 0.92 }));
        kakao.maps.event.addListener(poly, "mouseout", () => poly.setOptions({ fillOpacity: 0.72 }));
        kakao.maps.event.addListener(poly, "click", () => setSel({ ...f.properties }));
        polysRef.current.push(poly);
      });
    });
  }, [ready, geo, target]);

  const clearOverlays = () => {
    overlaysRef.current.forEach((o) => o.setMap(null)); overlaysRef.current = [];
    linesRef.current.forEach((l) => l.setMap(null)); linesRef.current = [];
  };
  const dot = (lat, lon, color, z) => {
    const ov = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(lat, lon), zIndex: z || 2,
      content: `<div style="width:11px;height:11px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    });
    ov.setMap(mapRef.current); overlaysRef.current.push(ov);
  };

  const regionPrograms = sel ? programs.filter((p) => p.code === sel.code) : [];
  let suggestions = [];
  if (sel) {
    const missing = target === "전체" ? TGT.filter((t) => (sel[t] || 0) === 0) : ((sel[target] || 0) === 0 ? [target] : []);
    const topN = target === "전체" ? 1 : 3;
    suggestions = missing.map((t) => {
      const cand = programs.filter((p) => p.target.includes(t) && p.code !== sel.code)
        .map((p) => ({ ...p, d: dist(sel.cy, sel.cx, p.lat, p.lon) }))
        .sort((a, b) => a.d - b.d).slice(0, topN);
      return { target: t, suppliers: cand };
    }).filter((s) => s.suppliers.length);
  }
  // 인력·일자리 추정
  const avg = jobs ? jobs.avgPerActiveRegion : 7;
  const jobPotential = sel ? Math.max(0, Math.ceil(avg - sel.total)) : 0;
  const jobsForTarget = (t) => (jobs ? jobs.jobsBySaup.filter((j) => j.target.includes(t)) : []);

  useEffect(() => {
    if (!ready || !sel) { clearOverlays(); return; }
    clearOverlays();
    const kakao = window.kakao;
    regionPrograms.forEach((p) => dot(p.lat, p.lon, "#2563eb", 3));
    suggestions.forEach((s) => s.suppliers.forEach((p) => {
      const line = new kakao.maps.Polyline({ path: [new kakao.maps.LatLng(sel.cy, sel.cx), new kakao.maps.LatLng(p.lat, p.lon)], strokeWeight: 2.5, strokeColor: "#E4572E", strokeOpacity: 0.85, strokeStyle: "shortdash" });
      line.setMap(mapRef.current); linesRef.current.push(line);
      dot(p.lat, p.lon, "#F58518", 4);
    }));
    dot(sel.cy, sel.cx, "#111", 5);
  }, [ready, sel, target, programs]);

  const gapCount = geo ? geo.features.filter((f) => (target === "전체" ? f.properties.total : f.properties[target] || 0) === 0).length : 0;

  return (
    <div className="relative h-screen w-screen">
      <div ref={mapEl} className="h-full w-full bg-slate-100" />

      <div className="absolute left-4 top-4 z-10 rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-black/5">
        <h1 className="text-lg font-bold text-slate-800">이음 <span className="text-teal-700">EUM</span></h1>
        <p className="text-xs text-slate-500">문화예술교육 수요·공급·인력 연결 지도 · ARTE 공공데이터</p>
      </div>

      <div className="absolute left-4 top-24 z-10 flex max-w-[18rem] flex-wrap gap-1.5">
        {TARGETS.map((t) => (
          <button key={t} onClick={() => setTarget(t)}
            className={`rounded-full px-3 py-1 text-sm font-medium shadow ring-1 ring-black/5 transition ${target === t ? "bg-teal-700 text-white" : "bg-white/95 text-slate-700 hover:bg-teal-50"}`}>{t}</button>
        ))}
      </div>

      {/* 전국 일자리·인력 토글 */}
      <button onClick={() => setShowJobs((v) => !v)}
        className="absolute left-4 top-36 z-10 mt-1 rounded-full bg-orange-600 px-3 py-1 text-sm font-medium text-white shadow ring-1 ring-black/5 hover:bg-orange-700">
        👷 전국 일자리·인력 {showJobs ? "닫기" : "보기"}
      </button>

      {showJobs && jobs && (
        <div className="absolute left-4 top-48 z-10 mt-2 w-72 rounded-2xl bg-white/97 p-4 shadow-xl ring-1 ring-black/5">
          <div className="text-sm font-bold text-orange-700">문화예술교육 = 예술인 일자리</div>
          <div className="mt-2 rounded-lg bg-orange-50 p-3">
            <div className="text-xs text-slate-500">창출 일자리 (2017)</div>
            <div className="text-2xl font-bold text-slate-800">{jobs.totalJobs2017.toLocaleString()}명</div>
          </div>
          <div className="mt-2 rounded-lg bg-teal-50 p-3">
            <div className="text-xs text-slate-500">사각지대 {jobs.emptyRegions}곳 평균 도달 시 (추정)</div>
            <div className="text-xl font-bold text-teal-700">+{jobs.potentialJobsIfAvg}개 일자리</div>
            <div className="text-[10px] text-slate-400">프로그램 1건당 최소 강사 1명 가정</div>
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-600">대상별 일자리 사업 (2017)</div>
          <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-[12px]">
            {jobs.jobsBySaup.slice(0, 6).map((j, i) => (
              <div key={i} className="flex justify-between"><span className="text-slate-600">{j.name}<span className="text-slate-400"> ·{j.target}</span></span><span className="font-medium">{j.n.toLocaleString()}</span></div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">{jobs.note}</div>
        </div>
      )}

      <div className="absolute left-4 bottom-4 z-10 rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5">
        <div className="text-xs text-slate-500">{target === "전체" ? "프로그램 0건 시군구" : `'${target}' 0건 시군구`}</div>
        <div className="text-2xl font-bold text-[#E4572E]">{gapCount}곳<span className="ml-1 text-sm font-normal text-slate-400">/ 250</span></div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#E4572E" }} /> 사각지대
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#0b5e6d" }} /> 공급많음
          <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#2563eb" }} /> 프로그램
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#F58518" }} /> 연계공급
        </div>
      </div>

      {sel && (
        <div className="absolute right-4 top-4 z-10 flex max-h-[92vh] w-80 flex-col rounded-2xl bg-white/97 shadow-xl ring-1 ring-black/5">
          <div className="flex items-start justify-between p-5 pb-2">
            <div><div className="text-xs text-slate-400">{sel.sido}</div><div className="text-xl font-bold text-slate-800">{sel.name}</div></div>
            <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="overflow-y-auto px-5 pb-5">
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-sm text-slate-500">전체 프로그램</div><div className="text-2xl font-bold text-slate-800">{sel.total}건</div></div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {TGT.map((t) => (
                <div key={t} className="flex items-center justify-between"><span className="text-slate-600">{t}</span><span className={`font-semibold ${(sel[t] || 0) === 0 ? "text-[#E4572E]" : "text-slate-800"}`}>{sel[t] || 0}</span></div>
              ))}
            </div>

            {/* 인력·일자리 */}
            <div className="mt-4 rounded-lg bg-orange-50/70 p-3">
              <div className="text-sm font-bold text-orange-700">👷 인력·일자리</div>
              {jobPotential > 0 ? (
                <p className="mt-1 text-[12px] text-slate-700">전국 평균(약 {avg}건) 수준 도달 시 <b className="text-orange-700">최소 {jobPotential}명</b>의 강사 일자리 창출 잠재 <span className="text-slate-400">(추정)</span></p>
              ) : (
                <p className="mt-1 text-[12px] text-slate-500">공급이 전국 평균 이상인 지역</p>
              )}
              {suggestions.length > 0 && (
                <div className="mt-2 space-y-1 text-[12px]">
                  {suggestions.map((s) => {
                    const jb = jobsForTarget(s.target);
                    return (
                      <div key={s.target} className="text-slate-600">
                        <b>{s.target}</b> 관련 일자리 사업: {jb.length ? jb.map((j) => `${j.name}(${j.n.toLocaleString()}명)`).join(", ") : <span className="text-[#E4572E]">전용 사업 없음 → 신규 창출 필요</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 연계 제안 */}
            {suggestions.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-sm font-bold text-[#E4572E]">🔗 연계 제안 (공백 대상)</div>
                <p className="mb-2 text-[11px] text-slate-500">없는 대상군을 위해 가장 가까운 공급주체를 연결합니다.</p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.target} className="rounded-lg border border-orange-100 bg-orange-50/60 p-2">
                      <div className="text-xs font-semibold text-orange-700">{s.target} 대상</div>
                      {s.suppliers.map((p, i) => (
                        <div key={i} className="mt-1 text-[12px] leading-tight text-slate-700">
                          <span className="font-medium">{p.org}</span><span className="text-slate-400"> · {p.sigungu}</span>
                          <span className="ml-1 rounded bg-white px-1 text-[10px] text-orange-600">{Math.round(p.d)}km</span>
                          <div className="text-[11px] text-slate-500">{p.name}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 프로그램 목록 */}
            <div className="mt-4">
              <div className="mb-1 text-sm font-bold text-slate-700">이 지역 프로그램 ({regionPrograms.length}건)</div>
              {regionPrograms.length === 0 ? (
                <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">ARTE 개방데이터상 프로그램이 확인되지 않는 사각지대입니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {regionPrograms.map((p, i) => {
                    const live = p.end && p.end >= TODAY;
                    return (
                      <div key={i} className="rounded-lg border border-slate-100 p-2 text-[12px]">
                        <div className="flex items-center justify-between"><span className="font-medium text-slate-800">{p.name}</span>
                          {live ? <span className="rounded bg-green-100 px-1 text-[10px] text-green-700">진행중</span> : <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-400">종료</span>}</div>
                        <div className="text-slate-500">{p.org} · {p.field}</div>
                        <div className="text-[11px] text-slate-400">{p.target} | {p.start}~{p.end}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {err && <div className="absolute inset-x-0 top-1/2 z-20 mx-auto w-fit rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">{err}</div>}
    </div>
  );
}
