"use client";
import { useState } from "react";

const COLORS = { "연극-뮤지컬": "#E4572E", "음악 공연": "#2563eb", "미술관-전시관": "#0d9488", "박물관": "#a855f7", "무용 공연": "#f59e0b", "문학 행사": "#64748b" };

// 문화예술 관람 순증가(증가-감소 응답) 1년+ 추이 — 분야별 멀티라인 SVG
export default function Trend({ data, highlight }) {
  const [sel, setSel] = useState(highlight || null);
  if (!data || !data.series) return null;
  const W = 300, H = 130, P = 18;
  const N = data.weeks.length;
  const all = data.series.flatMap((s) => s.net);
  const min = Math.min(...all, 0), max = Math.max(...all, 0);
  const x = (i) => P + (i * (W - 2 * P)) / (N - 1);
  const y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const zeroY = y(0);

  // 가장 개선된 분야
  const top = [...data.series].sort((a, b) => (b.recentNet - b.firstNet) - (a.recentNet - a.firstNet))[0];

  return (
    <div>
      <div className="mb-1 rounded-lg bg-purple-50 p-2 text-[11px] leading-snug text-purple-800">
        📈 최근 1년 <b>관람 수요가 가장 오른 분야: {top.key}</b> (전년대비 순증가 {top.firstNet} → {top.recentNet}, {(top.recentNet - top.firstNet >= 0 ? "+" : "") + (Math.round((top.recentNet - top.firstNet) * 10) / 10)})
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ touchAction: "none" }}>
        <line x1={P} y1={zeroY} x2={W - P} y2={zeroY} stroke="#cbd5e1" strokeWidth="0.7" strokeDasharray="3 3" />
        <text x={P} y={zeroY - 2} fontSize="6" fill="#94a3b8">0 (증가=감소)</text>
        {data.series.map((s) => {
          const dim = sel && sel !== s.key;
          const pts = s.net.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return <polyline key={s.key} points={pts} fill="none" stroke={COLORS[s.key] || "#999"}
            strokeWidth={sel === s.key ? 2.2 : 1.2} opacity={dim ? 0.12 : 1} />;
        })}
        <text x={P} y={H - 4} fontSize="6" fill="#94a3b8">{data.weeks[0]}</text>
        <text x={W - P} y={H - 4} fontSize="6" fill="#94a3b8" textAnchor="end">{data.weeks[N - 1]}</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-1">
        {data.series.map((s) => (
          <button key={s.key} onClick={() => setSel(sel === s.key ? null : s.key)}
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition ${sel === s.key ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[s.key] }} />{s.key}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">순증가 = 전년대비 ‘증가’ 응답 − ‘감소’ 응답 (문화예술 관람현황 주간조사, {N}주). 분야 클릭 시 강조.</p>
    </div>
  );
}
