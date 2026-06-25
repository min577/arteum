"use client";
import { useState } from "react";
import Trend from "./Trend";

const SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

function Filter({ sido, setSido, q, setQ, options, ph }) {
  return (
    <div className="mb-3 flex gap-1.5">
      <select value={sido} onChange={(e) => setSido(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-400">
        <option value="">전체 지역</option>
        {options.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ph} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-400" />
    </div>
  );
}

export default function SeekerExplore({ trend, events, jobs, onFindRegion }) {
  const [evSido, setEvSido] = useState("");
  const [evQ, setEvQ] = useState("");
  const [jbSido, setJbSido] = useState("");
  const [jbQ, setJbQ] = useState("");

  const evOpts = SIDO.filter((s) => (events || []).some((e) => e.sido === s));
  const evFiltered = (events || []).filter((e) => (!evSido || e.sido === evSido) && (!evQ || (e.name || "").includes(evQ) || (e.place || "").includes(evQ)));
  const jbOpts = SIDO.filter((s) => (jobs?.jobs || []).some((j) => j.sido === s));
  const jbFiltered = (jobs?.jobs || []).filter((j) => (!jbSido || j.sido === jbSido) && (!jbQ || (j.title || "").includes(jbQ) || (j.org || "").includes(jbQ)));

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-slate-50 pt-16">
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">예술강사 탐색</h2>
        <p className="mt-1 text-[13px] text-slate-500">지금 문화예술 현장의 흐름을 살펴보고, 내 분야가 비어 있는 지역을 찾아보세요.</p>

        <button onClick={onFindRegion} className="mt-4 flex w-full items-center justify-between rounded-xl bg-slate-900 px-5 py-4 text-left text-white transition hover:bg-slate-800">
          <span>
            <span className="text-[15px] font-bold">내 분야로 진입 기회 지역 찾기</span>
            <span className="mt-0.5 block text-[13px] text-slate-300">대상 선택 → 공백 지역 지도 + 준비 가이드</span>
          </span>
          <Arrow />
        </button>

        {trend && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">분야별 관람 수요 추이</h3>
            <p className="mb-3 mt-0.5 text-[13px] text-slate-500">수요가 오르는 분야를 미리 준비하면 유리해요. (최근 1년 주간조사)</p>
            <Trend data={trend} />
          </section>
        )}

        {events && events.length > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">지금 전국 문화행사</h3>
            <p className="mb-3 mt-0.5 text-[13px] text-slate-500">현재·예정 행사 — 지역·키워드로 찾아보세요.</p>
            <Filter sido={evSido} setSido={setEvSido} q={evQ} setQ={setEvQ} options={evOpts} ph="행사명·장소 검색" />
            <div className="mb-2 text-[12px] text-slate-400">{evFiltered.length}건{evSido ? ` · ${evSido}` : ""}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {evFiltered.slice(0, 30).map((e, i) => (
                <a key={i} href={e.url || undefined} target={e.url ? "_blank" : undefined} rel="noreferrer" className={`block overflow-hidden rounded-lg border border-slate-100 ${e.url ? "hover:border-teal-300" : ""}`}>
                  {e.thumb
                    ? <img src={e.thumb} alt="" loading="lazy" className="h-32 w-full bg-slate-100 object-cover" onError={(ev) => { ev.currentTarget.outerHTML = '<div class=\"flex h-32 w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[13px] font-bold text-slate-400\">' + (e.field || "문화행사") + "</div>"; }} />
                    : <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[13px] font-bold text-slate-400">{e.field || "문화행사"}</div>}
                  <div className="p-3">
                    <div className="text-[13px] font-semibold text-slate-800">{e.name}</div>
                    <div className="mt-0.5 text-[12px] text-slate-400">{e.sido || ""} {e.field ? `· ${e.field}` : ""} · {e.place || e.addr || ""}</div>
                    <div className="text-[12px] text-slate-400">{e.start} ~ {e.end}</div>
                  </div>
                </a>
              ))}
            </div>
            {evFiltered.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-500">해당 조건의 행사가 없어요.</p>}
            {evFiltered.length > 30 && <p className="mt-2 text-[12px] text-slate-400">상위 30건 표시 · 검색으로 좁혀보세요</p>}
          </section>
        )}

        {jobs && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">실제 예술강사 채용 사례</h3>
            <div className="my-2 rounded-lg bg-amber-50 p-2.5 text-[13px] leading-snug text-amber-800">
              문화예술 채용의 <b>{jobs.stat.metroShare}%가 수도권 집중</b> (ARKO {jobs.stat.withRegion.toLocaleString()}건 분석). 지방 강사 일자리는 신설로 만들어야 합니다.
            </div>
            <p className="mb-2 text-[12px] text-slate-400">과거 공고 — 어떤 역량을 요구했는지 참고용</p>
            <Filter sido={jbSido} setSido={setJbSido} q={jbQ} setQ={setJbQ} options={jbOpts} ph="채용 제목·기관 검색" />
            <div className="mb-2 text-[12px] text-slate-400">{jbFiltered.length}건{jbSido ? ` · ${jbSido}` : ""}</div>
            <div className="space-y-2.5">
              {jbFiltered.slice(0, 10).map((j, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="text-[14px] font-bold leading-snug text-slate-800">{j.title}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{j.sido || j.area || "지역미상"}</span>
                    <span>{j.org || "기관"}</span>
                    {j.clos && <span className="text-slate-400">· 마감 ~{j.clos}</span>}
                  </div>
                  {j.req && (
                    <div className="mt-2.5 rounded-lg border border-amber-100 bg-amber-50/70 p-2.5">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">요구 자격 · 모집분야</div>
                      <div className="mt-1 text-[13px] leading-relaxed text-slate-700">{j.req}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {jbFiltered.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-500">해당 조건의 채용 사례가 없어요.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
