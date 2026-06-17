import type { MessageView } from "@myphone/shared";

export function ImageMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const imageUrl = (message.payload as { imageUrl?: string })?.imageUrl || "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20scenery%20landscape&image_size=landscape_4_3";

  return (
    <div
      className={`rounded-3xl border overflow-hidden shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
        isUser ? "rounded-tr-md border-emerald-200/70" : "rounded-tl-md border-slate-200/80"
      }`}
    >
      <img
        alt="图片消息"
        className="max-h-64 w-auto rounded-none object-cover"
        src={imageUrl}
      />
      {message.content ? (
        <div
          className={`px-4 py-2 text-sm ${isUser ? "bg-[#8de35f]/95" : "bg-white/92"}`}
        >
          {message.content}
        </div>
      ) : null}
    </div>
  );
}
