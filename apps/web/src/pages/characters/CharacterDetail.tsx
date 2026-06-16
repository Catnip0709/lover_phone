import { ArrowLeft, Pencil, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { CharacterView } from "@myphone/shared";
import { getCharacter } from "@/api/characters";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { useAuthStore } from "@/stores/auth-store";

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const [character, setCharacter] = useState<CharacterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    getCharacter(accessToken, id)
      .then(setCharacter)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载联系人失败"),
      )
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const profile = character?.structuredProfile ?? {};

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(255,205,222,0.46),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.54),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_52%,#edf7ff_100%)]" />
      <div className="relative z-10 min-h-screen">
          <header className="flex items-center justify-between border-b border-white/70 bg-white/54 px-5 py-4 backdrop-blur-xl">
            <Link className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900" to="/characters">
              <ArrowLeft className="h-4 w-4" />
              联系人
            </Link>
            <p className="text-base font-medium tracking-[-0.02em] text-slate-900">详情</p>
            {character ? (
              <Link
                className="inline-flex w-12 items-center justify-end text-sm text-slate-500 hover:text-slate-900"
                to={`/characters/${character.id}/edit`}
              >
                <Pencil className="h-4 w-4" />
              </Link>
            ) : (
              <span className="w-12" />
            )}
          </header>

          {loading ? (
            <div className="px-5 py-6 text-sm text-slate-400">正在同步...</div>
          ) : error ? (
            <div className="m-5 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : character ? (
            <section className="px-5 py-6">
              <div className="flex flex-col items-center text-center">
                <CharacterAvatar
                  className="h-24 w-24 rounded-[32px] text-4xl"
                  name={character.name}
                  structuredProfile={character.structuredProfile}
                />
                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{character.name}</h1>
              </div>

              <div className="mt-7 space-y-4">
                <InfoBlock label="故事背景" value={stringValue(profile.storyBackground) || "未填写"} />
                <InfoBlock label="对你的称呼" value={stringValue(profile.userAddressing) || "未填写"} />
                <InfoBlock
                  label="模型温度"
                  value={typeof profile.temperature === "number" ? profile.temperature.toFixed(1) : "0.8"}
                  icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                />
                <InfoBlock label="完整角色设定" value={character.rawCharacterCard || "未填写"} />
              </div>
            </section>
          ) : null}
      </div>
    </main>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-[26px] border border-white/70 bg-white/58 px-4 py-4 shadow-sm backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{value}</p>
    </section>
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
