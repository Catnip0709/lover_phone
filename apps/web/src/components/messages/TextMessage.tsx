import type { MessageView } from "@myphone/shared";

export function TextMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  return (
    <div
      className={`rounded-3xl border px-4 py-3 text-sm leading-7 shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
        isUser
          ? "rounded-tr-md border-emerald-200/70 bg-[#8de35f]/95 text-slate-950"
          : "rounded-tl-md border-slate-200/80 bg-white/92 text-slate-900 backdrop-blur"
      }`}
    >
      {message.content}
    </div>
  );
}
