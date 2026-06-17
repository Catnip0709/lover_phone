import { Volume2 } from "lucide-react";
import type { MessageView } from "@myphone/shared";

export function VoiceMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const duration = (message.payload as { duration?: number })?.duration || Math.floor(Math.random() * 10) + 1;
  const transcript = (message.payload as { transcript?: string })?.transcript || message.content || "语音转文字内容";

  return (
    <div
      className={`rounded-3xl border px-4 py-3 shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
        isUser
          ? "rounded-tr-md border-emerald-200/70 bg-[#8de35f]/95"
          : "rounded-tl-md border-slate-200/80 bg-white/92"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isUser ? "bg-slate-800" : "bg-[#07c160]"}`}>
          <Volume2 className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-end gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full ${isUser ? "bg-slate-700" : "bg-[#07c160]"}`}
                style={{
                  width: "4px",
                  height: `${8 + Math.random() * 16}px`,
                }}
              />
            ))}
          </div>
          <span className={`mt-1 block text-xs ${isUser ? "text-slate-700" : "text-slate-500"}`}>
            {duration}"
          </span>
        </div>
      </div>
      {transcript ? (
        <div className={`mt-2 pt-2 border-t ${isUser ? "border-slate-700/30 text-slate-700" : "border-slate-200 text-slate-600"}`}>
          <p className="text-xs">{transcript}</p>
        </div>
      ) : null}
    </div>
  );
}
