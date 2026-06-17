import type { ConversationView, MessageView } from "@myphone/shared";
import { TextMessage } from "./TextMessage";
import { ImageMessage } from "./ImageMessage";
import { VoiceMessage } from "./VoiceMessage";
import { LocationMessage } from "./LocationMessage";
import { RedPacketMessage } from "./RedPacketMessage";
import { TransferMessage } from "./TransferMessage";
import { SystemMessage } from "./SystemMessage";
import { MomentShareMessage } from "./MomentShareMessage";
import { OfficialAccountArticleMessage } from "./OfficialAccountArticleMessage";

export function MessageBubble({
  character,
  message,
}: {
  character: ConversationView["character"] | null;
  message: MessageView;
}) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? <MessageAvatar character={character} /> : null}
      <div className={`flex max-w-[78%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        {renderMessageContent(message, isUser)}
        <time className="mt-1 px-1 text-[10px] text-slate-400">{formatBubbleTime(message.createdAt)}</time>
      </div>
      {isUser ? <UserAvatar /> : null}
    </div>
  );
}

function renderMessageContent(message: MessageView, isUser: boolean) {
  switch (message.type) {
    case "text":
      return <TextMessage message={message} isUser={isUser} />;
    case "voice":
      return <VoiceMessage message={message} isUser={isUser} />;
    case "location":
      return <LocationMessage message={message} isUser={isUser} />;
    case "red_packet":
      return <RedPacketMessage message={message} isUser={isUser} />;
    case "transfer":
      return <TransferMessage message={message} isUser={isUser} />;
    case "system_hint":
      return <SystemMessage message={message} />;
    case "sticker":
      return <TextMessage message={message} isUser={isUser} />;
    case "quote":
      return <TextMessage message={message} isUser={isUser} />;
    case "video":
      return <ImageMessage message={message} isUser={isUser} />;
    default:
      return <TextMessage message={message} isUser={isUser} />;
  }
}

function MessageAvatar({ character }: { character: ConversationView["character"] | null }) {
  return (
    <div
      aria-label={character?.nickname ?? "联系人"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-pink-400 to-red-400 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-1 ring-white/70"
    >
      {character?.nickname?.[0] ?? "?"}
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      aria-label="我 头像"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#dbeafe,#93c5fd)] text-xs font-semibold text-white shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-1 ring-white/70"
    >
      我
    </div>
  );
}

function formatBubbleTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
