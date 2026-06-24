"use client";
import Trend from "./Trend";

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export default function SeekerExplore({ trend, events, jobs, onFindRegion }) {
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-slate-50 pt-16">
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">예술강사 탐색</h2>
        <p className="mt-1 text-[13px] text-slate-500">지금 문화예술 현장의 흐름을 살펴보고, 내 분야가 비어 있는 지역을 찾아보세요.</p>

        <button onClick={onFindRegion} className="mt-4 flex w-full items-center justify-between rounded-xl bg-slate-900 px-5 py-4 text-left text-white transition hover:bg-slate-800">
          <span>
            <span className="text-[15px] font-bold">내 분야로 진입 기회 지역 찾기</span>
            <span className="mt-0.5 block text-[12px] text-slate-300">대상 선택 → 공백 지역 지도 + 준비 가이드</span>
          </span>
          <Arrow />
        </button>

        {trend && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">분야별 관람 수요 추이</h3>
            <p className="mb-3 mt-0.5 text-[12px] text-slate-500">수요가 오르는 분야를 미리 준비하면 유리해요. (최근 1년 주간조사)</p>
            <Trend data={trend} />
          </section>
        )}

        {events && events.length > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">지금 전국 문화행사</h3>
            <p className="mb-3 mt-0.5 text-[12px] text-slate-500">현재·예정 행사 흐름 — 어떤 프로그램이 열리고 있는지.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {events.slice(0, 8).map((e, i) => (
                <a key={i} href={e.url || undefined} target={e.url ? "_blank" : undefined} rel="noreferrer" className={`block rounded-lg border border-slate-100 p-3 ${e.url ? "hover:border-teal-300" : ""}`}>
                  <div className="text-[13px] font-semibold text-slate-800">{e.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{e.field || "행사"} · {e.place || e.addr || ""}</div>
                  <div className="text-[11px] text-slate-400">{e.start} ~ {e.end}</div>
                </a>
              ))}
            </div>
          </section>
        )}

        {jobs && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">실제 예술강사 채용 사례</h3>
            <div className="my-2 rounded-lg bg-amber-50 p-2.5 text-[12px] leading-snug text-amber-800">
              문화예술 채용의 <b>{jobs.stat.metroShare}%가 수도권 집중</b> (ARKO {jobs.stat.withRegion.toLocaleString()}건 분석). 지방 강사 일자리는 신설로 만들어야 합니다.
            </div>
            <p className="mb-2 text-[11px] text-slate-400">과거 공고 — 어떤 역량을 요구했는지 참고용</p>
            <div className="space-y-2">
              {jobs.jobs.slice(0, 6).map((j, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[13px] font-semibold text-slate-800">{j.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{j.org || "기관"} · {j.area || j.sido || "지역미상"}{j.clos ? ` · ~${j.clos}` : ""}</div>
                  {j.req && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{j.req}</div>}
                  {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[11px] font-semibold text-blue-600 hover:underline">공고 보기 →</a>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
