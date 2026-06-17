import { MapPin } from "lucide-react";
import type { MessageView } from "@myphone/shared";

export function LocationMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const payload = message.payload as { location?: string; name?: string; address?: string };
  const location = payload.location || payload.name || message.content || "未知位置";
  const address = payload.address || "点击查看位置";

  return (
    <div
      className={`w-[256px] max-w-[calc(100vw-132px)] overflow-hidden rounded-3xl border bg-white/92 shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
        isUser ? "rounded-tr-md border-emerald-200/70" : "rounded-tl-md border-slate-200/80"
      }`}
    >
      <div className={`relative h-32 overflow-hidden ${isUser ? "bg-gradient-to-br from-emerald-200 via-teal-100 to-sky-200" : "bg-gradient-to-br from-blue-200 via-cyan-100 to-white"}`}>
        <div className="absolute inset-0 opacity-70">
          <div className="absolute left-4 top-5 h-20 w-40 rounded-full border border-white/70" />
          <div className="absolute -right-8 top-8 h-24 w-36 rounded-full border border-white/65" />
          <div className="absolute bottom-3 left-8 h-px w-52 rotate-[-18deg] bg-white/70" />
          <div className="absolute bottom-10 left-0 h-px w-64 rotate-[22deg] bg-white/65" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/86 text-emerald-500 shadow-[0_14px_30px_rgba(15,118,110,0.18)] ring-1 ring-white/80">
            <MapPin className="h-6 w-6" />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100/80 px-4 py-3">
        <p className="truncate text-sm font-semibold text-slate-800">{location}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{address}</p>
      </div>
    </div>
  );
}
