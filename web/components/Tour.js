"use client";
import { useEffect, useState } from "react";

export default function Tour({ steps, open, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  useEffect(() => { if (open) setI(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = steps[i];
    const calc = () => {
      const el = step && step.sel ? document.querySelector(step.sel) : null;
      if (el) {
        try { el.scrollIntoView({ block: "center", inline: "nearest" }); } catch {}
        setRect(el.getBoundingClientRect());
      } else setRect(null);
    };
    calc();
    const t = setTimeout(calc, 120); // 스크롤 정착 후 재계산
    window.addEventListener("resize", calc);
    return () => { clearTimeout(t); window.removeEventListener("resize", calc); };
  }, [open, i, steps]);

  if (!open || !steps.length) return null;
  const step = steps[i];
  const pad = 8;
  const box = rect && rect.width ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  let tt;
  if (box) {
    const W = 320, H = 210, gap = 14;
    let top;
    if (box.top + box.height + gap + H <= window.innerHeight) top = box.top + box.height + gap; // 아래
    else if (box.top - gap - H >= 0) top = box.top - gap - H; // 위
    else top = Math.max(12, window.innerHeight - H - 12); // 클램프
    const left = Math.max(12, Math.min(box.left, window.innerWidth - W - 12));
    tt = { top, left };
  } else {
    tt = { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
  }

  const last = i === steps.length - 1;
  return (
    <div className="fixed inset-0 z-[1000]" style={{ fontFamily: "Pretendard, sans-serif" }}>
      {box ? (
        <div style={{ position: "fixed", top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: 14, boxShadow: "0 0 0 9999px rgba(15,23,42,.55)", border: "2.5px solid #2dd4bf", transition: "all .2s ease", pointerEvents: "none" }} />
      ) : (
        <div className="fixed inset-0 bg-slate-900/55" />
      )}
      <div className="fixed w-80 rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/10" style={tt}>
        <div className="text-[11px] font-bold tracking-wide text-teal-600">STEP {i + 1} / {steps.length}</div>
        <div className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">{step.title}</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="text-[12px] text-slate-400 hover:text-slate-600">건너뛰기</button>
          <div className="flex gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">이전</button>}
            <button onClick={() => (last ? onClose() : setI(i + 1))} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-[13px] font-bold text-white shadow-sm hover:bg-teal-700">{last ? "시작하기" : "다음"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
