import { ArrowLeft, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { CharacterView } from "@myphone/shared";
import { listCharacters } from "@/api/characters";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { useAuthStore } from "@/stores/auth-store";

export default function CharacterList() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [characters, setCharacters] = useState<CharacterView[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    listCharacters(accessToken)
      .then(setCharacters)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载联系人失败"),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  const filteredCharacters = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return characters;
    }

    return characters.filter((character) => character.name.toLowerCase().includes(normalizedKeyword));
  }, [characters, keyword]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(255,205,222,0.48),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.58),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_50%,#edf7ff_100%)]" />
      <div className="relative z-10 min-h-screen">
          <header className="border-b border-white/70 bg-white/54 px-5 pb-4 pt-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <Link className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900" to="/phone">
                <ArrowLeft className="h-4 w-4" />
                小手机
              </Link>
              <p className="text-base font-medium tracking-[-0.02em] text-slate-900">联系人</p>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-slate-700 shadow-sm"
                onClick={() => navigate("/characters/new")}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/58 px-3 py-2 text-sm text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Search className="h-4 w-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索联系人"
                value={keyword}
              />
            </label>
          </header>

          <section className="min-h-[calc(100vh-105px)] bg-white/20">
            {loading ? (
              <div className="px-5 py-6 text-sm text-slate-400">正在同步...</div>
            ) : error ? (
              <div className="m-5 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">暂无联系人</div>
            ) : (
              <div className="divide-y divide-slate-200/65">
                {filteredCharacters.map((character) => (
                  <button
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/55"
                    key={character.id}
                    onClick={() => navigate(`/characters/${character.id}`)}
                    type="button"
                  >
                    <CharacterAvatar
                      className="h-12 w-12 rounded-[18px] text-lg"
                      name={character.name}
                      structuredProfile={character.structuredProfile}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-slate-900">{character.name}</p>
                      <p className="mt-1 text-xs text-slate-400">更新于 {formatDate(character.updatedAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
      </div>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
