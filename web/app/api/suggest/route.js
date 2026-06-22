import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "프로그램 제목" },
    field: { type: "string", description: "분야 (음악/미술/연극/무용/공예/문학/미디어/융복합 등)" },
    summary: { type: "string", description: "프로그램 한 줄 소개" },
    activities: { type: "array", items: { type: "string" }, description: "핵심 활동 3가지" },
    partner: { type: "string", description: "연계 가능한 운영주체/기관 (인근 단체·시설 활용)" },
    instructor: { type: "string", description: "필요한 강사 분야 (일자리 연결)" },
    competencies: { type: "array", items: { type: "string" }, description: "이 프로그램 강사로 채용되려면 구직자가 갖춰야 할 핵심 역량 3가지 (구체적 기술·경험)" },
    qualification: { type: "string", description: "권장 자격·경력 (예: 관련 분야 자격증, 교육 경험 등)" },
    effect: { type: "string", description: "기대효과 한 줄" },
  },
  required: ["title", "field", "summary", "activities", "partner", "instructor", "competencies", "qualification", "effect"],
  additionalProperties: false,
};

export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const { sido = "", sigungu = "", target = "", nearby = [], demand = 0, far = false, need = 0, cur = 0 } = body;
  const gapText = cur === 0
    ? `'${target}' 대상 문화예술교육 프로그램이 0건인 사각지대`
    : `'${target}' 대상 프로그램이 ${cur}건뿐이라 전국 평균 대비 약 ${need}건 부족한 지역`;

  const nearbyText = (nearby || []).slice(0, 3)
    .map((n) => `- ${n.org} (${n.sigungu}, ${n.field || ""})`).join("\n") || "(인근 공급 정보 없음)";
  const demandText = far
    ? `인근 40km 내 현재·예정 문화행사 없음 → 향유 접근성도 취약(이중 소외 지역).`
    : `인근 현재·예정 문화행사 ${demand}건 → 지역에 문화 향유 수요가 ${demand >= 8 ? "활발" : demand >= 3 ? "있음" : "다소 있음"}.`;

  const prompt = `당신은 한국문화예술교육진흥원(ARTE)의 문화예술교육 기획 전문가입니다.
아래 지역은 ARTE 개방데이터 분석 결과 ${gapText}입니다.
이 지역·대상에 신설하면 좋을 구체적이고 현실적인 프로그램 1개를 제안하세요.

[지역] ${sido} ${sigungu}
[소외 대상군] ${target}
[수요 신호] ${demandText}
[권장 보강] 전국 평균 대비 ${target} 교육 약 ${need}건 부족
[인근 연계 가능 공급주체]
${nearbyText}

조건:
- 대상(${target})의 특성에 실제로 맞는 활동일 것
- 인근 공급주체나 지역 자원을 연계하는 현실적 방안일 것
- 새 강사 일자리로 이어지는 형태일 것
- 이 프로그램의 강사로 채용되려는 구직자가 갖춰야 할 구체적 역량(competencies)과 권장 자격(qualification)을 명확히 제시할 것 (구직자가 무엇을 준비해야 하는지 알 수 있게)
- 과장 없이 실행 가능한 수준으로`;

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1200,
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    return Response.json(JSON.parse(text));
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
