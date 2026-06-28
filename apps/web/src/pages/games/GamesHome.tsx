import { ArrowLeft, Clock3, Gamepad2, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { gameRegistry } from "@/games/registry";
import { listRecentGames, type RecentGameRecord } from "@/games/recent-games";
import type { GameDefinition } from "@/games/types";
import { useAuthStore } from "@/stores/auth-store";

export default function GamesHome() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [recentGames, setRecentGames] = useState<RecentGameRecord[]>([]);

  useEffect(() => {
    setRecentGames(listRecentGames());
  }, []);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b13] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(45,212,191,0.22),transparent_30%),radial-gradient(circle_at_86%_5%,rgba(251,113,133,0.25),transparent_34%),radial-gradient(circle_at_42%_88%,rgba(96,165,250,0.22),transparent_32%),linear-gradient(155deg,#080b13_0%,#111827_52%,#1e293b_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative z-10 min-h-screen px-5 pb-8 pt-4">
        <header className="flex items-center justify-between">
          <Link className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white" to="/phone">
            <ArrowLeft className="h-4 w-4" />
            小手机
          </Link>
          <p className="text-base font-medium tracking-[-0.03em] text-white">游戏</p>
          <span className="h-9 w-9" />
        </header>

        <section className="mt-7 overflow-hidden rounded-[34px] border border-white/12 bg-white/[0.08] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[11px] font-medium text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Char Play Hub
              </p>
              <h1 className="mt-4 text-[34px] font-semibold leading-none tracking-[-0.07em]">
                让角色陪你玩。
              </h1>
              <p className="mt-3 max-w-[280px] text-sm leading-6 text-slate-300">
                这里是小游戏的通用入口。游戏内的 char 动作只读取当前记忆，默认不产生新记忆。
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#22d3ee,#fb7185)] shadow-[0_20px_44px_rgba(45,212,191,0.28)]">
              <Gamepad2 className="h-8 w-8" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 text-[11px] text-slate-200">
            <CapabilityChip icon={<PlugZap className="h-3.5 w-3.5" />} label="配置注册" />
            <CapabilityChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="记忆只读" />
            <CapabilityChip icon={<Clock3 className="h-3.5 w-3.5" />} label="本地最近" />
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle eyebrow="Registry" title="游戏列表" />
          {gameRegistry.length === 0 ? (
            <EmptyRegistry />
          ) : (
            <div className="mt-3 grid gap-3">
              {gameRegistry.map((game) => (
                <GameCard game={game} key={game.id} onOpen={() => navigate(`/games/${game.id}`)} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-7">
          <SectionTitle eyebrow="Local" title="最近游玩" />
          {recentGames.length === 0 ? (
            <div className="mt-3 rounded-[26px] border border-white/10 bg-white/[0.06] px-4 py-5 text-sm text-slate-400">
              最近游玩会保存在当前设备，不进入角色记忆。
            </div>
          ) : (
            <div className="mt-3 grid gap-2.5">
              {recentGames.map((game) => (
                <button
                  className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.07] px-4 py-3 text-left transition hover:border-cyan-200/30 hover:bg-white/[0.11]"
                  key={game.id}
                  onClick={() => navigate(`/games/${game.id}`)}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-medium text-white">{game.title}</span>
                    <span className="mt-1 block text-xs text-slate-400">{formatRecentTime(game.playedAt)}</span>
                  </span>
                  <Gamepad2 className="h-4 w-4 text-cyan-200" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CapabilityChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.07] px-2.5 py-2">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/75">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
    </div>
  );
}

function EmptyRegistry() {
  return (
    <div className="mt-3 rounded-[30px] border border-dashed border-white/18 bg-white/[0.055] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white/[0.08] text-cyan-100">
        <PlugZap className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.04em] text-white">入口框架已就绪</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        后续在 <span className="text-slate-200">apps/web/src/games/registry.ts</span> 注册游戏组件，列表会自动展示。
      </p>
    </div>
  );
}

function GameCard({ game, onOpen }: { game: GameDefinition; onOpen: () => void }) {
  return (
    <button
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.07] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-white/[0.11]"
      onClick={onOpen}
      type="button"
    >
      <div className={`h-24 rounded-[24px] ${game.backdropClassName ?? "bg-[linear-gradient(135deg,#164e63,#be123c)]"}`} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-[-0.03em] text-white">{game.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">{game.description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[10px] text-slate-300">
          {game.status === "ready" ? "可玩" : game.status === "draft" ? "草稿" : "待接入"}
        </span>
      </div>
      {game.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <span className="rounded-full bg-cyan-200/10 px-2 py-0.5 text-[10px] text-cyan-100" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function formatRecentTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
