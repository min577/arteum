"use client";

const ROLES = [
  { key: "supply", emoji: "🏛", title: "기관", sub: "문화예술교육 기획자 (ARTE·지자체)", desc: "지역·대상별 사각지대를 진단하고, 인근 공급주체·거점과 연계해 AI로 신설 프로그램을 설계합니다.", color: "from-teal-500 to-emerald-500" },
  { key: "seeker", emoji: "🧑‍🎨", title: "예술강사", sub: "일자리를 찾는 예술인", desc: "내 분야가 비어 진입 기회가 큰 지역을 찾고, AI 준비 가이드·실제 채용 사례·수요 추이까지 확인합니다.", color: "from-indigo-500 to-violet-500" },
  { key: "demand", emoji: "🙋", title: "주민", sub: "문화예술교육 수요자", desc: "우리 동네 문화예술교육 성적표를 보고, 부족한 교육의 수요를 직접 알립니다.", color: "from-rose-500 to-orange-500" },
];

export default function Landing({ onEnter, demand, gapCount }) {
  const ratio = demand?.urbanExp ? (demand.urbanExp["대도시"] / demand.urbanExp["읍면지역"]).toFixed(1) : null;
  return (
    <div className="fixed inset-0 z-[900] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" style={{ fontFamily: "Pretendard, sans-serif" }}>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-6 py-12">
        {/* 브랜드 */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-teal-200 ring-1 ring-white/15">2026 ARTE 공공데이터 활용 아이디어 공모전</div>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-white">이음 <span className="text-teal-300">EUM</span></h1>
          <p className="mt-3 text-lg text-slate-300">문화예술교육의 <b className="text-white">수요·공급·인력</b>을 잇는 지도</p>
        </div>

        {/* 핵심 근거 */}
        <div className="mx-auto mt-7 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            { v: gapCount != null ? `${gapCount}곳` : "60곳", l: "전 대상 프로그램 0건 시군구" },
            { v: demand?.urbanExp ? `${demand.urbanExp["읍면지역"]}%` : "3.1%", l: `읍면 교육경험률 (대도시의 1/${ratio || "2.5"})` },
            { v: "12종", l: "활용 공공데이터셋" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/10 backdrop-blur">
              <div className="text-2xl font-extrabold text-teal-300">{s.v}</div>
              <div className="mt-1 text-[12px] leading-snug text-slate-300">{s.l}</div>
            </div>
          ))}
        </div>

        {/* 역할 선택 */}
        <p className="mt-9 text-center text-[13px] font-semibold uppercase tracking-wider text-slate-400">어떤 입장에서 보시나요?</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {ROLES.map((r) => (
            <button key={r.key} onClick={() => onEnter(r.key)}
              className="group flex flex-col rounded-2xl bg-white/95 p-5 text-left shadow-xl ring-1 ring-white/20 transition hover:-translate-y-1 hover:bg-white">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${r.color} text-2xl shadow`}>{r.emoji}</div>
              <div className="mt-3 text-xl font-extrabold text-slate-900">{r.title}</div>
              <div className="text-[12px] font-semibold text-slate-400">{r.sub}</div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{r.desc}</p>
              <div className="mt-3 text-[13px] font-bold text-teal-600 group-hover:translate-x-0.5">시작하기 →</div>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-500">ARTE·문체부·통계청 공공데이터 기반 · 카카오맵 · 데모 프로토타입</p>
      </div>
    </div>
  );
}
