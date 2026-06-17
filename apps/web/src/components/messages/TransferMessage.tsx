import { useState } from "react";
import { ArrowRightLeft, Banknote } from "lucide-react";
import type { MessageView } from "@myphone/shared";
import { TransferClaimModal } from "./TransferClaimModal";

export function TransferMessage({ message, isUser }: { message: MessageView; isUser: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const payload = message.payload as { amount?: number; remark?: string; claimed?: boolean };
  const amount = payload?.amount || Math.floor(Math.random() * 1000) + 50;
  const remark = payload?.remark || message.content || "";
  const claimed = payload?.claimed || false;

  return (
    <>
      <div
        className={`group relative cursor-pointer rounded-3xl border overflow-hidden shadow-[0_10px_28px_rgba(71,85,105,0.12)] transition-transform ${
          isUser ? "rounded-tr-md" : "rounded-tl-md"
        } border-emerald-200/70 bg-white`}
        onClick={() => !isUser && !claimed && setShowModal(true)}
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isUser ? "bg-emerald-100" : "bg-blue-100"}`}>
              <Banknote className={`h-5 w-5 ${isUser ? "text-emerald-600" : "text-blue-600"}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">{isUser ? "已转账" : "收到转账"}</p>
              <p className="text-xl font-bold text-slate-900">¥{amount.toFixed(2)}</p>
            </div>
            <ArrowRightLeft className="h-4 w-4 text-slate-400" />
          </div>
          {remark ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <span>备注：</span>
              <span>{remark}</span>
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>微信转账</span>
            <span className={!isUser && !claimed ? "text-blue-500 font-medium" : ""}>
              {isUser ? "对方已收款" : claimed ? "已收款" : "点击收款"}
            </span>
          </div>
        </div>
      </div>

      {showModal ? (
        <TransferClaimModal
          messageId={message.id}
          amount={amount}
          remark={remark}
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      ) : null}
    </>
  );
}
