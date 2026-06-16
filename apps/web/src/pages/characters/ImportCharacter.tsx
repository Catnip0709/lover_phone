import { AlertTriangle, ArrowLeft, CheckCircle2, FileJson, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type {
  CharacterCardParseResult,
  SafetyRiskLevel,
} from "@myphone/shared";
import { createCharacter, parseCharacterCard } from "@/api/characters";
import { confirmAdult } from "@/api/users";
import { useAuthStore } from "@/stores/auth-store";

const sampleCard = `姓名：陆沉
故事背景：他习惯在深夜认真回复消息，会记得用户的情绪变化。喜欢雨夜、旧书店和热可可。
对你的称呼：你
设定：温柔、稳定、边界感强。`;

export default function ImportCharacter() {
  const navigate = useNavigate();
  const { accessToken, user, setUser } = useAuthStore();
  const [content, setContent] = useState(sampleCard);
  const [result, setResult] = useState<CharacterCardParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingAdult, setConfirmingAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  async function handleParse() {
    if (!accessToken || !content.trim()) {
      return;
    }

    setParsing(true);
    setError(null);
    setSafetyAccepted(false);

    try {
      const response = await parseCharacterCard(accessToken, { content });
      setResult(response.result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "解析角色卡失败");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirmAdult() {
    if (!accessToken) {
      return;
    }

    setConfirmingAdult(true);
    setError(null);

    try {
      const response = await confirmAdult(accessToken);
      setUser(response.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "成年确认失败");
    } finally {
      setConfirmingAdult(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !result || submitting || result.safety.blocked) {
      return;
    }

    if (result.adultEnabled && !user?.ageConfirmed) {
      setError("开启成人模式前需要先确认已满 18 岁");
      return;
    }

    if (result.safety.level === "high" && !safetyAccepted) {
      setError("请先确认已理解高风险提示，或修改角色卡后重新解析");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createCharacter(accessToken, {
        ...result,
        safetyAccepted,
      });
      navigate(`/characters/${created.character.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "导入联系人失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff4f8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,203,220,0.38),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(201,228,255,0.4),transparent_28%),linear-gradient(135deg,#fff7fb,#ffffff_48%,#edf7ff)]" />
      <div className="relative w-full">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900" to="/characters/new">
          <ArrowLeft className="h-4 w-4" />
          返回手动创建
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[36px] border border-white/80 bg-white/55 p-6 shadow-[0_30px_100px_rgba(71,85,105,0.16)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-600/70">Card Import</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">导入角色卡</h1>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  支持纯文本、JSON 和常见 SillyTavern 字段。系统会先解析成可编辑表单，再做安全边界检查。
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-2xl">
                <FileJson className="h-7 w-7" />
              </div>
            </div>

            <textarea
              className="mt-6 h-[440px] w-full resize-none rounded-[28px] border border-white/80 bg-white/80 px-5 py-4 text-sm leading-7 outline-none shadow-inner focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              maxLength={12000}
              onChange={(event) => setContent(event.target.value)}
              placeholder="粘贴角色卡文本或 JSON..."
              value={content}
            />
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>会保留原文作为角色卡</span>
              <span>{content.length}/12000</span>
            </div>
            <button
              className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={parsing || !content.trim()}
              onClick={handleParse}
              type="button"
            >
              {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              解析角色卡
            </button>
          </section>

          <form
            className="rounded-[36px] border border-white/80 bg-white/60 p-6 shadow-[0_30px_100px_rgba(71,85,105,0.16)] backdrop-blur-xl"
            onSubmit={handleSubmit}
          >
            {result ? (
              <>
                <ImportSummary result={result} />
                <SafetyPanel
                  adultConfirmed={Boolean(user?.ageConfirmed)}
                  confirmingAdult={confirmingAdult}
                  onConfirmAdult={() => void handleConfirmAdult()}
                  result={result}
                  safetyAccepted={safetyAccepted}
                  setSafetyAccepted={setSafetyAccepted}
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <TextField label="姓名" value={result.name} onChange={(value) => setResult({ ...result, name: value })} />
                  <TextField
                    label="对你的称呼"
                    value={result.userAddressing ?? ""}
                    onChange={(value) => setResult({ ...result, userAddressing: value })}
                  />
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-slate-600">故事背景</span>
                  <textarea
                    className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                    maxLength={3000}
                    onChange={(event) => setResult({ ...result, storyBackground: event.target.value })}
                    value={result.storyBackground ?? ""}
                  />
                </label>

                <label className="mt-5 block rounded-2xl bg-white/65 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">模型温度</span>
                    <span className="text-sm text-slate-500">{(result.temperature ?? 0.8).toFixed(1)}</span>
                  </div>
                  <input
                    className="mt-3 w-full accent-slate-900"
                    max={1.2}
                    min={0.5}
                    onChange={(event) => setResult({ ...result, temperature: Number(event.target.value) })}
                    step={0.1}
                    type="range"
                    value={result.temperature ?? 0.8}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    默认 0.8。值越低越理性、克制；值越高越感性、发散。
                  </p>
                </label>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-slate-600">角色卡原文</span>
                  <textarea
                    className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                    maxLength={5000}
                    onChange={(event) => setResult({ ...result, rawCharacterCard: event.target.value })}
                    value={result.rawCharacterCard}
                  />
                </label>

                <div className="mt-5">
                  <label className="rounded-2xl bg-white/65 p-4">
                    <span className="text-sm font-medium text-slate-600">成人模式</span>
                    <select
                      className="mt-2 w-full bg-transparent text-sm outline-none"
                      value={result.adultEnabled ? "on" : "off"}
                      onChange={(event) => setResult({ ...result, adultEnabled: event.target.value === "on" })}
                    >
                      <option value="off">关闭</option>
                      <option value="on">开启</option>
                    </select>
                  </label>
                </div>

                {error ? <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">{error}</div> : null}

                <button
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-medium text-white shadow-lg shadow-emerald-700/15 transition hover:-translate-y-0.5 disabled:opacity-60"
                  disabled={submitting || result.safety.blocked}
                  type="submit"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  确认导入并保存
                </button>
              </>
            ) : (
              <div className="flex min-h-[640px] flex-col items-center justify-center rounded-[30px] border border-dashed border-slate-300/80 bg-white/35 px-8 text-center">
                <ShieldCheck className="h-12 w-12 text-slate-300" />
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">等待解析</h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
                  粘贴角色卡后点击解析，这里会展示字段置信度、缺失字段和安全边界提示。
                </p>
                {error ? <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

function ImportSummary({ result }: { result: CharacterCardParseResult }) {
  const storyPreview = result.storyBackground || result.rawCharacterCard;
  const addressing = result.userAddressing || "未填写称呼";

  return (
    <div className="rounded-[28px] bg-slate-950 p-5 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">{sourceLabel(result.sourceFormat)}</p>
          <h2 className="mt-2 text-2xl font-semibold">{result.nickname || result.name}</h2>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm">{result.confidence}% 置信度</div>
      </div>
      <p className="mt-4 text-sm leading-7 text-white/70">
        称呼：{addressing} · 温度：{(result.temperature ?? 0.8).toFixed(1)}
      </p>
      <p className="mt-3 line-clamp-2 text-sm leading-7 text-white/55">{storyPreview || "故事背景待补充"}</p>
      {result.missingFields.length > 0 ? (
        <p className="mt-3 rounded-2xl bg-amber-300/12 px-3 py-2 text-xs leading-5 text-amber-100">
          建议补充：{result.missingFields.map(fieldLabel).join("、")}
        </p>
      ) : null}
    </div>
  );
}

function SafetyPanel({
  adultConfirmed,
  confirmingAdult,
  onConfirmAdult,
  result,
  safetyAccepted,
  setSafetyAccepted,
}: {
  adultConfirmed: boolean;
  confirmingAdult: boolean;
  onConfirmAdult: () => void;
  result: CharacterCardParseResult;
  safetyAccepted: boolean;
  setSafetyAccepted: (value: boolean) => void;
}) {
  const tone = riskTone(result.safety.level);

  return (
    <div className={`mt-5 rounded-[24px] border px-4 py-4 ${tone.className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">安全边界：{tone.label}</p>
          {result.safety.issues.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs leading-5">
              {result.safety.issues.map((issue) => (
                <p key={issue.code}>{issue.message}</p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5">未发现明显风险内容。</p>
          )}
        </div>
      </div>
      {result.adultEnabled && !adultConfirmed ? (
        <button
          className="mt-3 inline-flex h-9 items-center rounded-full bg-slate-950 px-4 text-xs font-medium text-white disabled:opacity-60"
          disabled={confirmingAdult}
          onClick={onConfirmAdult}
          type="button"
        >
          {confirmingAdult ? "确认中..." : "我确认已满 18 岁"}
        </button>
      ) : null}
      {result.safety.level === "high" ? (
        <label className="mt-3 flex items-start gap-2 text-xs leading-5">
          <input
            checked={safetyAccepted}
            className="mt-1"
            onChange={(event) => setSafetyAccepted(event.target.checked)}
            type="checkbox"
          />
          我已理解风险提示，确认角色卡不包含违法、非自愿或露骨内容。
        </label>
      ) : null}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-2xl border border-white/80 bg-white/75 px-4 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function sourceLabel(sourceFormat: CharacterCardParseResult["sourceFormat"]): string {
  const labels: Record<CharacterCardParseResult["sourceFormat"], string> = {
    json: "JSON",
    sillytavern: "SillyTavern",
    text: "Plain Text",
  };

  return labels[sourceFormat];
}

function fieldLabel(field: keyof CharacterCardParseResult): string {
  const labels: Partial<Record<keyof CharacterCardParseResult, string>> = {
    name: "姓名",
    rawCharacterCard: "角色卡原文",
    storyBackground: "故事背景",
    userAddressing: "对你的称呼",
  };

  return labels[field] ?? field;
}

function riskTone(level: SafetyRiskLevel): { label: string; className: string } {
  const map: Record<SafetyRiskLevel, { label: string; className: string }> = {
    none: { label: "安全", className: "border-emerald-100 bg-emerald-50 text-emerald-700" },
    low: { label: "低风险", className: "border-sky-100 bg-sky-50 text-sky-700" },
    medium: { label: "需确认", className: "border-amber-100 bg-amber-50 text-amber-700" },
    high: { label: "高风险", className: "border-orange-100 bg-orange-50 text-orange-700" },
    blocked: { label: "禁止保存", className: "border-red-100 bg-red-50 text-red-700" },
  };

  return map[level];
}
