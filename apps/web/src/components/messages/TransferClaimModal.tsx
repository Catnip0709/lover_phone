import { useState } from "react";
import { Banknote, CheckCircle, Loader2, X } from "lucide-react";
import { claimTransfer } from "@/api/wechat";
import { useAuthStore } from "@/stores/auth-store";

export function TransferClaimModal({
  messageId,
  amount,
  remark,
  onClose,
  onSuccess,
}: {
  messageId: string;
  amount: number;
  remark: string;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}) {
  const { accessToken } = useAuthStore();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    if (!accessToken) return;
    setClaiming(true);
    setError(null);

    try {
      const result = await claimTransfer(accessToken, messageId);
      if (result.success) {
        setClaimed(true);
        onSuccess(result.amountCents || 0);
        setTimeout(onClose, 1500);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "接收失败");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90%] max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-6 text-center text-white">
          <Banknote className="mx-auto h-12 w-12" />
          <h3 className="mt-4 text-xl font-bold">收到转账</h3>
          {remark ? <p className="mt-1 text-white/80">备注：{remark}</p> : null}
        </div>

        <div className="p-6">
          <div className="text-center">
            <p className="text-sm text-slate-500">转账金额</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">¥{amount.toFixed(2)}</p>
          </div>

          {error ? (
            <p className="mt-4 text-center text-sm text-red-500">{error}</p>
          ) : claimed ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">已到账</span>
            </div>
          ) : (
            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-medium text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={claiming}
              onClick={() => void handleClaim()}
              type="button"
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {claiming ? "接收中..." : "确认收款"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
