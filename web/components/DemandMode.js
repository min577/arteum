"use client";
import { useState } from "react";

const SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

function EventCard({ e }) {
  return (
    <a href={e.url || undefined} target={e.url ? "_blank" : undefined} rel="noreferrer" className={`block overflow-hidden rounded-lg border border-slate-100 ${e.url ? "hover:border-teal-300" : ""}`}>
      {e.thumb && <img src={e.thumb} alt="" loading="lazy" className="h-32 w-full bg-slate-100 object-cover" onError={(ev) => { ev.currentTarget.style.display = "none"; }} />}
      <div className="p-3">
        <div className="text-[13px] font-semibold text-slate-800">{e.name}</div>
        <div className="mt-0.5 text-[12px] text-slate-400">{e.sido || ""} {e.field ? `· ${e.field}` : ""} · {e.place || e.addr || ""}</div>
        <div className="text-[12px] text-slate-400">{e.start} ~ {e.end}{typeof e.d === "number" ? ` · ${e.d}km` : ""}</div>
      </div>
    </a>
  );
}

export default function DemandMode({ sidos, regions, sel, filterSido, setFilterSido, goRegion, step, setStep, nearEvents, allEvents, evFar, diag, TGT, programs, today, getAppeal, doAppeal, onChangeRole }) {
  const [view, setView] = useState("home");
  const [oSido, setOSido] = useState("");
  const [oQ, setOQ] = useState("");

  if (step === "setup") {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50 px-5">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <button onClick={onChangeRole} className="mb-3 text-[13px] font-semibold text-slate-400 hover:text-slate-600">← 역할 선택으로</button>
          <h2 className="text-xl font-extrabold text-slate-900">우리 동네를 설정해주세요</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">거주 지역을 고르면 그 지역과 주변에서 열리는 문화행사를 먼저 보여드려요.</p>
          <div className="mt-4 flex gap-2">
            <select value={filterSido} onChange={(e) => setFilterSido(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[14px] text-slate-700 outline-none focus:border-teal-400">
              <option value="">시·도</option>
              {sidos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select disabled={!filterSido} value={sel && sel.sido === filterSido ? sel.name : ""} onChange={(e) => { const p = (regions[filterSido] || []).find((r) => r.name === e.target.value); if (p) goRegion(p); }} className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[14px] text-slate-700 outline-none focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-300">
              <option value="">{filterSido ? "시·군·구" : "시·도 먼저"}</option>
              {(regions[filterSido] || []).map((r) => <option key={r.code} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <button disabled={!sel || sel.sido !== filterSido} onClick={() => setStep("home")} className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-[14px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-40">이 지역으로 시작하기</button>
        </div>
      </div>
    );
  }

  const oOpts = SIDO.filter((s) => (allEvents || []).some((e) => e.sido === s));
  const otherList = (allEvents || []).filter((e) => (!oSido || e.sido === oSido) && (!oQ || (e.name || "").includes(oQ) || (e.place || "").includes(oQ)));

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-slate-50 pt-5">
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] text-slate-400">{sel?.sido} · 우리 동네</div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{sel?.name}</h2>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setStep("setup")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:border-teal-300">지역 변경</button>
            <button onClick={onChangeRole} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:border-teal-300">← 역할</button>
          </div>
        </div>

        <div className="mt-3 flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
          {[["home", "우리 동네"], ["other", "다른 지역"]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-lg px-4 py-1.5 text-[13px] font-bold transition ${view === v ? "bg-white text-teal-700 shadow" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>

        {view === "home" ? (
          <>
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-[15px] font-extrabold text-slate-900">우리 동네 · 주변 문화행사</h3>
              <p className="mb-3 mt-0.5 text-[13px] text-slate-500">{evFar ? "40km 내 행사가 없어 가장 가까운 행사를 보여드려요." : "가까운 순으로 보여드려요."}</p>
              {nearEvents && nearEvents.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{nearEvents.map((e, i) => <EventCard key={i} e={e} />)}</div>
              ) : <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-500">표시할 행사를 불러오는 중…</p>}
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-[15px] font-extrabold text-slate-900">우리 동네 문화예술교육 현황</h3>
              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {TGT.map((t) => { const v = sel?.[t] || 0; return <div key={t} className={`flex justify-between rounded-lg px-2.5 py-1.5 text-[13px] ${v === 0 ? "bg-red-50" : "bg-slate-50"}`}><span className="text-slate-600">{t}</span><span className={`font-bold ${v === 0 ? "text-red-500" : "text-slate-800"}`}>{v}</span></div>; })}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-[15px] font-extrabold text-slate-900">우리 동네 진행 프로그램</h3>
              <p className="mb-3 mt-0.5 text-[13px] text-slate-500">어떤 문화예술교육이 운영되는지 살펴보세요. 장소를 누르면 지도로 이동해요.</p>
              {(!programs || programs.length === 0) ? (
                <p className="rounded-lg bg-red-50 p-3 text-[13px] leading-snug text-red-600">아직 문화예술교육 프로그램이 확인되지 않는 지역이에요.</p>
              ) : (
                <div className="space-y-2">
                  {programs.slice(0, 12).map((p, i) => {
                    const live = p.end && today && p.end >= today;
                    const q = encodeURIComponent(`${p.place || p.name} ${sel?.name || ""}`);
                    return (
                      <div key={i} className="rounded-lg border border-slate-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-800">{p.name}</span>
                          {live ? <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700">진행중</span> : <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-400">종료</span>}
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-500">{p.org} · {p.field}</div>
                        <div className="text-[12px] text-slate-400">{p.target} · {p.start}~{p.end}</div>
                        {p.place && <a href={`https://map.kakao.com/?q=${q}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] font-semibold text-blue-600 hover:underline">{p.place} · 지도에서 위치 보기 →</a>}
                      </div>
                    );
                  })}
                  {programs.length > 12 && <p className="text-[12px] text-slate-400">상위 12건 표시</p>}
                </div>
              )}
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-[15px] font-extrabold text-slate-900">필요한 교육 수요 알리기</h3>
              <p className="mb-3 mt-0.5 text-[13px] text-slate-500">부족한 대상의 교육이 필요하면 ‘수요 알리기’로 신호를 보내세요.</p>
              <div className="space-y-1.5">
                {(diag ? diag.top : []).slice(0, 5).map((x) => (
                  <div key={x.t} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-[13px]">
                    <span className={x.cur === 0 ? "font-semibold text-[#E4572E]" : "text-slate-700"}>{x.t} {x.cur}건 <span className="text-slate-400">(평균 {x.avg.toFixed(1)})</span></span>
                    <button onClick={() => doAppeal(x.t)} className="rounded-full bg-teal-600 px-3 py-1 text-[13px] font-bold text-white hover:bg-teal-700">수요 알리기 {getAppeal(x.t)}</button>
                  </div>
                ))}
                {(!diag || diag.top.length === 0) && <p className="text-[13px] text-slate-500">이 지역은 전 대상 공급이 양호해요.</p>}
              </div>
            </section>
          </>
        ) : (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-slate-900">다른 지역 문화행사</h3>
            <p className="mb-3 mt-0.5 text-[13px] text-slate-500">관심 있는 지역의 행사도 찾아보세요.</p>
            <div className="mb-3 flex gap-1.5">
              <select value={oSido} onChange={(e) => setOSido(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-400">
                <option value="">전체 지역</option>
                {oOpts.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={oQ} onChange={(e) => setOQ(e.target.value)} placeholder="행사명·장소 검색" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-700 outline-none focus:border-teal-400" />
            </div>
            <div className="mb-2 text-[12px] text-slate-400">{otherList.length}건{oSido ? ` · ${oSido}` : ""}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{otherList.slice(0, 30).map((e, i) => <EventCard key={i} e={e} />)}</div>
            {otherList.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-500">해당 조건의 행사가 없어요.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
