import { ArrowLeft, ChevronRight, FileText, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const APP_VERSION = "0.1.0 内测版";

type AboutItem = {
  key: string;
  label: string;
  description: string;
  icon: ReactNode;
  to: string;
};

const ABOUT_ITEMS: AboutItem[] = [
  {
    key: "terms",
    label: "用户协议",
    description: "使用规则与产品边界。",
    icon: <FileText className="h-5 w-5" />,
    to: "/legal/terms",
  },
  {
    key: "privacy",
    label: "隐私政策",
    description: "数据收集与使用说明。",
    icon: <Shield className="h-5 w-5" />,
    to: "/legal/privacy",
  },
];

export default function AboutSettings() {
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
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">关于</h1>
          <p className="mt-1 text-sm text-slate-500">小手机的版本信息与法律条款。</p>
        </header>

        <section className="mt-6 rounded-[28px] border border-white/75 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-xl">
          <p className="text-xs text-slate-500">当前版本</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{APP_VERSION}</p>
        </section>

        <ul className="mt-4 overflow-hidden rounded-[28px] border border-white/75 bg-white/60 shadow-sm backdrop-blur-xl">
          {ABOUT_ITEMS.map((item, index) => (
            <li
              key={item.key}
              className={index > 0 ? "border-t border-white/70" : undefined}
            >
              <Link
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/80 active:bg-white/60"
                to={item.to}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {item.description}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
