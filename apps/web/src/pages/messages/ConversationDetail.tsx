import { ArrowLeft, Loader2, Phone, RotateCcw, Send, ShieldAlert, Video } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { ConversationView, MessageView } from "@myphone/shared";
import {
  getConversationProfile,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/api/conversations";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { useAuthStore } from "@/stores/auth-store";

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const [conversation, setConversation] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedDraft, setFailedDraft] = useState<string | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([listMessages(accessToken, id), getConversationProfile(accessToken, id)])
      .then(([nextMessages, nextProfile]) => {
        if (cancelled) {
          return;
        }
        setMessages(nextMessages);
        setConversation(nextProfile.conversation);
        void markConversationRead(accessToken, id).catch(() => undefined);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "加载消息失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const title = conversation?.character.nickname ?? "微信";

  async function sendDraft(content: string) {
    if (!accessToken || !id || !content.trim() || sending) {
      return;
    }

    const nextContent = content.trim();
    const optimisticUserMessage = createOptimisticUserMessage(
      id,
      conversation?.character.id ?? "",
      nextContent,
    );
    setInput("");
    setMessages((current) => [...current, optimisticUserMessage]);
    setSending(true);
    setError(null);
    setFailedDraft(null);

    try {
      const response = await sendMessage(accessToken, id, { content: nextContent });
      setMessages((current) =>
        current
          .map((message) => (message.id === optimisticUserMessage.id ? response.userMessage : message))
          .concat(response.aiMessage),
      );
      setConversation(response.conversation);
    } catch (requestError) {
      setInput(nextContent);
      setFailedDraft(nextContent);
      setMessages((current) => current.filter((message) => message.id !== optimisticUserMessage.id));
      setError(requestError instanceof Error ? requestError.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendDraft(input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendDraft(input);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(255,205,222,0.48),transparent_30%),radial-gradient(circle_at_24%_88%,rgba(201,228,255,0.5),transparent_32%),linear-gradient(168deg,#fff7fb_0%,#ffffff_50%,#edf7ff_100%)]" />
      <div className="relative z-10 flex h-screen min-h-0 flex-col">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.1)_34%,rgba(226,232,240,0.22)_70%,rgba(226,232,240,0.38))]" />
          <div className="absolute inset-0 backdrop-blur-[0.4px]" />

        <header className="relative z-20 shrink-0 border-b border-white/80 bg-white/72 px-5 py-4 text-slate-950 shadow-[0_8px_28px_rgba(148,163,184,0.12)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
          <Link className="inline-flex items-center gap-1 text-sm text-slate-500" to="/messages">
            <ArrowLeft className="h-4 w-4" />
            微信
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            {conversation ? (
              <CharacterAvatar
                className="h-8 w-8 rounded-xl text-sm"
                name={conversation.character.nickname}
                structuredProfile={conversation.character.structuredProfile}
              />
            ) : null}
            <p className="truncate font-medium text-slate-900">{title}</p>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <Phone className="h-4 w-4" />
            <Video className="h-4 w-4" />
          </div>
          </div>
        </header>

        <section ref={scrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {loading ? (
            <p className="text-center text-sm text-slate-400">正在同步...</p>
          ) : error ? (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm leading-6 text-red-600 backdrop-blur-xl">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              {failedDraft ? (
                <button
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                  onClick={() => void sendDraft(failedDraft)}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重试发送
                </button>
              ) : null}
            </div>
          ) : null}

          {!loading ? (
            messages.length === 0 ? (
              <p className="text-center text-sm text-slate-400">暂无消息</p>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <MessageRow
                    key={message.id}
                    character={conversation?.character ?? null}
                    message={message}
                    previousMessage={index > 0 ? messages[index - 1] : null}
                  />
                ))}
                {sending ? <TypingIndicator character={conversation?.character ?? null} /> : null}
                <div ref={bottomRef} />
              </div>
            )
          ) : null}
        </section>

        <form className="relative z-20 shrink-0 border-t border-white/80 bg-white/72 px-4 py-4 shadow-[0_-8px_28px_rgba(148,163,184,0.12)] backdrop-blur-2xl" onSubmit={handleSubmit}>
          <div className="flex items-end gap-3">
            <textarea
              className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-white/75 bg-white/82 px-4 py-2.5 text-sm leading-5 text-slate-900 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] placeholder:text-slate-400 focus:ring-4 focus:ring-slate-200/70"
              disabled={sending}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="发消息..."
              rows={1}
              value={input}
            />
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#07c160] text-white shadow-lg shadow-emerald-700/15 transition hover:-translate-y-0.5 disabled:opacity-35"
              disabled={sending || !input.trim()}
              type="submit"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function MessageRow({
  character,
  message,
  previousMessage,
}: {
  character: ConversationView["character"] | null;
  message: MessageView;
  previousMessage: MessageView | null;
}) {
  return (
    <>
      {shouldShowTimeDivider(message, previousMessage) ? (
        <div className="flex justify-center">
          <time className="rounded-full border border-white/70 bg-white/55 px-3 py-1 text-[11px] text-slate-400 shadow-sm backdrop-blur-xl">
            {formatMessageTime(message.createdAt)}
          </time>
        </div>
      ) : null}
      <MessageBubble character={character} message={message} />
    </>
  );
}

function MessageBubble({
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
        <div
          className={`rounded-3xl border px-4 py-3 text-sm leading-7 shadow-[0_10px_28px_rgba(71,85,105,0.12)] ${
            isUser
              ? "rounded-tr-md border-emerald-200/70 bg-[#8de35f]/95 text-slate-950"
              : "rounded-tl-md border-slate-200/80 bg-white/92 text-slate-900 backdrop-blur"
          }`}
        >
          {message.content}
        </div>
        <time className="mt-1 px-1 text-[10px] text-slate-400">{formatBubbleTime(message.createdAt)}</time>
      </div>
      {isUser ? <UserAvatar /> : null}
    </div>
  );
}

function TypingIndicator({ character }: { character: ConversationView["character"] | null }) {
  return (
    <div className="flex items-start gap-2">
      <MessageAvatar character={character} />
      <div className="flex items-center gap-2 rounded-3xl rounded-tl-md border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-500 shadow-[0_10px_28px_rgba(71,85,105,0.12)] backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在输入中
      </div>
    </div>
  );
}

function MessageAvatar({ character }: { character: ConversationView["character"] | null }) {
  return (
    <CharacterAvatar
      className="h-9 w-9 rounded-[14px] text-base"
      name={character?.nickname ?? "联系人"}
      structuredProfile={character?.structuredProfile}
    />
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

function createOptimisticUserMessage(
  conversationId: string,
  characterId: string,
  content: string,
): MessageView {
  return {
    id: `optimistic-${Date.now()}`,
    conversationId,
    characterId,
    sender: "user",
    type: "text",
    content,
    payload: { source: "optimistic_user_input" },
    status: "sending",
    createdAt: new Date().toISOString(),
  };
}

function shouldShowTimeDivider(message: MessageView, previousMessage: MessageView | null): boolean {
  if (!previousMessage) {
    return true;
  }

  const currentTime = new Date(message.createdAt).getTime();
  const previousTime = new Date(previousMessage.createdAt).getTime();

  return currentTime - previousTime >= 5 * 60 * 1000;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBubbleTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
