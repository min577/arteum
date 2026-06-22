"use client";
import { useEffect, useRef, useState } from "react";

const TARGETS = ["전체", "유아", "아동", "청소년", "청년", "중장년", "노년", "장애인"];

// 공급량 → 색 (0=빨강 사각지대, 많을수록 진한 청록)
function shade(v, max) {
  if (v === 0) return "#E4572E";
  const t = Math.min(v / max, 1);
  const light = [209, 231, 221]; // 연한 청록
  const dark = [11, 94, 109];    // 진한 청록
  const c = light.map((l, i) => Math.round(l + (dark[i] - l) * Math.sqrt(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function geomToPaths(geometry) {
  const kakao = window.kakao;
  const paths = [];
  const rings =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.coordinates; // MultiPolygon
  rings.forEach((poly) => {
    const outer = poly[0]; // 외곽 링만
    paths.push(outer.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
  });
  return paths;
}

export default function KakaoMap() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const polysRef = useRef([]);
  const [geo, setGeo] = useState(null);
  const [target, setTarget] = useState("전체");
  const [sel, setSel] = useState(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  // SDK + 지도 초기화
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) { setErr("NEXT_PUBLIC_KAKAO_JS_KEY가 비어있습니다 (.env.local 확인)"); return; }
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    s.onload = () =>
      window.kakao.maps.load(() => {
        mapRef.current = new window.kakao.maps.Map(mapEl.current, {
          center: new window.kakao.maps.LatLng(36.3, 127.8),
          level: 13,
        });
        setReady(true);
      });
    s.onerror = () => setErr("카카오 지도 SDK 로드 실패 (JS키/도메인 등록 확인)");
    document.head.appendChild(s);
  }, []);

  // 데이터 로드
  useEffect(() => {
    fetch("/sigungu.geojson").then((r) => r.json()).then(setGeo).catch(() => setErr("sigungu.geojson 로드 실패"));
  }, []);

  // 폴리곤 그리기 (지도/데이터/필터 변경 시)
  useEffect(() => {
    if (!ready || !geo || !mapRef.current) return;
    const kakao = window.kakao;
    polysRef.current.forEach((p) => p.setMap(null));
    polysRef.current = [];
    const valOf = (f) => (target === "전체" ? f.properties.total : f.properties[target] || 0);
    const max = Math.max(...geo.features.map(valOf), 1);

    geo.features.forEach((f) => {
      const v = valOf(f);
      const color = shade(v, max);
      geomToPaths(f.geometry).forEach((path) => {
        const poly = new kakao.maps.Polygon({
          path, fillColor: color, fillOpacity: 0.72,
          strokeWeight: 1, strokeColor: "#ffffff", strokeOpacity: 0.7,
        });
        poly.setMap(mapRef.current);
        kakao.maps.event.addListener(poly, "mouseover", () => poly.setOptions({ fillOpacity: 0.92 }));
        kakao.maps.event.addListener(poly, "mouseout", () => poly.setOptions({ fillOpacity: 0.72 }));
        kakao.maps.event.addListener(poly, "click", () => setSel({ ...f.properties, _v: v }));
        polysRef.current.push(poly);
      });
    });
  }, [ready, geo, target]);

  const gapCount = geo
    ? geo.features.filter((f) => (target === "전체" ? f.properties.total : f.properties[target] || 0) === 0).length
    : 0;

  return (
    <div className="relative h-screen w-screen">
      <div ref={mapEl} className="h-full w-full bg-slate-100" />

      {/* 헤더 */}
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <div className="pointer-events-auto rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-black/5">
          <h1 className="text-lg font-bold text-slate-800">
            이음 <span className="text-teal-700">EUM</span>
          </h1>
          <p className="text-xs text-slate-500">문화예술교육 수요·공급 연결 지도 · ARTE 공공데이터</p>
        </div>
      </div>

      {/* 대상 필터 */}
      <div className="absolute left-4 top-24 z-10 flex max-w-[18rem] flex-wrap gap-1.5">
        {TARGETS.map((t) => (
          <button
            key={t}
            onClick={() => { setTarget(t); setSel(null); }}
            className={`pointer-events-auto rounded-full px-3 py-1 text-sm font-medium shadow ring-1 ring-black/5 transition ${
              target === t ? "bg-teal-700 text-white" : "bg-white/95 text-slate-700 hover:bg-teal-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 사각지대 카운터 */}
      <div className="absolute left-4 bottom-4 z-10 rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5">
        <div className="text-xs text-slate-500">{target === "전체" ? "프로그램 0건 시군구" : `'${target}' 대상 0건 시군구`}</div>
        <div className="text-2xl font-bold text-[#E4572E]">{gapCount}곳<span className="ml-1 text-sm font-normal text-slate-400">/ 250</span></div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#E4572E" }} /> 사각지대
          <span className="ml-2 inline-block h-3 w-3 rounded-sm" style={{ background: "#0b5e6d" }} /> 공급 많음
        </div>
      </div>

      {/* 선택 패널 */}
      {sel && (
        <div className="absolute right-4 top-4 z-10 w-72 rounded-2xl bg-white/97 p-5 shadow-xl ring-1 ring-black/5">
          <button onClick={() => setSel(null)} className="float-right text-slate-400 hover:text-slate-600">✕</button>
          <div className="text-xs text-slate-400">{sel.sido}</div>
          <div className="text-xl font-bold text-slate-800">{sel.name}</div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <div className="text-sm text-slate-500">전체 프로그램</div>
            <div className="text-2xl font-bold text-slate-800">{sel.total}건</div>
          </div>
          <div className="mt-3 space-y-1.5">
            {["유아","아동","청소년","청년","중장년","노년","장애인"].map((t) => (
              <div key={t} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t}</span>
                <span className={`font-semibold ${(sel[t]||0)===0 ? "text-[#E4572E]" : "text-slate-800"}`}>
                  {sel[t] || 0}건 {(sel[t]||0)===0 && "· 공백"}
                </span>
              </div>
            ))}
          </div>
          {sel.total === 0 && (
            <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
              이 지역은 ARTE 개방데이터상 문화예술교육 프로그램이 확인되지 않는 사각지대입니다.
            </p>
          )}
        </div>
      )}

      {err && (
        <div className="absolute inset-x-0 top-1/2 z-20 mx-auto w-fit rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {err}
        </div>
      )}
    </div>
  );
}
