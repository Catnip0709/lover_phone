import { useState } from "react";
import { CheckCircle2, Gift, RotateCcw, Sparkles, WalletCards } from "lucide-react";
import type { MessageView } from "@myphone/shared";
import { RedPacketClaimModal } from "./RedPacketClaimModal";

export function RedPacketMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const payload = message.payload as {
    amount?: number;
    greetings?: string;
    claimed?: boolean;
    status?: "pending" | "accepted" | "refused" | "completed";
    decisionText?: string;
  };
  const amount = payload?.amount || Math.floor(Math.random() * 200) + 10;
  const greetings = payload?.greetings || message.content || "恭喜发财";
  const claimed = payload?.claimed || false;
  const status = payload?.status ?? (claimed ? "accepted" : "pending");
  const isRefused = status === "refused";
  const isAccepted = status === "accepted" || status === "completed";
  const statusLabel = isUser
    ? status === "refused"
      ? "已婉拒 · 已退回"
      : isAccepted
        ? "已收下"
        : "等待对方收取"
    : claimed
      ? "已领取"
      : "领取红包";
  const StatusIcon = status === "refused" ? RotateCcw : CheckCircle2;

  return (
    <>
      <div
        className={`group relative w-[268px] cursor-pointer overflow-hidden rounded-[30px] border shadow-[0_18px_44px_rgba(148,163,184,0.22)] transition duration-200 hover:-translate-y-0.5 ${
          isUser ? "rounded-tr-md" : "rounded-tl-md"
        } ${
          isRefused
            ? "border-white/85 bg-white/78 text-slate-700 backdrop-blur-2xl"
            : "border-white/60 bg-[linear-gradient(145deg,rgba(255,250,253,0.88),rgba(255,211,226,0.76)_42%,rgba(186,230,253,0.72))] text-slate-900 backdrop-blur-2xl"
        }`}
        onClick={() => !isUser && !claimed && setShowModal(true)}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.98),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(255,143,178,0.38),transparent_32%),radial-gradient(circle_at_14%_96%,rgba(125,211,252,0.42),transparent_35%)]" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/55 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-28 w-28 rounded-full bg-pink-200/44 blur-2xl" />

        <div className="relative px-[18px] py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/58 px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur-xl">
              <Sparkles className="h-3 w-3 text-pink-400" />
              心意红包
            </span>
            <Gift className={`${isRefused ? "text-slate-400" : "text-rose-400"} h-[18px] w-[18px]`} />
          </div>

          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[21px] border border-white/70 shadow-[0_12px_26px_rgba(244,114,182,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] ${
              isRefused
                ? "bg-white/72 text-slate-400"
                : "bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(255,226,238,0.78))] text-rose-500"
            }`}
            >
              <WalletCards className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`${isRefused ? "text-slate-600" : "text-slate-950"} text-[26px] font-semibold tracking-[-0.05em]`}>
                ¥{amount.toFixed(2)}
              </p>
              <p className={`${isRefused ? "text-slate-400" : "text-slate-600"} mt-1.5 line-clamp-2 text-[13px] leading-5`}>
                {greetings}
              </p>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/62 bg-white/42 px-4 py-3 backdrop-blur-xl">
          <span
            className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${
              isRefused
                ? "bg-slate-100/70 text-slate-500"
                : isAccepted
                  ? "bg-white/72 text-rose-500"
                  : "bg-white/72 text-sky-600"
            }`}
          >
            {isUser ? <StatusIcon className="h-3.5 w-3.5" /> : null}
            {statusLabel}
          </span>
        </div>
      </div>

      {showModal ? (
        <RedPacketClaimModal
          messageId={message.id}
          amount={amount}
          greetings={greetings}
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      ) : null}
    </>
  );
}
