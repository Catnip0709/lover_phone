import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  async function handleLogout() {
    if (!window.confirm("确认退出登录？")) {
      return;
    }
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,203,220,0.38),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(201,228,255,0.4),transparent_28%),linear-gradient(135deg,#fff7fb,#ffffff_48%,#edf7ff)]" />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          to="/settings"
        >
          <ArrowLeft className="h-4 w-4" />
          返回设置
        </Link>

        <header className="mt-8">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">隐私与安全</h1>
          <p className="mt-1 text-sm text-slate-500">管理登录会话与账号安全。</p>
        </header>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/75 bg-white/60 shadow-sm backdrop-blur-xl">
          <button
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/80 active:bg-white/60"
            onClick={() => void handleLogout()}
            type="button"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white">
              <LogOut className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-rose-600">退出登录</span>
              <span className="mt-0.5 block text-xs text-slate-500">清除当前登录态，返回登录页。</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        </section>
      </div>
    </main>
  );
}
