import type { CharacterView } from "@myphone/shared";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCharacters } from "@/api/characters";
import { createMemory } from "@/api/memories";
import { useAuthStore } from "@/stores/auth-store";

const TYPE_OPTIONS = [
  { key: "user_profile", icon: "👤", label: "人物" },
  { key: "user_preference", icon: "💡", label: "偏好" },
  { key: "emotion_pattern", icon: "💭", label: "情绪" },
  { key: "promise", icon: "📌", label: "约定" },
];

const VISIBILITY_OPTIONS = [
  {
    key: "private",
    title: "仅当前角色可见",
    descriptionFor: (name: string) => `只有「${name}」能看到这条记忆`,
  },
  {
    key: "public",
    title: "所有角色可见",
    descriptionFor: () => "所有角色都能聊到这件事",
  },
] as const;

const MAX_LENGTH = 500;

export default function MemoryNew() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [characters, setCharacters] = useState<CharacterView[]>([]);
  const [characterId, setCharacterId] = useState<string>("");
  const [type, setType] = useState<string>(TYPE_OPTIONS[0].key);
  const [visibility, setVisibility] = useState<string>("private");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        const data = await listCharacters(accessToken);
        setCharacters(data);
        if (data[0]) setCharacterId(data[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载角色失败");
      }
    })();
  }, [accessToken]);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  );

  async function handleSubmit() {
    if (!accessToken) return;
    const trimmed = content.trim();
    if (!characterId) {
      setError("请选择角色");
      return;
    }
    if (!trimmed) {
      setError("请输入记忆内容");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createMemory(accessToken, {
        characterId,
        type,
        content: trimmed,
        visibility,
      });
      navigate("/memories", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] pb-16 text-[#2C2C2C]">
      <header className="border-b border-[#E8E4DD]/60 bg-[#FAF7F2]/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E4DD] bg-white text-[#6F6A60] hover:text-[#2C2C2C]"
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold tracking-[0.06em]">新增记忆</h1>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl space-y-6 px-5 py-6">
        <Field label="记忆类型">
          <div className="grid grid-cols-4 gap-2">
            {TYPE_OPTIONS.map((option) => {
              const active = type === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setType(option.key)}
                  className={
                    "flex flex-col items-center rounded-2xl border-2 px-2 py-4 text-center transition " +
                    (active
                      ? "border-[#E8A87C] bg-[#E8A87C] text-white"
                      : "border-[#E8E4DD] bg-white text-[#2C2C2C] hover:-translate-y-0.5")
                  }
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="mt-1 text-xs">{option.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="内容">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="把这件值得记住的事情写下来…"
            className="min-h-[120px] w-full resize-y rounded-2xl border border-[#E8E4DD] bg-white p-4 text-[15px] leading-7 text-[#2C2C2C] outline-none focus:border-[#E8A87C]"
          />
          <div className="mt-2 text-right text-xs text-[#8A8A8A]">
            {content.length} / {MAX_LENGTH}
          </div>
        </Field>

        <Field label="属于哪个角色">
          {characters.length === 0 ? (
            <div className="rounded-2xl border border-[#E8E4DD] bg-white px-4 py-3 text-sm text-[#8A8A8A]">
              暂无角色，请先在联系人中创建。
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {characters.map((character) => {
                const active = characterId === character.id;
                const display = character.nickname || character.name;
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setCharacterId(character.id)}
                    className={
                      "flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm transition " +
                      (active
                        ? "border-[#E8A87C] bg-[#FFF9F0]"
                        : "border-[#E8E4DD] bg-white hover:-translate-y-0.5")
                    }
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8A87C] text-xs text-white">
                      {display.slice(0, 1)}
                    </span>
                    <span>{display}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="可见范围">
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((option) => {
              const active = visibility === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setVisibility(option.key)}
                  className={
                    "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition " +
                    (active
                      ? "border-[#E8A87C] bg-[#FFF9F0]"
                      : "border-[#E8E4DD] bg-white hover:border-[#E8A87C]/60")
                  }
                >
                  <span
                    className={
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition " +
                      (active ? "border-[#E8A87C] bg-[#E8A87C]" : "border-[#E8E4DD]")
                    }
                  >
                    {active ? <span className="block h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm">{option.title}</div>
                    <div className="mt-0.5 text-xs text-[#8A8A8A]">
                      {option.descriptionFor(selectedCharacter?.nickname || selectedCharacter?.name || "当前角色")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-2xl border border-[#E8E4DD] bg-white py-3 text-sm text-[#8A8A8A] hover:text-[#2C2C2C]"
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-2xl bg-[#2C2C2C] py-3 text-sm text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "保存中…" : "保存"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 text-sm text-[#2C2C2C]">{label}</div>
      {children}
    </div>
  );
}
