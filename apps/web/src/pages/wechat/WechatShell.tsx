import { Home, MessageCircle, User, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import WechatChatTab from "./WechatChatTab";
import WechatMeTab from "./WechatMeTab";
import WechatMomentsTab from "./WechatMomentsTab";

export type WechatTab = "chat" | "moments" | "me";

export default function WechatShell() {
  const [activeTab, setActiveTab] = useState<WechatTab>("chat");

  return (
    <main className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(255,205,222,0.48),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.58),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_50%,#edf7ff_100%)]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* 顶部标题栏 */}
        <header className="shrink-0 border-b border-white/70 bg-white/54 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              aria-label="回到主屏幕"
              className="flex h-10 w-12 items-center justify-start text-slate-500 transition hover:text-slate-900"
              to="/phone"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/80 bg-white/72 shadow-sm backdrop-blur-xl">
                <Home className="h-4.5 w-4.5" />
              </span>
            </Link>
            <p className="text-base font-medium tracking-[-0.02em] text-slate-900">
              {activeTab === "chat" ? "微信" : activeTab === "moments" ? "朋友圈" : "我"}
            </p>
            <span className="w-12" />
          </div>
        </header>

        {/* Tab 内容区 */}
        <section className="relative z-10 min-h-0 flex-1 overflow-hidden">
          {activeTab === "chat" && <WechatChatTab />}
          {activeTab === "moments" && <WechatMomentsTab />}
          {activeTab === "me" && <WechatMeTab />}
        </section>

        {/* 底部 TabBar */}
        <nav className="relative z-20 shrink-0 border-t border-white/70 bg-white/72 backdrop-blur-2xl">
          <div className="flex">
            <TabButton
              active={activeTab === "chat"}
              icon={<MessageCircle className="h-6 w-6" />}
              label="微信"
              onClick={() => setActiveTab("chat")}
            />
            <TabButton
              active={activeTab === "moments"}
              icon={<Users className="h-6 w-6" />}
              label="朋友圈"
              onClick={() => setActiveTab("moments")}
            />
            <TabButton
              active={activeTab === "me"}
              icon={<User className="h-6 w-6" />}
              label="我"
              onClick={() => setActiveTab("me")}
            />
          </div>
        </nav>
      </div>
    </main>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
        active ? "text-emerald-600" : "text-slate-400"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
