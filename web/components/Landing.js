"use client";

const Icon = ({ d, paths }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
    {paths ? paths.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  supply: <Icon paths={["M3 21h18", "M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16", "M9 7h.01", "M9 11h.01", "M9 15h.01", "M15 7h.01", "M15 11h.01", "M15 15h.01"]} />,
  seeker: <Icon paths={["M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08", "M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"]} />,
  demand: <Icon paths={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
};

const ROLES = [
  { key: "supply", title: "기관", sub: "문화예술교육 기획자 (ARTE·지자체)", desc: "지역·대상별 사각지대를 진단하고, 인근 공급주체·거점과 연계해 신설 프로그램을 설계합니다." },
  { key: "seeker", title: "예술강사", sub: "일자리를 찾는 예술인", desc: "내 분야가 비어 진입 기회가 큰 지역을 찾고, 준비 가이드·실제 채용 사례·수요 추이를 확인합니다." },
  { key: "demand", title: "주민", sub: "문화예술교육 수요자", desc: "우리 동네 문화예술교육 현황을 보고, 부족한 교육의 수요를 직접 알립니다." },
];

export default function Landing({ onEnter, demand, gapCount }) {
  const ratio = demand?.urbanExp ? (demand.urbanExp["대도시"] / demand.urbanExp["읍면지역"]).toFixed(1) : null;
  const stats = [
    { v: gapCount != null ? `${gapCount}곳` : "60곳", l: "전 대상 프로그램 0건 시군구" },
    { v: demand?.urbanExp ? `${demand.urbanExp["읍면지역"]}%` : "3.1%", l: `읍면 교육경험률 (대도시의 1/${ratio || "2.5"})` },
    { v: "12종", l: "활용 공공데이터셋" },
  ];
  return (
    <div className="fixed inset-0 z-[900] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" style={{ fontFamily: "Pretendard, sans-serif" }}>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[12px] font-medium text-teal-200">2026 ARTE 공공데이터 활용 아이디어 공모전</div>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-white">이음 <span className="font-light text-teal-300">EUM</span></h1>
          <p className="mt-3 text-lg text-slate-300">문화예술교육의 <b className="font-semibold text-white">수요·공급·인력</b>을 잇는 지도</p>
        </div>

        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-slate-900/40 p-4 text-center backdrop-blur">
              <div className="text-3xl font-extrabold tracking-tight text-teal-300">{s.v}</div>
              <div className="mt-1 text-[12px] leading-snug text-slate-300">{s.l}</div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-slate-400">어떤 입장에서 보시나요</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {ROLES.map((r) => (
            <button key={r.key} onClick={() => onEnter(r.key)}
              className="group flex flex-col rounded-xl border border-slate-200/70 bg-white p-5 text-left shadow-lg transition hover:-translate-y-1 hover:border-teal-400 hover:shadow-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-teal-50 group-hover:text-teal-600">{ICONS[r.key]}</div>
              <div className="mt-3 text-xl font-extrabold text-slate-900">{r.title}</div>
              <div className="text-[12px] font-medium text-slate-400">{r.sub}</div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{r.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-teal-600">
                시작하기
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-9 text-center text-[11px] text-slate-500">ARTE · 문화체육관광부 · 통계청 공공데이터 기반 · 카카오맵</p>
      </div>
    </div>
  );
}
