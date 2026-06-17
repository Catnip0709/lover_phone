import { ArrowLeft, Gift, Loader2, MapPin, Phone, Plus, RotateCcw, Send, ShieldAlert, Sparkles, Video, X } from "lucide-react";
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
import { MessageBubble } from "@/components/messages/MessageBubble";
import { PlusPanel } from "@/components/messages/PlusPanel";
import { getWalletInfo, sendRedPacket as sendRedPacketMessage, sendTransfer as sendTransferMessage } from "@/api/wechat";
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
  const [showPlusPanel, setShowPlusPanel] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [showRedPacketSheet, setShowRedPacketSheet] = useState(false);
  const [redPacketAmount, setRedPacketAmount] = useState("");
  const [redPacketGreetings, setRedPacketGreetings] = useState("恭喜发财，见者有份");
  const [walletBalanceCents, setWalletBalanceCents] = useState<number | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);

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

  async function sendTypedMessage(
    messageType: MessageView["type"],
    payload: Record<string, unknown>,
    content: string,
  ) {
    if (!accessToken || !id || sending) {
      return;
    }

    const optimisticMessage: MessageView = {
      id: `optimistic-${Date.now()}`,
      conversationId: id,
      characterId: conversation?.character.id ?? "",
      sender: "user",
      type: messageType,
      content,
      payload,
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);

    try {
      const response = await sendMessage(accessToken, id, {
        content,
        type: messageType,
        payload,
      });
      setMessages((current) =>
        current
          .map((message) => (message.id === optimisticMessage.id ? response.userMessage : message))
          .concat(response.aiMessage),
      );
      setConversation(response.conversation);
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setError(requestError instanceof Error ? requestError.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLocationName = locationName.trim();
    const nextLocationAddress = locationAddress.trim();

    if (!nextLocationName) {
      setError("请先填写位置名称");
      return;
    }

    setShowLocationSheet(false);
    setShowPlusPanel(false);
    setLocationName("");
    setLocationAddress("");
    setError(null);

    await sendTypedMessage(
      "location",
      {
        location: nextLocationName,
        name: nextLocationName,
        address: nextLocationAddress,
      },
      nextLocationAddress ? `我在${nextLocationName}，${nextLocationAddress}` : `我在${nextLocationName}`,
    );
  }

  async function openRedPacketSheet() {
    if (!accessToken) {
      return;
    }

    setShowRedPacketSheet(true);
    setError(null);
    try {
      const wallet = await getWalletInfo(accessToken);
      setWalletBalanceCents(wallet.balanceCents);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载钱包失败");
    }
  }

  async function handleRedPacketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !id || !conversation?.character.id || sending) {
      return;
    }

    const amount = Number(redPacketAmount);
    const greetings = redPacketGreetings.trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("请填写有效红包金额");
      return;
    }
    if (!greetings) {
      setError("请填写祝福语");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendRedPacketMessage(accessToken, id, conversation.character.id, amount, greetings);
      const [nextMessages, nextProfile, nextWallet] = await Promise.all([
        listMessages(accessToken, id),
        getConversationProfile(accessToken, id),
        getWalletInfo(accessToken),
      ]);
      setMessages(nextMessages);
      setConversation(nextProfile.conversation);
      setWalletBalanceCents(nextWallet.balanceCents);
      setRedPacketAmount("");
      setRedPacketGreetings("恭喜发财，见者有份");
      setShowRedPacketSheet(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "红包发送失败");
    } finally {
      setSending(false);
    }
  }

  async function handleQuickSend(type: string) {
    if (!accessToken || !id || sending) {
      return;
    }

    if (type === "red_packet") {
      await openRedPacketSheet();
      return;
    }

    if (type === "transfer" && conversation?.character.id) {
      setSending(true);
      setError(null);
      try {
        await sendTransferMessage(accessToken, id, conversation.character.id, 131.4, "转账");
        const [nextMessages, nextProfile] = await Promise.all([
          listMessages(accessToken, id),
          getConversationProfile(accessToken, id),
        ]);
        setMessages(nextMessages);
        setConversation(nextProfile.conversation);
        setShowPlusPanel(false);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "发送失败");
      } finally {
        setSending(false);
      }
      return;
    }

    const messageData: Record<string, unknown> = {};
    let content = "";

    switch (type) {
      case "image":
        messageData.type = "image";
        messageData.payload = { imageUrl: "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=beautiful%20scenery&image_size=square" };
        break;
      case "voice":
        messageData.type = "voice";
        messageData.payload = { duration: 5, transcript: "这是一条语音消息" };
        break;
      case "location":
        setShowLocationSheet(true);
        return;
      case "red_packet":
        messageData.type = "red_packet";
        messageData.payload = { amount: 52.0, greetings: "恭喜发财" };
        break;
      case "transfer":
        messageData.type = "transfer";
        messageData.payload = { amount: 131.4, remark: "红包" };
        break;
      default:
        return;
    }

    await sendTypedMessage(
      messageData.type as MessageView["type"],
      messageData.payload as Record<string, unknown>,
      content,
    );
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

        {showLocationSheet ? (
          <LocationComposerSheet
            address={locationAddress}
            disabled={sending}
            location={locationName}
            onAddressChange={setLocationAddress}
            onClose={() => setShowLocationSheet(false)}
            onLocationChange={setLocationName}
            onSubmit={handleLocationSubmit}
          />
        ) : null}

        {showRedPacketSheet ? (
          <RedPacketComposerSheet
            amount={redPacketAmount}
            balanceCents={walletBalanceCents}
            disabled={sending}
            greetings={redPacketGreetings}
            onAmountChange={setRedPacketAmount}
            onClose={() => setShowRedPacketSheet(false)}
            onGreetingsChange={setRedPacketGreetings}
            onSubmit={handleRedPacketSubmit}
          />
        ) : null}

        <form className="relative z-20 shrink-0 border-t border-white/80 bg-white/72 px-4 py-4 shadow-[0_-8px_28px_rgba(148,163,184,0.12)] backdrop-blur-2xl" onSubmit={handleSubmit}>
          <div className="flex items-end gap-3">
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/75 bg-white/82 text-slate-500 transition hover:bg-white"
              onClick={(e) => {
                e.preventDefault();
                setShowPlusPanel(!showPlusPanel);
              }}
              ref={plusButtonRef}
              type="button"
            >
              <Plus className="h-5 w-5" />
            </button>
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
          {showPlusPanel ? (
            <PlusPanel
              onClose={() => setShowPlusPanel(false)}
              onSelect={(type) => {
                setShowPlusPanel(false);
                handleQuickSend(type);
              }}
            />
          ) : null}
        </form>
      </div>
    </main>
  );
}

function LocationComposerSheet({
  address,
  disabled,
  location,
  onAddressChange,
  onClose,
  onLocationChange,
  onSubmit,
}: {
  address: string;
  disabled: boolean;
  location: string;
  onAddressChange: (value: string) => void;
  onClose: () => void;
  onLocationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-slate-900/8 px-3 pb-[92px] backdrop-blur-[3px]">
      <form
        className="relative w-full overflow-hidden rounded-[34px] border border-white/90 bg-white/90 p-4 shadow-[0_-18px_58px_rgba(148,163,184,0.22),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl"
        onSubmit={onSubmit}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-pink-200/58 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 top-4 h-40 w-40 rounded-full bg-sky-200/68 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-white/95" />
        <div className="relative mx-auto mb-4 h-1.5 w-11 rounded-full bg-slate-300/70" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-[linear-gradient(145deg,#ffd6e7,#bfe8ff)] text-sky-700 shadow-[0_14px_30px_rgba(147,197,253,0.34)] ring-1 ring-white/90">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">发送位置</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">告诉他你在哪里，一次填完</p>
            </div>
          </div>
          <button
            aria-label="关闭位置填写"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-500 shadow-[0_8px_20px_rgba(148,163,184,0.16)] transition hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/90 bg-[linear-gradient(145deg,rgba(255,237,246,0.92),rgba(232,246,255,0.94))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_14px_30px_rgba(148,163,184,0.12)]">
          <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-white/50 blur-2xl" />
          <label className="relative block text-xs font-semibold text-slate-600" htmlFor="wechat-location-name">
            位置名称
          </label>
          <input
            autoFocus
            className="relative mt-2 w-full rounded-[22px] border border-white/95 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_10px_22px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-100/80"
            disabled={disabled}
            id="wechat-location-name"
            maxLength={60}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="例如：公司楼下、学校南门、上海虹桥站"
            value={location}
          />

          <label className="relative mt-3 block text-xs font-semibold text-slate-600" htmlFor="wechat-location-address">
            补充说明
          </label>
          <textarea
            className="relative mt-2 max-h-24 min-h-16 w-full resize-none rounded-[22px] border border-white/95 bg-white/90 px-4 py-3 text-sm leading-5 text-slate-900 outline-none shadow-[0_10px_22px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:text-slate-400 focus:border-pink-200 focus:ring-4 focus:ring-pink-100/80"
            disabled={disabled}
            id="wechat-location-address"
            maxLength={120}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="例如：便利店门口，穿白色外套"
            value={address}
          />
        </div>

        <button
          className="relative mt-4 flex h-12 w-full items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#f9a8d4,#7dd3fc)] text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_16px_34px_rgba(125,211,252,0.3),0_10px_24px_rgba(249,168,212,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || !location.trim()}
          type="submit"
        >
          发送位置
        </button>
      </form>
    </div>
  );
}

function RedPacketComposerSheet({
  amount,
  balanceCents,
  disabled,
  greetings,
  onAmountChange,
  onClose,
  onGreetingsChange,
  onSubmit,
}: {
  amount: string;
  balanceCents: number | null;
  disabled: boolean;
  greetings: string;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onGreetingsChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const amountNumber = Number(amount);
  const amountCents = Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : 0;
  const exceedsBalance = balanceCents !== null && amountCents > balanceCents;
  const canSend = amountNumber > 0 && greetings.trim().length > 0 && !exceedsBalance;

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-slate-900/8 px-3 pb-[92px] backdrop-blur-[3px]">
      <form
        className="relative w-full overflow-hidden rounded-[34px] border border-white/90 bg-white/90 p-4 shadow-[0_-18px_58px_rgba(148,163,184,0.22),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl"
        onSubmit={onSubmit}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-rose-200/64 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 top-4 h-40 w-40 rounded-full bg-sky-200/58 blur-3xl" />
        <div className="relative mx-auto mb-4 h-1.5 w-11 rounded-full bg-slate-300/70" />
        <div className="relative mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-[linear-gradient(145deg,#fb7185,#fbcfe8)] text-white shadow-[0_14px_30px_rgba(244,63,94,0.26)] ring-1 ring-white/90">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">发红包</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                角色会看到祝福语，并自己决定收不收
              </p>
            </div>
          </div>
          <button
            aria-label="关闭红包填写"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-500 shadow-[0_8px_20px_rgba(148,163,184,0.16)] transition hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/90 bg-[linear-gradient(145deg,rgba(255,241,242,0.94),rgba(239,246,255,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_14px_30px_rgba(148,163,184,0.12)]">
          <div className="flex items-end justify-between gap-3">
            <label className="block flex-1 text-xs font-semibold text-slate-600" htmlFor="wechat-red-packet-amount">
              金额
              <div className="mt-2 flex items-center rounded-[22px] border border-white/95 bg-white/90 px-4 py-3 shadow-[0_10px_22px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]">
                <span className="mr-2 text-lg font-semibold text-rose-400">¥</span>
                <input
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-[-0.04em] text-slate-900 outline-none placeholder:text-slate-300"
                  disabled={disabled}
                  id="wechat-red-packet-amount"
                  inputMode="decimal"
                  maxLength={8}
                  onChange={(event) => onAmountChange(event.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  value={amount}
                />
              </div>
            </label>
            <div className="mb-1 rounded-2xl bg-white/72 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-[10px] text-slate-400">余额</p>
              <p className="text-xs font-semibold text-slate-700">
                {balanceCents === null ? "加载中" : `¥${(balanceCents / 100).toFixed(2)}`}
              </p>
            </div>
          </div>

          <label className="mt-3 block text-xs font-semibold text-slate-600" htmlFor="wechat-red-packet-greetings">
            祝福语
          </label>
          <textarea
            className="mt-2 max-h-24 min-h-16 w-full resize-none rounded-[22px] border border-white/95 bg-white/90 px-4 py-3 text-sm leading-5 text-slate-900 outline-none shadow-[0_10px_22px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:text-slate-400 focus:border-pink-200 focus:ring-4 focus:ring-pink-100/80"
            disabled={disabled}
            id="wechat-red-packet-greetings"
            maxLength={80}
            onChange={(event) => onGreetingsChange(event.target.value)}
            placeholder="写一句只有他能看懂的话"
            value={greetings}
          />
          {exceedsBalance ? (
            <p className="mt-2 text-xs font-medium text-rose-500">余额不足，先去“我-钱包”充值</p>
          ) : (
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <Sparkles className="h-3 w-3 text-pink-300" />
              若角色拒收，金额会自动退回钱包
            </p>
          )}
        </div>

        <button
          className="relative mt-4 flex h-12 w-full items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#fb7185,#7dd3fc)] text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_16px_34px_rgba(125,211,252,0.28),0_10px_24px_rgba(251,113,133,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || !canSend}
          type="submit"
        >
          发送红包
        </button>
      </form>
    </div>
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

function TypingIndicator({ character }: { character: ConversationView["character"] | null }) {
  return (
    <div className="flex items-start gap-2">
      <div
        aria-label={character?.nickname ?? "联系人"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-pink-400 to-red-400 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-1 ring-white/70"
      >
        {character?.nickname?.[0] ?? "?"}
      </div>
      <div className="flex items-center gap-2 rounded-3xl rounded-tl-md border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-500 shadow-[0_10px_28px_rgba(71,85,105,0.12)] backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在输入中
      </div>
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
