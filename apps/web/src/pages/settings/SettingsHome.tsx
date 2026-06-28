import {
  ArrowLeft,
  Bell,
  BookText,
  ChevronRight,
  Info,
  Palette,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

type SettingItem = {
  key: string;
  label: string;
  description: string;
  icon: ReactNode;
  to?: string;
  comingSoon?: boolean;
};

const SETTING_ITEMS: SettingItem[] = [
  {
    key: "model",
    label: "模型设置",
    description: "配置 DeepSeek / GLM / Kimi 等模型的 API Key 与默认模型。",
    icon: <PlugZap className="h-5 w-5" />,
    to: "/settings/model",
  },
  {
    key: "memories",
    label: "记忆日记本",
    description: "管理与每个角色的长期记忆，可置顶、编辑或删除。",
    icon: <BookText className="h-5 w-5" />,
    to: "/memories",
  },
  {
    key: "general",
    label: "通用",
    description: "语言、时区、默认行为。",
    icon: <SlidersHorizontal className="h-5 w-5" />,
    comingSoon: true,
  },
  {
    key: "appearance",
    label: "外观",
    description: "主题、字体大小、深色模式。",
    icon: <Palette className="h-5 w-5" />,
    comingSoon: true,
  },
  {
    key: "notifications",
    label: "通知",
    description: "消息提醒、勿扰时段。",
    icon: <Bell className="h-5 w-5" />,
    comingSoon: true,
  },
  {
    key: "privacy",
    label: "隐私与安全",
    description: "登录会话、数据导出、注销账号。",
    icon: <ShieldCheck className="h-5 w-5" />,
    to: "/settings/privacy",
  },
  {
    key: "about",
    label: "关于",
    description: "版本号、用户协议、隐私政策。",
    icon: <Info className="h-5 w-5" />,
    to: "/settings/about",
  },
];

export default function SettingsHome() {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,203,220,0.38),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(201,228,255,0.4),transparent_28%),linear-gradient(135deg,#fff7fb,#ffffff_48%,#edf7ff)]" />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          to="/phone"
        >
          <ArrowLeft className="h-4 w-4" />
          返回小手机
        </Link>

        <header className="mt-8">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">设置</h1>
          <p className="mt-1 text-sm text-slate-500">管理小手机的全部偏好与连接。</p>
        </header>

        <ul className="mt-6 overflow-hidden rounded-[28px] border border-white/75 bg-white/60 shadow-sm backdrop-blur-xl">
          {SETTING_ITEMS.map((item, index) => {
            const clickable = Boolean(item.to);
            const className =
              "flex w-full items-center gap-4 px-5 py-4 text-left transition" +
              (clickable
                ? " hover:bg-white/80 active:bg-white/60"
                : " cursor-not-allowed opacity-60");

            const content = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    {item.comingSoon ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        敬请期待
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {item.description}
                  </span>
                </span>
                {clickable ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                ) : null}
              </>
            );

            return (
              <li
                key={item.key}
                className={index > 0 ? "border-t border-white/70" : undefined}
              >
                {clickable ? (
                  <button
                    className={className}
                    onClick={() => item.to && navigate(item.to)}
                    type="button"
                  >
                    {content}
                  </button>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
