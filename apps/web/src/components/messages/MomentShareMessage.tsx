import { Share2 } from "lucide-react";
import type { MessageView } from "@myphone/shared";

export function MomentShareMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const momentContent = (message.payload as { content?: string })?.content || message.content || "分享了一条朋友圈";
  const imageCount = (message.payload as { imageCount?: number })?.imageCount || 0;

  return (
    <div
      className={`rounded-3xl border overflow-hidden shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
        isUser
          ? "rounded-tr-md border-emerald-200/70"
          : "rounded-tl-md border-slate-200/80"
      } bg-white`}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <Share2 className="h-4 w-4 text-slate-500" />
        <span className="text-xs text-slate-500">{isUser ? "我" : "对方"}分享了朋友圈</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-800 line-clamp-2">{momentContent}</p>
        {imageCount > 0 ? (
          <div className="mt-2 flex gap-1">
            {Array.from({ length: Math.min(imageCount, 4) }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200"
              />
            ))}
            {imageCount > 4 ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-xs text-slate-500">
                +{imageCount - 4}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
