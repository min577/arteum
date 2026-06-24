"use client";
import { useEffect, useRef, useState } from "react";
import Tour from "./Tour";

const TOUR_STEPS = [
  { sel: null, title: "이음(EUM)에 오신 걸 환영해요", body: "ARTE 공공데이터로 문화예술교육의 사각지대를 찾아, 공급주체·강사·AI 제안·현재 문화행사까지 한 화면에서 잇는 지도입니다." },
  { sel: '[data-tour="region"]', title: "① 지역 선택", body: "시·도 → 시·군·구로 지역을 고르거나, 지도에서 직접 클릭하세요." },
  { sel: '[data-tour="targets"]', title: "② 대상군 필터", body: "유아·아동·…·장애인별로 공급 현황을 색으로 봅니다. 빨강일수록 공백이에요." },
  { sel: '[data-tour="legend"]', title: "③ 지도 읽기", body: "빨강=프로그램 0건 사각지대, 청록이 진할수록 공급이 많아요. 점은 프로그램·연계공급·문화행사." },
  { sel: '[data-tour="jobs"]', title: "④ 일자리·인력", body: "문화예술교육은 예술인 일자리와 직결돼요. 전국 일자리·강사 양성 현황을 볼 수 있어요." },
  { sel: null, title: "지역을 클릭하면 종합 진단", body: "수요·공급 진단 → 인근 공급주체 연계 → AI 프로그램 제안 → 현재 문화행사까지. 🏛 ARTE 기획자와 🧑‍🎨 구직 예술가 모두를 위한 정보예요." },
];

const TOUR2_STEPS = [
  { sel: '[data-tour="diag"]', title: "종합 진단", body: "이 지역의 문화 수요(현재 행사 수)와 교육 공급 부족(전국평균 대비)을 한눈에. ‘우선 보강 대상’과 두 독자(🏛ARTE/🧑‍🎨예술가) 관점을 보여줘요." },
  { sel: '[data-tour="link-ai"]', title: "연계 & AI 처방", body: "부족한 대상을 인근 공급주체와 연결하고, ‘✨ AI 프로그램 제안 받기’를 누르면 맞춤 프로그램·필요 강사 역량(연수 실데이터)을 제안받아요." },
  { sel: '[data-tour="events"]', title: "현재·예정 문화행사", body: "인근에서 지금 열리는 문화행사예요. 카드를 누르면 지도 위치·정보가 뜨고, ‘바로가기’로 행사 페이지로 이동할 수 있어요." },
];

const TARGETS = ["전체", "유아", "아동", "청소년", "청년", "중장년", "노년", "장애인"];
const TGT = ["유아", "아동", "청소년", "청년", "중장년", "노년", "장애인"];
const TODAY = "2026-06-22";

// 공급량 → 색 (0=사각지대 빨강, 많을수록 진한 청록)
function shade(v, max) {
  if (v === 0) return "#ef4444";
  const t = Math.min(v / max, 1);
  const light = [165, 243, 233]; // teal-200
  const dark = [13, 110, 102];   // teal-700
  const c = light.map((l, i) => Math.round(l + (dark[i] - l) * Math.sqrt(t)));
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
  const popupRef = useRef(null);
  const eventOverlaysRef = useRef([]);
  const [geo, setGeo] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [jobs, setJobs] = useState(null);
  const [target, setTarget] = useState("전체");
  const [sel, setSel] = useState(null);
  const [showJobs, setShowJobs] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [aiIdeas, setAiIdeas] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [events, setEvents] = useState([]);
  const [evLoading, setEvLoading] = useState(false);
  const [evFar, setEvFar] = useState(false);
  const [filterSido, setFilterSido] = useState("");
  const [role, setRole] = useState("supply"); // supply | seeker | demand
  const [seekTarget, setSeekTarget] = useState("");
  const [seekAdvice, setSeekAdvice] = useState(null);
  const [seekLoading, setSeekLoading] = useState(false);
  const [appeals, setAppeals] = useState({});
  const [tourOpen, setTourOpen] = useState(false);

  // 온보딩: 새로고침마다 1회 실행(세션 단위), 닫으면 그 세션 동안 재실행 안 함
  useEffect(() => { setTourOpen(true); }, []);
  const closeTour = () => setTourOpen(false);
  const [tour2Open, setTour2Open] = useState(false);
  const tour2ShownRef = useRef(false);
  useEffect(() => {
    if (!sel || tourOpen || tour2ShownRef.current) return;
    tour2ShownRef.current = true;
    const t = setTimeout(() => setTour2Open(true), 400);
    return () => clearTimeout(t);
  }, [sel?.code, tourOpen]);
  const closeTour2 = () => setTour2Open(false);

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
        const poly = new kakao.maps.Polygon({ path, fillColor: color, fillOpacity: 0.82, strokeWeight: 1, strokeColor: "#ffffff", strokeOpacity: 0.9 });
        poly.setMap(mapRef.current);
        kakao.maps.event.addListener(poly, "mouseover", () => poly.setOptions({ fillOpacity: 0.97, strokeWeight: 2.5, strokeColor: "#0f172a" }));
        kakao.maps.event.addListener(poly, "mouseout", () => poly.setOptions({ fillOpacity: 0.82, strokeWeight: 1, strokeColor: "#ffffff" }));
        kakao.maps.event.addListener(poly, "click", () => setSel({ ...f.properties }));
        polysRef.current.push(poly);
      });
    });
  }, [ready, geo, target]);

  const clearOverlays = () => {
    overlaysRef.current.forEach((o) => o.setMap(null)); overlaysRef.current = [];
    linesRef.current.forEach((l) => l.setMap(null)); linesRef.current = [];
    if (popupRef.current) { popupRef.current.setMap(null); popupRef.current = null; }
  };
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const openPopup = (lat, lon, html) => {
    if (!mapRef.current || !window.kakao) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(lat, lon);
    if (mapRef.current.getLevel() > 6) mapRef.current.setLevel(6);
    mapRef.current.panTo(pos);
    if (popupRef.current) popupRef.current.setMap(null);
    const el = document.createElement("div");
    el.style.cssText = "filter:drop-shadow(0 8px 18px rgba(15,23,42,.28))";
    el.innerHTML =
      `<div style="position:relative;box-sizing:border-box;background:#fff;border-radius:14px;padding:12px 30px 12px 14px;width:280px;max-width:80vw;font-family:Pretendard,sans-serif;line-height:1.5;white-space:normal;overflow-wrap:anywhere;word-break:break-word">`
      + `<div class="eum-x" style="position:absolute;top:7px;right:9px;cursor:pointer;color:#94a3b8;font-size:15px;font-weight:700">×</div>`
      + html
      + `</div>`
      + `<div style="position:absolute;left:50%;bottom:-6px;margin-left:-7px;width:14px;height:14px;background:#fff;transform:rotate(45deg)"></div>`;
    const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1.18, xAnchor: 0.5, zIndex: 100 });
    el.querySelector(".eum-x").addEventListener("click", () => { ov.setMap(null); if (popupRef.current === ov) popupRef.current = null; });
    ov.setMap(mapRef.current);
    popupRef.current = ov;
  };
  const showInfo = (p) => {
    const t = trainingFor(p.field);
    const tline = `<div style="margin-top:7px;padding-top:7px;border-top:1px solid #eef2f7;font-size:11px;color:#475569">`
      + (t ? `🧑‍🏫 이 분야 강사 양성: ‘${esc(t.field)}’ 연수 <b>${t.count.toLocaleString()}건</b> · 평균 <b>${t.avgHours}시간</b><br/>` : ``)
      + `📜 자격: <b>문화예술교육사</b> <span style="color:#94a3b8">(ARTE 실데이터)</span></div>`;
    openPopup(p.lat, p.lon,
      `<b style="color:#0f172a;font-size:13px">${esc(p.name)}</b><br/><span style="color:#0d9488;font-size:12px">${esc(p.field)}</span>`
      + `<div style="font-size:12px;color:#64748b;margin-top:3px">📍 ${esc(p.place)}</div>`
      + `<div style="font-size:12px;color:#94a3b8">👥 ${esc(p.target)} · 📅 ${esc(p.start)} ~ ${esc(p.end)}</div>`
      + tline);
  };
  const showEventInfo = (e) => {
    openPopup(e.lat, e.lon,
      `<b style="color:#be185d;font-size:13px">🎭 ${esc(e.name)}</b><br/><span style="color:#0d9488;font-size:12px">${esc(e.field)}</span>`
      + `<div style="font-size:12px;color:#64748b;margin-top:3px">📍 ${esc(e.place || e.addr)}</div>`
      + `<div style="font-size:12px;color:#94a3b8">📅 ${esc(e.start)} ~ ${esc(e.end)} · ${esc(e.charge)}</div>`
      + (e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:7px;color:#2563eb;font-size:12px;font-weight:600">🔗 행사 정보 바로가기 →</a>` : ``));
  };
  const dot = (lat, lon, color, z, big) => {
    const sz = big ? 16 : 11;
    const ov = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(lat, lon), zIndex: z || 2,
      content: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
    });
    ov.setMap(mapRef.current); overlaysRef.current.push(ov);
  };

  // 대상별 전국평균(공급 있는 시군구 기준) → 부족분
  const avgByTarget = {};
  if (geo) {
    const act = geo.features.filter((f) => f.properties.total > 0);
    TGT.forEach((t) => { avgByTarget[t] = act.length ? act.reduce((s, f) => s + (f.properties[t] || 0), 0) / act.length : 0; });
  }
  let diag = null;
  if (sel) {
    const need = TGT.map((t) => ({ t, cur: sel[t] || 0, avg: avgByTarget[t] || 0, need: Math.max(0, Math.round((avgByTarget[t] || 0) - (sel[t] || 0))) }))
      .sort((a, b) => b.need - a.need || a.cur - b.cur);
    diag = { need, top: need.filter((x) => x.need > 0) };
  }

  const regionPrograms = sel ? programs.filter((p) => p.code === sel.code) : [];
  // 지원사업(행사) 단위로 묶기
  const progGroups = (() => {
    const m = {};
    regionPrograms.forEach((p) => {
      const k = p.support && p.support.trim() ? p.support.trim() : "개별 운영 프로그램";
      (m[k] = m[k] || []).push(p);
    });
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
  })();
  let suggestions = [];
  if (sel) {
    const cand = target === "전체"
      ? (diag ? diag.top.map((x) => x.t) : [])
      : (((sel[target] || 0) < (avgByTarget[target] || 0.5)) ? [target] : []);
    const topN = target === "전체" ? 1 : 3;
    suggestions = cand.slice(0, 4).map((t) => {
      const list = programs.filter((p) => p.target.includes(t) && p.code !== sel.code)
        .map((p) => ({ ...p, d: dist(sel.cy, sel.cx, p.lat, p.lon) }))
        .sort((a, b) => a.d - b.d).slice(0, topN);
      return { target: t, cur: sel[t] || 0, need: (diag ? (diag.need.find((n) => n.t === t)?.need ?? 0) : 0), suppliers: list };
    }).filter((s) => s.suppliers.length);
  }
  const avg = jobs ? jobs.avgPerActiveRegion : 7;
  const jobPotential = sel ? Math.max(0, Math.ceil(avg - sel.total)) : 0;
  const jobsForTarget = (t) => (jobs ? jobs.jobsBySaup.filter((j) => j.target.includes(t)) : []);
  const trainingFor = (field) => {
    if (!jobs?.trainingByField || !field) return null;
    const f = String(field);
    return jobs.trainingByField.find((t) => f.includes(t.field) || t.field.includes(f)) || null;
  };

  useEffect(() => {
    if (!ready || !sel) { clearOverlays(); return; }
    clearOverlays();
    const kakao = window.kakao;
    // 선택 지역 경계 강조
    if (geo) {
      const f = geo.features.find((x) => x.properties.code === sel.code);
      if (f) geomToPaths(f.geometry).forEach((path) => {
        const ol = new kakao.maps.Polyline({ path: [...path, path[0]], strokeWeight: 4, strokeColor: "#0f172a", strokeOpacity: 0.95 });
        ol.setMap(mapRef.current); linesRef.current.push(ol);
      });
    }
    regionPrograms.forEach((p) => dot(p.lat, p.lon, "#2563eb", 3));
    suggestions.forEach((s) => s.suppliers.forEach((p) => {
      const line = new kakao.maps.Polyline({ path: [new kakao.maps.LatLng(sel.cy, sel.cx), new kakao.maps.LatLng(p.lat, p.lon)], strokeWeight: 2.5, strokeColor: "#f97316", strokeOpacity: 0.9, strokeStyle: "shortdash" });
      line.setMap(mapRef.current); linesRef.current.push(line);
      dot(p.lat, p.lon, "#f97316", 4);
    }));
    dot(sel.cy, sel.cx, "#0f172a", 5, true);
  }, [ready, sel, target, programs, geo]);

  useEffect(() => { setAiIdeas({}); setAiLoading({}); }, [sel?.code]);

  // 선택 지역 인근 현재·예정 문화행사 (타기관 라이브)
  useEffect(() => {
    if (!sel) { setEvents([]); return; }
    setEvLoading(true);
    fetch(`/api/events?cx=${sel.cx}&cy=${sel.cy}`)
      .then((r) => r.json()).then((d) => { setEvents(d.events || []); setEvFar(!!d.far); })
      .catch(() => { setEvents([]); setEvFar(false); }).finally(() => setEvLoading(false));
  }, [sel?.code]);

  // 행사 마커(분홍)
  useEffect(() => {
    eventOverlaysRef.current.forEach((o) => o.setMap(null));
    eventOverlaysRef.current = [];
    if (!ready || !mapRef.current || !window.kakao) return;
    const kakao = window.kakao;
    events.forEach((e) => {
      const ov = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(e.lat, e.lon), zIndex: 6,
        content: `<div style="width:10px;height:10px;border-radius:50%;background:#db2777;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
      });
      ov.setMap(mapRef.current); eventOverlaysRef.current.push(ov);
    });
  }, [ready, events]);

  const askAI = async (s) => {
    setAiLoading((m) => ({ ...m, [s.target]: true }));
    try {
      const res = await fetch("/api/suggest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sido: sel.sido, sigungu: sel.name, target: s.target, nearby: s.suppliers,
          demand: events.length, far: evFar, need: s.need ?? 0, cur: s.cur ?? 0 }),
      });
      const data = await res.json();
      setAiIdeas((m) => ({ ...m, [s.target]: data }));
    } catch (e) {
      setAiIdeas((m) => ({ ...m, [s.target]: { error: String(e) } }));
    }
    setAiLoading((m) => ({ ...m, [s.target]: false }));
  };

  useEffect(() => { if (sel) setFilterSido(sel.sido); }, [sel?.code]);
  useEffect(() => { setSeekAdvice(null); }, [sel?.code, seekTarget]);

  // 지역 선택(시도→시군구) 인덱스
  const SIDO_ORDER = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  const regions = {};
  if (geo) for (const f of geo.features) { const p = f.properties; (regions[p.sido] = regions[p.sido] || []).push(p); }
  for (const s in regions) regions[s].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const sidos = SIDO_ORDER.filter((s) => regions[s]);
  const goRegion = (p) => {
    setSel({ ...p });
    if (mapRef.current && window.kakao) { mapRef.current.setLevel(10); mapRef.current.panTo(new window.kakao.maps.LatLng(p.cy, p.cx)); }
  };

  // 구직자: '활동은 있는데(전체 프로그램 있음) 그 대상만 부족한' = 수요 대비 공백이 큰 지역
  const seekRanked = (role === "seeker" && seekTarget && geo)
    ? (() => {
        const props = geo.features.map((f) => f.properties);
        const lacking = props.filter((p) => (p[seekTarget] || 0) < (avgByTarget[seekTarget] || 0.5));
        const pool = lacking.length ? lacking : props;
        // 전체 활동량(수요 proxy) 높은 순 → 같은 경우 대상 공급 적은 순
        return pool.sort((a, b) => (b.total - a.total) || ((a[seekTarget] || 0) - (b[seekTarget] || 0))).slice(0, 10);
      })()
    : [];
  const askSeekAdvice = async () => {
    if (!sel || !seekTarget) return;
    setSeekLoading(true);
    try {
      const cur = sel[seekTarget] || 0;
      const need = diag ? (diag.need.find((n) => n.t === seekTarget)?.need ?? 0) : 0;
      const res = await fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sido: sel.sido, sigungu: sel.name, target: seekTarget, nearby: [], demand: events.length, far: evFar, need, cur }) });
      setSeekAdvice(await res.json());
    } catch (e) { setSeekAdvice({ error: String(e) }); }
    setSeekLoading(false);
  };
  const doAppeal = (t) => {
    if (!sel) return;
    const k = `appeal_${sel.code}_${t}`;
    let n = 0; try { n = parseInt(localStorage.getItem(k) || "0", 10); } catch {}
    n += 1; try { localStorage.setItem(k, String(n)); } catch {}
    setAppeals((a) => ({ ...a, [k]: n }));
  };
  const getAppeal = (t) => {
    if (!sel) return 0;
    const k = `appeal_${sel.code}_${t}`;
    if (appeals[k] != null) return appeals[k];
    try { return parseInt(localStorage.getItem(k) || "0", 10); } catch { return 0; }
  };

  const gapCount = geo ? geo.features.filter((f) => (target === "전체" ? f.properties.total : f.properties[target] || 0) === 0).length : 0;
  const isGapRegion = sel && (target === "전체" ? sel.total === 0 : (sel[target] || 0) === 0);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      <div ref={mapEl} className="h-full w-full" />

      {/* ── 좌상단: 타이틀 + 필터 ── */}
      <div className="absolute left-4 top-4 z-10 w-[19rem] space-y-2.5">
        <div className="relative rounded-2xl bg-white/95 px-5 py-3.5 shadow-lg ring-1 ring-slate-900/10 backdrop-blur">
          <button onClick={() => setTourOpen(true)} title="사용 안내" className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500 transition hover:bg-teal-100 hover:text-teal-700">?</button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">이음</h1>
            <span className="text-sm font-bold text-teal-600">EUM</span>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-500">문화예술교육 수요·공급·인력 연결 지도</p>
          <span className="mt-1.5 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-600/15">ARTE 공공데이터 기반</span>
          <div className="mt-2.5 flex gap-1 rounded-xl bg-slate-100 p-1">
            {[["supply", "🏛 공급자"], ["seeker", "🧑‍🎨 구직자"], ["demand", "🙋 수요자"]].map(([r, label]) => (
              <button key={r} onClick={() => setRole(r)} className={`flex-1 rounded-lg px-1.5 py-1.5 text-[12px] font-bold transition ${role === r ? "bg-white text-teal-700 shadow" : "text-slate-500 hover:text-slate-700"}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">지역 선택</div>
          <div className="mb-3 flex gap-1.5" data-tour="region">
            <select value={filterSido} onChange={(e) => setFilterSido(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-400">
              <option value="">시·도</option>
              {sidos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sel && sel.sido === filterSido ? sel.name : ""} disabled={!filterSido}
              onChange={(e) => { const p = (regions[filterSido] || []).find((r) => r.name === e.target.value); if (p) goRegion(p); }}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-300">
              <option value="">{filterSido ? "시·군·구" : "시·도 먼저"}</option>
              {(regions[filterSido] || []).map((r) => <option key={r.code} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">대상군 보기</div>
          <div className="flex flex-wrap gap-1.5" data-tour="targets">
            {TARGETS.map((t) => (
              <button key={t} onClick={() => setTarget(t)}
                className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${target === t ? "bg-teal-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700"}`}>{t}</button>
            ))}
          </div>
          <button onClick={() => setShowJobs((v) => !v)} data-tour="jobs"
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-amber-600">
            👷 전국 일자리·인력 현황 {showJobs ? "▲" : "▼"}
          </button>
        </div>

        {showJobs && jobs && (
          <div className="rounded-2xl bg-white/97 p-4 shadow-xl ring-1 ring-slate-900/10 backdrop-blur">
            <div className="text-[13px] font-extrabold text-amber-700">문화예술교육 = 예술인 일자리</div>
            <div className="mt-2 flex gap-2">
              <div className="flex-1 rounded-xl bg-amber-50 p-2.5">
                <div className="text-[11px] text-slate-500">창출 일자리(2017)</div>
                <div className="text-lg font-extrabold text-slate-900">{jobs.totalJobs2017.toLocaleString()}<span className="text-xs font-bold">명</span></div>
              </div>
              <div className="flex-1 rounded-xl bg-teal-50 p-2.5">
                <div className="text-[11px] text-slate-500">사각지대 해소 시</div>
                <div className="text-lg font-extrabold text-teal-700">+{jobs.potentialJobsIfAvg}<span className="text-xs font-bold">개</span></div>
              </div>
            </div>
            <div className="mt-3 text-[11px] font-bold text-slate-500">대상별 일자리 사업(2017)</div>
            <div className="eum-scroll mt-1 max-h-24 space-y-1 overflow-y-auto pr-1 text-[12px]">
              {jobs.jobsBySaup.slice(0, 6).map((j, i) => (
                <div key={i} className="flex justify-between"><span className="text-slate-600">{j.name}<span className="text-slate-400"> ·{j.target}</span></span><span className="font-bold text-slate-800">{j.n.toLocaleString()}</span></div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-tight text-slate-400">{jobs.note}</p>
          </div>
        )}
      </div>

      {/* ── 좌하단: 범례 ── */}
      <div data-tour="legend" className="absolute left-4 bottom-10 z-10 rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur">
        <div className="flex items-end gap-3">
          <div>
            <div className="text-[11px] text-slate-500">{target === "전체" ? "프로그램 0건 시군구" : `'${target}' 0건 시군구`}</div>
            <div className="text-2xl font-extrabold text-red-500">{gapCount}<span className="ml-0.5 text-sm font-bold text-slate-400">/ 250곳</span></div>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: "#ef4444" }} /> 사각지대(0건)
            <span className="ml-1 h-3 w-16 rounded-sm" style={{ background: "linear-gradient(90deg,#a5f3e9,#0d6e66)" }} />
            <span>공급 많음</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#2563eb" }} />프로그램</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#f97316" }} />연계 공급</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#db2777" }} />문화행사</span>
          </div>
        </div>
      </div>

      {/* ── 우측: 상세 패널 ── */}
      {sel && role === "supply" && (
        <div className="absolute right-4 top-4 z-10 flex max-h-[calc(100vh-2rem)] w-[23rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${isGapRegion ? "bg-red-500" : "bg-teal-500"}`} />
                <span className="text-[12px] font-medium text-slate-400">{sel.sido}</span>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">{sel.name}</div>
            </div>
            <button onClick={() => setSel(null)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">✕</button>
          </div>

          <div className="eum-scroll flex-1 overflow-y-auto px-5 py-4">
            {/* 종합 진단 */}
            {diag && (
              <div data-tour="diag" className="mb-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
                <div className="text-[13px] font-extrabold text-teal-800">📊 종합 진단</div>
                <div className="mt-2 text-[12px] text-slate-700">
                  <b>문화 수요(향유)</b>: 인근 현재·예정 행사 {evLoading ? "…" : `${events.length}건`}
                  {!evLoading && <span className="text-slate-400"> · {evFar ? "40km 내 없음(취약)" : events.length >= 8 ? "활발" : events.length >= 3 ? "보통" : "저조"}</span>}
                </div>
                <div className="mt-2 text-[12px] text-slate-700">
                  <b>교육 공급 부족</b> <span className="text-slate-400">(전국평균 대비)</span>
                  <div className="mt-1 space-y-0.5">
                    {diag.top.slice(0, 4).map((x) => (
                      <div key={x.t} className="flex items-center justify-between">
                        <span className={x.cur === 0 ? "font-semibold text-[#E4572E]" : "text-slate-600"}>{x.t} {x.cur}건</span>
                        <span className="text-slate-500">평균 {x.avg.toFixed(1)} · <b className="text-teal-700">+{x.need}건 권장</b></span>
                      </div>
                    ))}
                    {diag.top.length === 0 && <div className="text-slate-500">전 대상 전국평균 이상 — 공급 양호</div>}
                  </div>
                </div>
                {diag.top[0] && (
                  <div className="mt-2.5 space-y-1 rounded-lg bg-white p-2.5 text-[12px] ring-1 ring-teal-100">
                    <div>💡 <b className="text-teal-800">우선 보강: {diag.top[0].t}</b> {evFar ? "— 수요·공급 모두 취약(이중소외)" : events.length > 0 ? "— 인근 문화수요 확인, 우선순위 ↑" : ""}</div>
                    <div className="text-[11px] text-slate-500">🏛 <b>ARTE</b>: {diag.top[0].t} 교육 +{diag.top[0].need}건 신설 검토 → 아래 연계·AI 제안 참고</div>
                    <div className="text-[11px] text-slate-500">🧑‍🎨 <b>예술가</b>: 이 지역 {diag.top[0].t} 대상 강사 수요 잠재 → 관련 연수·자격 준비 시 진입 유리</div>
                  </div>
                )}
              </div>
            )}

            {/* 현황 */}
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-500">전체 프로그램</span>
                <span className="text-2xl font-extrabold text-slate-900">{sel.total}<span className="text-sm font-bold text-slate-400">건</span></span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {TGT.map((t) => {
                  const v = sel[t] || 0;
                  return (
                    <div key={t} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] ${v === 0 ? "bg-red-50" : "bg-white ring-1 ring-slate-100"}`}>
                      <span className="text-slate-600">{t}</span>
                      <span className={`font-bold ${v === 0 ? "text-red-500" : "text-slate-800"}`}>{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 인력·일자리 */}
            <div className="mt-3 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-100">
              <div className="text-[13px] font-extrabold text-amber-700">👷 인력·일자리</div>
              {jobPotential > 0 ? (
                <p className="mt-1.5 text-[13px] leading-snug text-slate-700">전국 평균(약 {avg}건) 도달 시 <b className="text-amber-700">최소 {jobPotential}명</b>의 강사 일자리 창출 잠재 <span className="text-slate-400">(추정)</span></p>
              ) : (
                <p className="mt-1.5 text-[13px] text-slate-500">공급이 전국 평균 이상인 지역</p>
              )}
            </div>

            {/* 연계 제안 + AI */}
            {suggestions.length > 0 && (
              <div className="mt-3" data-tour="link-ai">
                <div className="mb-1.5 text-[13px] font-extrabold text-orange-600">🔗 연계 & AI 처방 (공급 부족 대상)</div>
                <p className="mb-2 text-[11px] leading-snug text-slate-500">전국 평균에 못 미치는 대상군을 인근 공급주체와 연결하고, AI가 맞춤 프로그램을 제안합니다.</p>
                <div className="space-y-2.5">
                  {suggestions.map((s) => (
                    <div key={s.target} className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                      <div className="text-[13px] font-bold text-orange-700">{s.target} 대상</div>
                      <div className="mt-1.5 space-y-1.5">
                        {s.suppliers.map((p, i) => (
                          <div key={i} className="text-[12px] leading-tight text-slate-700">
                            <span className="font-semibold">{p.org}</span><span className="text-slate-400"> · {p.sigungu}</span>
                            <span className="ml-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-orange-600 ring-1 ring-orange-200">{Math.round(p.d)}km</span>
                            <div className="text-[11px] text-slate-500">{p.name}</div>
                          </div>
                        ))}
                      </div>

                      {!aiIdeas[s.target] && (
                        <button onClick={() => askAI(s)} disabled={aiLoading[s.target]}
                          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60">
                          {aiLoading[s.target] ? "AI가 프로그램 구상 중…" : "✨ AI 프로그램 제안 받기"}
                        </button>
                      )}

                      {aiIdeas[s.target] && (aiIdeas[s.target].error ? (
                        <p className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-600">AI 오류: {aiIdeas[s.target].error}</p>
                      ) : (
                        <div className="mt-2.5 rounded-xl border border-violet-200 bg-violet-50 p-3">
                          <div className="text-[13px] font-extrabold text-violet-800">✨ {aiIdeas[s.target].title}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-violet-500">{aiIdeas[s.target].field} · {s.target}</div>
                          <p className="mt-1.5 text-[12px] leading-snug text-slate-700">{aiIdeas[s.target].summary}</p>
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
                            {(aiIdeas[s.target].activities || []).map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                          <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
                            <div>🤝 <b>연계</b> {aiIdeas[s.target].partner}</div>
                            <div>👷 <b>강사 분야</b> {aiIdeas[s.target].instructor}</div>
                          </div>
                          {(() => { const t = trainingFor(aiIdeas[s.target].field); return (
                            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                              <div className="text-[11px] font-bold text-blue-700">🧑‍🏫 강사 양성·자격 <span className="font-normal text-blue-400">· ARTE 실데이터</span></div>
                              <div className="mt-1 text-[11px] text-slate-600">
                                {t ? <>📊 ‘{t.field}’ 분야 강사 연수 누적 <b>{t.count.toLocaleString()}건</b> · 평균 <b>{t.avgHours}시간</b></>
                                   : <>📊 ARTE 전체 강사 연수 누적 <b>{jobs?.trainingTotal?.toLocaleString()}건</b></>}
                              </div>
                              <div className="text-[11px] text-slate-600">📜 국가자격: <b>문화예술교육사</b> (전문인력양성사업)</div>
                            </div>
                          ); })()}

                          {aiIdeas[s.target].competencies?.length > 0 && (
                            <div className="mt-2 rounded-lg border border-violet-200 bg-white p-2">
                              <div className="text-[11px] font-bold text-violet-600">✨ AI 추천 준비역량 <span className="font-normal text-violet-300">(참고)</span></div>
                              <ul className="mt-1 flex flex-wrap gap-1">
                                {aiIdeas[s.target].competencies.map((c, i) => (
                                  <li key={i} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-200">{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mt-1.5 rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700">📈 {aiIdeas[s.target].effect}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 프로그램 목록 — 행사(지원사업)별 그룹 */}
            <div className="mt-3 pb-1">
              <div className="mb-1.5 text-[13px] font-extrabold text-slate-700">
                행사·프로그램 <span className="text-slate-400">({regionPrograms.length}건 · {progGroups.length}개 사업)</span>
              </div>
              {regionPrograms.length === 0 ? (
                <p className="rounded-xl bg-red-50 p-3 text-[12px] leading-snug text-red-600">ARTE 개방데이터상 문화예술교육 프로그램이 확인되지 않는 <b>사각지대</b>입니다.</p>
              ) : (
                <div className="space-y-2.5">
                  {progGroups.map(([support, progs]) => (
                    <div key={support} className="rounded-xl bg-slate-50 p-2.5">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <span className="text-[12px] font-bold leading-tight text-slate-700">🏷 {support}</span>
                        <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{progs.length}개</span>
                      </div>
                      <div className="space-y-1.5">
                        {progs.map((p, i) => {
                          const live = p.end && p.end >= TODAY;
                          return (
                            <button key={i} onClick={() => showInfo(p)}
                              className="w-full rounded-lg border border-slate-100 bg-white p-2 text-left text-[12px] transition hover:border-teal-300 hover:bg-teal-50/40">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-800">{p.name}</span>
                                {live ? <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">진행중</span>
                                      : <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">종료</span>}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">🏛 {p.org} · <span className="text-teal-700">{p.field}</span></div>
                              {p.place && <div className="text-[11px] text-slate-500">📍 {p.place}</div>}
                              <div className="text-[11px] text-slate-400">👥 {p.target} · 📅 {p.start}~{p.end}</div>
                              <div className="mt-0.5 text-[10px] font-medium text-teal-600">지도에서 위치·정보 보기 →</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 현재·예정 문화행사 (타기관 라이브) */}
            <div className="mt-3 pb-1" data-tour="events">
              <div className="mb-1.5 text-[13px] font-extrabold text-pink-600">🎭 현재·예정 문화행사 <span className="text-slate-400">(참고 · 타기관 라이브)</span></div>
              {evLoading ? (
                <p className="text-[12px] text-slate-400">불러오는 중…</p>
              ) : events.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">현재·예정 문화행사 데이터를 불러오지 못했습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {evFar && (
                    <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700">⚠️ 인근 40km 내 행사 없음 — 가장 가까운 행사를 참고로 표시 (향유 접근성도 취약한 지역)</p>
                  )}
                  {events.map((e, i) => (
                    <div key={i} onClick={() => showEventInfo(e)} className="w-full cursor-pointer rounded-lg border border-pink-100 bg-pink-50/40 p-2 text-left text-[12px] transition hover:border-pink-300 hover:bg-pink-50">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-800">{e.name}</span>
                        <span className="shrink-0 rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-700">{e.d}km</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">🎨 {e.field} · {e.charge || "요금정보 없음"}</div>
                      <div className="text-[11px] text-slate-400">📍 {e.addr}</div>
                      <div className="text-[11px] text-slate-400">📅 {e.start}~{e.end}</div>
                      {e.url && <a href={e.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="mt-1 inline-block text-[11px] font-semibold text-blue-600 hover:underline">🔗 행사 정보 바로가기 →</a>}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-slate-400">출처: 전국공연행사정보표준데이터(공공데이터포털) · 종료일 ≥ 오늘</p>
            </div>
          </div>
        </div>
      )}

      {/* 구직자 모드 */}
      {role === "seeker" && (
        <div className="absolute right-4 top-4 z-10 flex max-h-[calc(100vh-2rem)] w-[23rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="text-xl font-extrabold text-slate-900">🧑‍🎨 구직 예술가 모드</div>
            <p className="mt-0.5 text-[12px] text-slate-500">가르치고 싶은 대상을 고르면, 그 분야가 부족한(수요 높은) 지역을 추천해요.</p>
          </div>
          <div className="eum-scroll flex-1 overflow-y-auto px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">어떤 대상을 가르치나요?</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TGT.map((t) => (
                <button key={t} onClick={() => { setSeekTarget(t); setSeekAdvice(null); }} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${seekTarget === t ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-teal-50"}`}>{t}</button>
              ))}
            </div>
            {!seekTarget ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">대상을 선택하면 수요 높은 지역이 나와요.</p>
            ) : (
              <>
                <div className="mt-4 text-[13px] font-extrabold text-teal-700">📍 ‘{seekTarget}’ 강사 수요 높은 지역 TOP</div>
                <p className="mb-1.5 text-[11px] leading-snug text-slate-500">활동(전체 프로그램)은 있는데 <b>{seekTarget}</b> 공급이 적은 곳 = 수요 대비 공백이 커 진입 기회가 큰 지역. 클릭하면 지도로 이동.</p>
                <div className="space-y-1.5">
                  {seekRanked.map((p, i) => (
                    <button key={p.code} onClick={() => goRegion(p)} className="w-full rounded-lg border border-slate-100 p-2 text-left text-[12px] transition hover:border-teal-300 hover:bg-teal-50/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">{i + 1}. {p.sido} {p.name}</span>
                        {(p[seekTarget] || 0) === 0
                          ? <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">공백 · 기회↑</span>
                          : <span className="shrink-0 text-[11px] text-slate-500">{seekTarget} {p[seekTarget]}건</span>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">전체 프로그램 {p.total}건 · {seekTarget} {p[seekTarget] || 0}건</div>
                    </button>
                  ))}
                </div>
                {sel ? (
                  <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                    <div className="text-[13px] font-extrabold text-violet-800">🎯 {sel.name} · {seekTarget} 준비 가이드</div>
                    {!seekAdvice && (
                      <button onClick={askSeekAdvice} disabled={seekLoading} className="mt-2 w-full rounded-lg bg-violet-600 px-2 py-1.5 text-[12px] font-bold text-white hover:bg-violet-700 disabled:opacity-60">{seekLoading ? "AI 분석 중…" : "✨ AI 준비 가이드 받기"}</button>
                    )}
                    {seekAdvice && !seekAdvice.error && (
                      <div className="mt-2 text-[12px] text-slate-700">
                        <div className="font-bold text-violet-800">예상 신설 프로그램: {seekAdvice.title}</div>
                        <div className="mt-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2">
                          <div className="text-[11px] font-bold text-blue-700">🧑‍🏫 준비하면 좋은 역량</div>
                          <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">{(seekAdvice.competencies || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
                          <div className="mt-1 text-[11px] text-slate-600">📜 {seekAdvice.qualification}</div>
                          {(() => { const tr = trainingFor(seekAdvice.field); return tr ? <div className="mt-1 text-[11px] text-slate-500">📊 ARTE ‘{tr.field}’ 연수 누적 {tr.count.toLocaleString()}건·평균 {tr.avgHours}시간</div> : null; })()}
                        </div>
                      </div>
                    )}
                    {seekAdvice?.error && <p className="mt-2 text-[11px] text-red-600">오류: {seekAdvice.error}</p>}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-400">위 지역을 선택하면 그 지역 맞춤 준비 가이드를 받을 수 있어요.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 수요자 모드 */}
      {sel && role === "demand" && (
        <div className="absolute right-4 top-4 z-10 flex max-h-[calc(100vh-2rem)] w-[23rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><div className="text-[12px] text-slate-400">{sel.sido} · 우리 지역</div><div className="text-2xl font-extrabold text-slate-900">{sel.name}</div></div>
            <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="eum-scroll flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="text-[13px] font-extrabold text-slate-700">📋 우리 동네 문화예술교육 성적표</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {TGT.map((t) => { const v = sel[t] || 0; return <div key={t} className={`flex justify-between rounded-lg px-2.5 py-1.5 text-[13px] ${v === 0 ? "bg-red-50" : "bg-white ring-1 ring-slate-100"}`}><span className="text-slate-600">{t}</span><span className={`font-bold ${v === 0 ? "text-red-500" : "text-slate-800"}`}>{v}</span></div>; })}
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 text-[13px] font-extrabold text-slate-700">🙋 필요한 교육 수요 알리기</div>
              <p className="mb-2 text-[11px] text-slate-500">부족한 대상의 교육이 필요하면 ‘수요 알리기’로 ARTE에 신호를 보내세요.</p>
              <div className="space-y-1.5">
                {(diag ? diag.top : []).slice(0, 5).map((x) => (
                  <div key={x.t} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-[12px]">
                    <span className={x.cur === 0 ? "font-semibold text-[#E4572E]" : "text-slate-700"}>{x.t} {x.cur}건 <span className="text-slate-400">(평균 {x.avg.toFixed(1)})</span></span>
                    <button onClick={() => doAppeal(x.t)} className="rounded-full bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700">수요 알리기 👍 {getAppeal(x.t)}</button>
                  </div>
                ))}
                {(!diag || diag.top.length === 0) && <p className="text-[12px] text-slate-500">이 지역은 전 대상 공급이 양호해요.</p>}
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 text-[13px] font-extrabold text-pink-600">🎭 지금 우리 지역 문화행사</div>
              {evLoading ? <p className="text-[12px] text-slate-400">…</p> : events.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">인근 행사 정보 없음.</p> : (
                <div className="space-y-1.5">
                  {events.slice(0, 6).map((e, i) => (
                    <div key={i} onClick={() => showEventInfo(e)} className="cursor-pointer rounded-lg border border-pink-100 bg-pink-50/40 p-2 text-[12px] hover:bg-pink-50">
                      <div className="font-semibold text-slate-800">{e.name}</div>
                      <div className="text-[11px] text-slate-400">📅 {e.start}~{e.end} · {e.d}km</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!sel && ready && role !== "seeker" && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-[13px] font-medium text-white shadow-lg backdrop-blur">
          {role === "demand" ? "내 지역을 클릭해 성적표·수요 알리기를 확인하세요" : "지역을 클릭해 공급 현황·연계·AI 제안을 확인하세요"}
        </div>
      )}

      {err && <div className="absolute inset-x-0 top-1/2 z-20 mx-auto w-fit rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">{err}</div>}

      <Tour steps={TOUR_STEPS} open={tourOpen} onClose={closeTour} />
      <Tour steps={TOUR2_STEPS} open={tour2Open} onClose={closeTour2} />
    </div>
  );
}
