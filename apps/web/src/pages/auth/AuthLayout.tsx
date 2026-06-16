import { BatteryMedium, HeartHandshake, SignalHigh, Wifi } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,203,220,0.52),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(201,228,255,0.52),transparent_32%),radial-gradient(circle_at_54%_86%,rgba(255,255,255,0.78),transparent_38%),linear-gradient(145deg,#fff3f8_0%,#ffffff_46%,#eaf5ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.92),transparent_22%),radial-gradient(circle_at_86%_16%,rgba(255,207,218,0.58),transparent_28%),radial-gradient(circle_at_26%_72%,rgba(186,230,253,0.44),transparent_30%)]" />
      <section className="relative z-10 flex min-h-screen flex-col px-5 pb-6 pt-5 sm:px-8">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <SignalHigh className="h-4 w-4" />
                  <Wifi className="h-4 w-4" />
                  <BatteryMedium className="h-4 w-4" />
                </div>
              </div>

              <div className="pt-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 shadow-2xl">
                  <HeartHandshake className="h-8 w-8 text-white" />
                </div>
                <h1 className="mt-8 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                  进入小手机
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  登录后会直接回到手机桌面。
                </p>
              </div>

              <div className="mt-auto rounded-[30px] border border-white/75 bg-white/62 p-5 shadow-[0_24px_80px_rgba(45,55,72,0.16)] backdrop-blur-xl">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
                </div>
                {children}
              </div>
      </section>
    </main>
  );
}
