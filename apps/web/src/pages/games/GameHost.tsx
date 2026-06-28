import {
  ArrowLeft,
  Brain,
  ChevronDown,
  Gamepad2,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import type {
  CharacterView,
  GameCompanionAction,
  GameCompanionMood,
  GameCompanionResponse,
  GameMemoryMode,
} from "@myphone/shared";
import { listCharacters } from "@/api/characters";
import { listConversations } from "@/api/conversations";
import { requestGameCompanionAction } from "@/api/games";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { getGameById } from "@/games/registry";
import { recordRecentGame } from "@/games/recent-games";
import type { GameRuntimeEvent } from "@/games/types";
import { useAuthStore } from "@/stores/auth-store";

const actionLabels: Record<GameCompanionAction, string> = {
  idle: "待机",
  observe: "观察",
  cheer: "鼓励",
  celebrate: "庆祝",
  hint: "提示",
  think: "思考",
  comfort: "安抚",
  tease: "打趣",
  focus: "专注",
};

const moodLabels: Record<GameCompanionMood, string> = {
  calm: "平静",
  happy: "开心",
  excited: "兴奋",
  focused: "认真",
  soft: "温柔",
  playful: "玩心",
  concerned: "关心",
};

export default function GameHost() {
  const navigate = useNavigate();
  const { gameId = "" } = useParams();
  const { accessToken } = useAuthStore();
  const game = useMemo(() => getGameById(gameId), [gameId]);
  const [characters, setCharacters] = useState<CharacterView[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [memoryMode, setMemoryMode] = useState<GameMemoryMode>("readOnly");
  const [companion, setCompanion] = useState<GameCompanionResponse | null>(null);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [companionLoading, setCompanionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companionError, setCompanionError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;
    setLoadingCharacters(true);
    Promise.all([listCharacters(accessToken), listConversations(accessToken).catch(() => [])])
      .then(([characterList, conversations]) => {
        if (cancelled) {
          return;
        }

        setCharacters(characterList);
        const recentCharacterId = conversations[0]?.character.id;
        const defaultCharacter =
          characterList.find((character) => character.id === recentCharacterId) ??
          characterList.find((character) => character.isActive) ??
          characterList[0];
        setSelectedCharacterId((current) => current || defaultCharacter?.id || "");
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "加载陪玩角色失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCharacters(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (game) {
      recordRecentGame({ id: game.id, title: game.title });
    }
  }, [game]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  const requestCompanionAction = useCallback(
    async (event: GameRuntimeEvent): Promise<GameCompanionResponse | null> => {
      if (!accessToken || !game || !selectedCharacter) {
        setCompanionError("请先选择一个陪玩的角色");
        return null;
      }

      setCompanionLoading(true);
      setCompanionError(null);

      try {
        const response = await requestGameCompanionAction(accessToken, {
          gameId: game.id,
          gameTitle: game.title,
          characterId: selectedCharacter.id,
          memoryMode,
          userIntent: event.userIntent,
          gameState: {
            phase: event.phase,
            event: event.event,
            score: event.score,
            summary: event.summary,
            payload: event.payload,
          },
        });
        setCompanion(response);
        return response;
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "生成陪玩动作失败";
        setCompanionError(message);
        return null;
      } finally {
        setCompanionLoading(false);
      }
    },
    [accessToken, game, memoryMode, selectedCharacter],
  );

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090d16] px-6 text-white">
        <div className="max-w-sm rounded-[30px] border border-white/10 bg-white/[0.07] p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
          <Gamepad2 className="mx-auto h-10 w-10 text-cyan-200" />
          <h1 className="mt-4 text-xl font-semibold tracking-[-0.04em]">游戏未注册</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            这个 gameId 还没有出现在注册表里，先回到游戏入口查看当前可用内容。
          </p>
          <button
            className="mt-5 rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
            onClick={() => navigate("/games")}
            type="button"
          >
            返回游戏入口
          </button>
        </div>
      </main>
    );
  }

  const GameComponent = game.component;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b13] text-white">
      <div className={`absolute inset-0 ${game.backdropClassName ?? "bg-[radial-gradient(circle_at_20%_8%,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(251,113,133,0.22),transparent_34%),linear-gradient(155deg,#080b13_0%,#111827_54%,#1e293b_100%)]"}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.14),transparent_34%)]" />
      <div className="relative z-10 min-h-screen px-4 pb-5 pt-4">
        <header className="flex items-center justify-between">
          <Link className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white" to="/games">
            <ArrowLeft className="h-4 w-4" />
            游戏
          </Link>
          <p className="max-w-[180px] truncate text-base font-medium tracking-[-0.03em] text-white">{game.title}</p>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
            <Gamepad2 className="h-4 w-4 text-cyan-100" />
          </span>
        </header>

        <section className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/75">Game Shell</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.06em] text-white">{game.title}</h1>
              <p className="mt-1 text-sm leading-6 text-slate-400">{game.description}</p>
            </div>
            <div className="min-h-[390px] p-4">
              {GameComponent ? (
                <GameComponent
                  character={selectedCharacter}
                  companion={companion}
                  memoryMode={memoryMode}
                  requestCompanionAction={requestCompanionAction}
                />
              ) : (
                <FrameworkPlaceholder
                  companionLoading={companionLoading}
                  disabled={!selectedCharacter || companionLoading}
                  onRequestCompanion={() =>
                    void requestCompanionAction({
                      phase: "framework_ready",
                      event: "用户打开了游戏宿主页，等待具体小游戏接入",
                      summary: "当前只有通用游戏 Shell，未挂载具体游戏组件。",
                      userIntent: "想让角色先陪自己热身一下",
                    })
                  }
                />
              )}
            </div>
          </div>

          <aside className="grid gap-3">
            <CompanionPanel
              companion={companion}
              error={companionError}
              loading={companionLoading}
              selectedCharacter={selectedCharacter}
            />

            <section className="rounded-[30px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-2xl">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <UserRound className="h-4 w-4 text-cyan-200" />
                陪玩设置
              </div>

              <label className="mt-4 block text-xs text-slate-400">选择 char</label>
              <div className="relative mt-2">
                <select
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3 pr-9 text-sm text-white outline-none focus:border-cyan-200/50"
                  disabled={loadingCharacters || characters.length === 0}
                  onChange={(event) => setSelectedCharacterId(event.target.value)}
                  value={selectedCharacterId}
                >
                  {characters.length === 0 ? (
                    <option value="">暂无角色</option>
                  ) : (
                    characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.nickname || character.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>

              <label className="mt-4 block text-xs text-slate-400">记忆模式</label>
              <div className="relative mt-2">
                <select
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3 pr-9 text-sm text-white outline-none focus:border-cyan-200/50"
                  onChange={(event) => setMemoryMode(event.target.value as GameMemoryMode)}
                  value={memoryMode}
                >
                  <option value="readOnly">只读记忆</option>
                  <option value="ephemeral">临时态</option>
                  <option value="off">不读取记忆</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>

              <div className="mt-4 rounded-[22px] border border-emerald-200/15 bg-emerald-200/10 px-3 py-3 text-xs leading-5 text-emerald-50/85">
                <ShieldCheck className="mb-1 h-4 w-4 text-emerald-200" />
                游戏事件只作为本次陪玩上下文；默认不触发长期记忆写入。
              </div>

              {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}
              {!loadingCharacters && characters.length === 0 ? (
                <Link className="mt-3 inline-flex text-sm font-medium text-cyan-200" to="/characters/new">
                  先创建一个角色
                </Link>
              ) : null}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function FrameworkPlaceholder({
  companionLoading,
  disabled,
  onRequestCompanion,
}: {
  companionLoading: boolean;
  disabled: boolean;
  onRequestCompanion: () => void;
}) {
  return (
    <div className="flex min-h-[360px] flex-col justify-between rounded-[30px] border border-dashed border-white/14 bg-slate-950/30 p-5">
      <div>
        <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-[linear-gradient(145deg,#22d3ee,#fb7185)] shadow-[0_18px_44px_rgba(45,212,191,0.24)]">
          <PlugIcon />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.06em] text-white">等待游戏组件接入</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
          这里已经准备好统一宿主、角色选择、记忆模式和 char 陪玩动作请求。具体小游戏接入后，可以直接调用
          requestCompanionAction。
        </p>
      </div>
      <button
        className="mt-8 inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={onRequestCompanion}
        type="button"
      >
        {companionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        试跑陪玩动作
      </button>
    </div>
  );
}

function CompanionPanel({
  companion,
  error,
  loading,
  selectedCharacter,
}: {
  companion: GameCompanionResponse | null;
  error: string | null;
  loading: boolean;
  selectedCharacter: CharacterView | null;
}) {
  const name = selectedCharacter?.nickname || selectedCharacter?.name || "Char";

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.08] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedCharacter ? (
            <CharacterAvatar
              className="h-12 w-12 rounded-[20px] text-lg"
              name={selectedCharacter.name}
              structuredProfile={selectedCharacter.structuredProfile}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white/10 text-slate-300">
              <UserRound className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em] text-white">{name}</p>
            <p className="text-xs text-slate-400">陪玩动作面板</p>
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-cyan-200" />
      </div>

      <div className="mt-4 min-h-[142px] rounded-[24px] border border-white/10 bg-slate-950/38 p-4">
        {loading ? (
          <div className="flex h-[110px] items-center justify-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
            正在生成陪玩动作...
          </div>
        ) : companion ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge icon={<Wand2 className="h-3.5 w-3.5" />} label={actionLabels[companion.action]} />
              <Badge icon={<Brain className="h-3.5 w-3.5" />} label={moodLabels[companion.mood]} />
            </div>
            <p className="mt-4 text-[15px] leading-7 text-white">{companion.text}</p>
            <p className="mt-3 text-[11px] text-slate-500">
              读取记忆 {companion.usedMemoryCount} 条 · {memoryModeLabel(companion.memoryMode)}
            </p>
          </>
        ) : (
          <div className="flex h-[110px] flex-col justify-center text-sm leading-6 text-slate-400">
            <p>游戏可以在关键节点请求 char 动作。</p>
            <p className="mt-1 text-xs text-slate-500">返回结构：action + mood + text。</p>
          </div>
        )}
      </div>

      {error ? <p className="mt-3 rounded-2xl border border-red-200/15 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p> : null}
    </section>
  );
}

function Badge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/15 bg-cyan-200/10 px-2.5 py-1 text-[11px] text-cyan-100">
      {icon}
      {label}
    </span>
  );
}

function PlugIcon() {
  return <Gamepad2 className="h-7 w-7 text-white" />;
}

function memoryModeLabel(mode: GameMemoryMode): string {
  if (mode === "off") {
    return "不读取记忆";
  }

  if (mode === "ephemeral") {
    return "临时态";
  }

  return "只读记忆";
}
