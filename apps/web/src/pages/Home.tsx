import {
  BatteryMedium,
  BookText,
  Cloud,
  CloudRain,
  CloudSnow,
  Image,
  MessageCircle,
  Moon,
  Phone,
  Plus,
  Settings,
  SignalHigh,
  Sun,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { listConversations } from "@/api/conversations";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const [now, setNow] = useState(() => new Date());
  const [wechatUnreadCount, setWechatUnreadCount] = useState(0);
  const [featuredCharacterName, setFeaturedCharacterName] = useState<string | null>(null);
  const weather = useMemo(() => pickDailyWeather(now), [formatDailySeed(now)]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setWechatUnreadCount(0);
      return;
    }

    async function refreshUnreadCount() {
      if (!accessToken) {
        return;
      }

      const conversations = await listConversations(accessToken);
      setWechatUnreadCount(conversations.reduce((total, conversation) => total + conversation.unreadCount, 0));
      setFeaturedCharacterName(conversations[0]?.character?.nickname ?? conversations[0]?.character?.name ?? null);
    }

    void refreshUnreadCount().catch(() => setWechatUnreadCount(0));
    window.addEventListener("focus", refreshUnreadCount);

    return () => window.removeEventListener("focus", refreshUnreadCount);
  }, [accessToken]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,203,220,0.52),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(201,228,255,0.52),transparent_32%),radial-gradient(circle_at_54%_86%,rgba(255,255,255,0.78),transparent_38%),linear-gradient(145deg,#fff3f8_0%,#ffffff_46%,#eaf5ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.96),transparent_24%),radial-gradient(circle_at_88%_15%,rgba(255,205,222,0.62),transparent_31%),radial-gradient(circle_at_20%_76%,rgba(197,226,255,0.62),transparent_34%),radial-gradient(circle_at_70%_68%,rgba(255,245,249,0.86),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-14 h-48 rounded-full bg-white/52 blur-3xl" />
      <section className="relative z-10 flex min-h-screen flex-col px-5 pb-6 pt-5 sm:px-8">
              <PhoneStatusBar now={now} />

              <div className="grid grid-cols-[1.05fr_0.95fr] gap-3 pt-9">
                <TimeWidget
                  now={now}
                  characterName={featuredCharacterName}
                  username={user?.nickname || user?.username || "欢迎回来"}
                />
                <WeatherWidget weather={weather} />
              </div>

              <div className="mt-8 grid grid-cols-4 gap-x-5 gap-y-7">
                <PhoneAppIcon
                  label="微信"
                  className="bg-[#22c55e]"
                  icon={<MessageCircle className="h-7 w-7 text-white" />}
                  badge={wechatUnreadCount > 0}
                  onClick={() => navigate("/messages")}
                />
                <PhoneAppIcon
                  label="联系人"
                  className="bg-[#fb7185]"
                  icon={<Plus className="h-7 w-7 text-white" />}
                  onClick={() => navigate("/characters")}
                />
                <PhoneAppIcon
                  label="记忆"
                  className="bg-[#a98467]"
                  icon={<BookText className="h-7 w-7 text-white" />}
                  onClick={() => navigate("/memories")}
                />
                <PhoneAppIcon
                  label="相册"
                  className="bg-[#60a5fa]"
                  icon={<Image className="h-7 w-7 text-white" />}
                />
              </div>

              <div className="mt-auto rounded-[32px] border border-white/70 bg-white/48 p-3 shadow-[8px_10px_28px_rgba(148,163,184,0.2),-8px_-10px_24px_rgba(255,255,255,0.75)] backdrop-blur-2xl">
                <div className="grid grid-cols-3 gap-3">
                  <DockIcon
                    className="bg-[#14b8a6]"
                    icon={<Phone className="h-6 w-6 text-white" />}
                  />
                  <DockIcon
                    className="bg-[#fb7185]"
                    icon={<Plus className="h-6 w-6 text-white" />}
                    onClick={() => navigate("/characters")}
                  />
                  <DockIcon
                    className="bg-[#64748b]"
                    icon={<Settings className="h-6 w-6 text-white" />}
                    onClick={() => navigate("/settings")}
                  />
                </div>
              </div>
      </section>
    </main>
  );
}

function PhoneStatusBar({ now }: { now: Date }) {
  return (
    <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-500/90">
      <span>{formatClock(now)}</span>
      <div className="flex items-center gap-1.5 text-slate-500/85">
        <SignalHigh className="h-4 w-4" />
        <Wifi className="h-4 w-4" />
        <BatteryMedium className="h-4 w-4" />
      </div>
    </div>
  );
}

function TimeWidget({
  now,
  characterName,
  username,
}: {
  now: Date;
  characterName: string | null;
  username: string;
}) {
  const greeting = getDailyGreeting(now, characterName, username);

  return (
    <section className="min-h-[166px] rounded-[32px] border border-white/68 bg-white/42 px-4 py-4 shadow-[12px_16px_40px_rgba(148,163,184,0.18),-12px_-16px_36px_rgba(255,255,255,0.82),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl">
      <p className="text-[12px] font-medium tracking-[-0.01em] text-slate-500/78">{formatShortDateLabel(now)}</p>
      <h1 className="mt-3 text-[40px] font-semibold leading-none tracking-[-0.075em] text-slate-800/90">
        {formatClock(now)}
      </h1>
      <p className="mt-3 text-xs font-medium text-slate-700/80">{greeting.title}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500/76">{greeting.subtitle}</p>
    </section>
  );
}

function WeatherWidget({ weather }: { weather: Weather }) {
  const Icon = weather.icon;

  return (
    <section className="relative min-h-[166px] overflow-hidden rounded-[32px] border border-white/72 bg-white/42 p-4 shadow-[14px_18px_44px_rgba(148,163,184,0.18),-12px_-16px_36px_rgba(255,255,255,0.82),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl">
      <div className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl ${weather.glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500/72">{weather.city}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <h2 className="text-[38px] font-semibold leading-none tracking-[-0.07em] text-slate-800/88">
              {weather.temperature}°
            </h2>
            <div className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[20px] text-white shadow-[8px_10px_22px_rgba(148,163,184,0.22),-6px_-8px_18px_rgba(255,255,255,0.86)] ${weather.iconClass}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-xs leading-4 text-slate-500/78">{weather.label} · {weather.tip}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500/70">
          <span className="min-w-0 rounded-2xl border border-white/62 bg-white/42 px-2.5 py-1.5 leading-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <span className="block text-[9px] text-slate-400/80">体感</span>
            <span className="block truncate font-medium text-slate-600/80">{weather.feelsLike}°</span>
          </span>
          <span className="min-w-0 rounded-2xl border border-white/62 bg-white/42 px-2.5 py-1.5 leading-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <span className="block text-[9px] text-slate-400/80">风力</span>
            <span className="block truncate font-medium text-slate-600/80">{weather.wind}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function DockIcon({
  className,
  icon,
  onClick,
}: {
  className: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className={`flex h-14 items-center justify-center rounded-[22px] shadow-[6px_8px_18px_rgba(100,116,139,0.2),-5px_-6px_16px_rgba(255,255,255,0.72)] transition duration-200 hover:-translate-y-0.5 active:scale-95 ${className}`} onClick={onClick}>
      {icon}
    </button>
  );
}

function PhoneAppIcon({
  label,
  icon,
  className,
  badge = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  badge?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className="group relative flex flex-col items-center gap-2" onClick={onClick}>
      <span
        className={`relative flex h-16 w-16 items-center justify-center rounded-[22px] shadow-lg transition duration-200 group-hover:-translate-y-1 ${className}`}
      >
        {icon}
        {badge ? <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500" /> : null}
      </span>
      <span className="text-xs text-slate-700">{label}</span>
    </button>
  );
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

type Weather = {
  label: string;
  city: string;
  temperature: number;
  feelsLike: number;
  wind: string;
  tip: string;
  glowClass: string;
  iconClass: string;
  icon: typeof Sun;
};

function pickDailyWeather(date: Date): Weather {
  const options: Weather[] = [
    {
      label: "晴",
      city: "当前位置",
      temperature: dailyNumber(date, "sun-temp", 23, 31),
      feelsLike: dailyNumber(date, "sun-feel", 24, 33),
      wind: "微风",
      tip: "适合出门走走",
      glowClass: "bg-amber-200/70",
      iconClass: "bg-[linear-gradient(145deg,#f8c66b,#f59e0b)]",
      icon: Sun,
    },
    {
      label: "雨",
      city: "当前位置",
      temperature: dailyNumber(date, "rain-temp", 17, 24),
      feelsLike: dailyNumber(date, "rain-feel", 16, 23),
      wind: "东风 2 级",
      tip: "记得带伞",
      glowClass: "bg-sky-200/70",
      iconClass: "bg-[linear-gradient(145deg,#7dd3fc,#38bdf8)]",
      icon: CloudRain,
    },
    {
      label: "阴",
      city: "当前位置",
      temperature: dailyNumber(date, "cloud-temp", 18, 27),
      feelsLike: dailyNumber(date, "cloud-feel", 18, 27),
      wind: "北风 1 级",
      tip: "云层很低",
      glowClass: "bg-slate-200/80",
      iconClass: "bg-[linear-gradient(145deg,#cbd5e1,#94a3b8)]",
      icon: Cloud,
    },
    {
      label: "雪",
      city: "当前位置",
      temperature: dailyNumber(date, "snow-temp", -6, 2),
      feelsLike: dailyNumber(date, "snow-feel", -9, 0),
      wind: "西北风 3 级",
      tip: "路面湿滑",
      glowClass: "bg-cyan-100/80",
      iconClass: "bg-[linear-gradient(145deg,#e0f2fe,#93c5fd)]",
      icon: CloudSnow,
    },
    {
      label: "夜间",
      city: "当前位置",
      temperature: dailyNumber(date, "night-temp", 15, 22),
      feelsLike: dailyNumber(date, "night-feel", 14, 21),
      wind: "晚风",
      tip: "适合安静聊天",
      glowClass: "bg-indigo-200/60",
      iconClass: "bg-[linear-gradient(145deg,#818cf8,#475569)]",
      icon: Moon,
    },
  ];

  return options[dailyNumber(date, "weather-kind", 0, options.length - 1)];
}

function getDailyGreeting(date: Date, characterName: string | null, username: string) {
  const name = characterName || username;
  const greetings = [
    {
      title: `${name}在等你`,
      subtitle: "今天也给你留了一点温柔，慢慢打开就好。",
    },
    {
      title: `${name}想见你`,
      subtitle: "先别急着忙，看看有没有一条新消息在等你。",
    },
    {
      title: `${name}说早安`,
      subtitle: "把今天过得轻一点，有人会认真听你说话。",
    },
    {
      title: `${name}陪着你`,
      subtitle: "天气、消息和心情，都可以慢慢告诉他。",
    },
  ];

  return greetings[dailyNumber(date, "home-greeting", 0, greetings.length - 1)];
}

function formatDailySeed(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dailyNumber(date: Date, salt: string, min: number, max: number): number {
  const seed = `${formatDailySeed(date)}:${salt}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return min + (hash % (max - min + 1));
}
