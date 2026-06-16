import { ArrowLeft, FileText, ImagePlus, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { createCharacter, getCharacter, updateCharacter } from "@/api/characters";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { useAuthStore } from "@/stores/auth-store";

export default function NewCharacter() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const isEditing = Boolean(id);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [storyBackground, setStoryBackground] = useState("");
  const [userAddressing, setUserAddressing] = useState("");
  const [temperature, setTemperature] = useState(0.8);
  const [rawCharacterCard, setRawCharacterCard] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) {
      setLoading(false);
      return;
    }

    getCharacter(accessToken, id)
      .then((character) => {
        const profile = character.structuredProfile ?? {};
        setName(character.name);
        setAvatarUrl(stringValue(profile.avatarUrl));
        setStoryBackground(stringValue(profile.storyBackground));
        setUserAddressing(stringValue(profile.userAddressing));
        setTemperature(numberValue(profile.temperature, 0.8));
        setRawCharacterCard(character.rawCharacterCard ?? "");
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "加载联系人失败"))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name,
        avatarUrl: avatarUrl || undefined,
        storyBackground,
        userAddressing,
        temperature,
        rawCharacterCard,
      };

      if (id) {
        const updated = await updateCharacter(accessToken, id, payload);
        navigate(`/characters/${updated.id}`, { replace: true });
        return;
      }

      const result = await createCharacter(accessToken, payload);
      navigate(`/characters/${result.character.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存联系人失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);

    try {
      setAvatarUrl(await readImageAsDataUrl(file));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "头像读取失败");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(255,205,222,0.46),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.54),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_52%,#edf7ff_100%)]" />
      <div className="relative z-10 min-h-screen">
          <header className="flex items-center justify-between border-b border-white/70 bg-white/54 px-5 py-4 backdrop-blur-xl">
            <Link className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900" to="/characters">
              <ArrowLeft className="h-4 w-4" />
              联系人
            </Link>
            <p className="text-base font-medium tracking-[-0.02em] text-slate-900">{isEditing ? "编辑" : "新建"}</p>
            {isEditing ? (
              <span className="w-12" />
            ) : (
              <Link className="inline-flex w-16 items-center justify-end gap-1 text-sm text-slate-500 hover:text-slate-900" to="/characters/import">
                <FileText className="h-4 w-4" />
                解析
              </Link>
            )}
          </header>

          {loading ? (
            <div className="px-5 py-6 text-sm text-slate-400">正在同步...</div>
          ) : (
            <form className="px-5 py-6" onSubmit={handleSubmit}>
              {!isEditing ? (
                <Link
                  className="mb-5 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/62 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-xl"
                  to="/characters/import"
                >
                  <span>
                    <span className="block font-medium text-slate-800">上传大段角色文字，让 AI 先解析填写</span>
                    <span className="mt-1 block text-xs text-slate-400">也可以直接在当前空白表单中手动填写。</span>
                  </span>
                  <FileText className="h-5 w-5 text-slate-400" />
                </Link>
              ) : null}

              <div className="flex flex-col items-center">
                <CharacterAvatar
                  className="h-24 w-24 rounded-[32px] text-4xl"
                  name={name}
                  structuredProfile={avatarUrl ? { avatarUrl } : null}
                />
                <label className="mt-4 inline-flex items-center rounded-full bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                  <ImagePlus className="mr-2 h-4 w-4" />
                  上传头像
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void handleAvatarChange(event)}
                    type="file"
                  />
                </label>
                {avatarUrl ? (
                  <button
                    className="mt-2 text-xs text-slate-400 hover:text-slate-700"
                    onClick={() => setAvatarUrl("")}
                    type="button"
                  >
                    移除头像
                  </button>
                ) : null}
              </div>

              <div className="mt-7 space-y-4">
                <TextField label="角色名称" value={name} onChange={setName} />
                <TextField label="对你的称呼" value={userAddressing} onChange={setUserAddressing} />

                <label className="block rounded-[26px] border border-white/70 bg-white/58 px-4 py-4 shadow-sm backdrop-blur-xl">
                  <span className="text-sm font-medium text-slate-600">故事背景</span>
                  <textarea
                    className="mt-3 min-h-32 w-full resize-none bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                    onChange={(event) => setStoryBackground(event.target.value)}
                    value={storyBackground}
                  />
                </label>

                <label className="block rounded-[26px] border border-white/70 bg-white/58 px-4 py-4 shadow-sm backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center text-sm font-medium text-slate-600">
                      <SlidersHorizontal className="mr-2 h-4 w-4 text-slate-400" />
                      模型温度
                    </span>
                    <span className="text-sm text-slate-500">{temperature.toFixed(1)}</span>
                  </div>
                  <input
                    className="mt-4 w-full accent-slate-900"
                    max={1.2}
                    min={0.5}
                    onChange={(event) => setTemperature(Number(event.target.value))}
                    step={0.1}
                    type="range"
                    value={temperature}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    默认 0.8。值越低越理性、克制；值越高越感性、发散。后续该角色所有 LLM 回复都会读取这里的温度。
                  </p>
                </label>

                <label className="block rounded-[26px] border border-white/70 bg-white/58 px-4 py-4 shadow-sm backdrop-blur-xl">
                  <span className="text-sm font-medium text-slate-600">完整角色设定</span>
                  <textarea
                    className="mt-3 min-h-32 w-full resize-none bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                    onChange={(event) => setRawCharacterCard(event.target.value)}
                    value={rawCharacterCard}
                  />
                </label>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">{error}</div>
              ) : null}

              <button
                className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "保存修改" : "保存联系人"}
              </button>
            </form>
          )}
      </div>
    </main>
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0.5, Math.min(1.2, value)) : fallback;
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[26px] border border-white/70 bg-white/58 px-4 py-4 shadow-sm backdrop-blur-xl">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        className="mt-2 h-9 w-full bg-transparent text-sm text-slate-800 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

async function readImageAsDataUrl(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("头像仅支持 PNG、JPG 或 WEBP");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("头像图片不能超过 2MB");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("头像读取失败"));
    reader.readAsDataURL(file);
  });
}
