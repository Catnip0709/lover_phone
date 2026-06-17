import { FileText } from "lucide-react";
import type { MessageView } from "@myphone/shared";

export function OfficialAccountArticleMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const title = (message.payload as { title?: string })?.title || message.content || "文章标题";
  const description = (message.payload as { description?: string })?.description || "文章摘要内容...";
  const source = (message.payload as { source?: string })?.source || "公众号名称";

  return (
    <div
      className={`rounded-3xl border overflow-hidden shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
        isUser
          ? "rounded-tr-md border-emerald-200/70"
          : "rounded-tl-md border-slate-200/80"
      } bg-white`}
    >
      <div className="flex gap-3 p-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <div className="flex flex-col justify-between overflow-hidden">
          <h4 className="line-clamp-2 text-sm font-medium text-slate-900">{title}</h4>
          <p className="line-clamp-1 text-xs text-slate-500">{description}</p>
          <span className="text-xs text-emerald-600">{source}</span>
        </div>
      </div>
    </div>
  );
}
