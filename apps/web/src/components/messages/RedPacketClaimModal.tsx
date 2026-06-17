import { useState } from "react";
import { Gift, Loader2, X } from "lucide-react";
import { claimRedPacket } from "@/api/wechat";
import { useAuthStore } from "@/stores/auth-store";

export function RedPacketClaimModal({
  messageId,
  amount,
  greetings,
  onClose,
  onSuccess,
}: {
  messageId: string;
  amount: number;
  greetings: string;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}) {
  const { accessToken } = useAuthStore();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    if (!accessToken) return;
    setClaiming(true);
    setError(null);

    try {
      const result = await claimRedPacket(accessToken, messageId);
      if (result.success) {
        onSuccess(result.amountCents || 0);
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "领取失败");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90%] max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 to-red-700 shadow-2xl">
        <button
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 py-8 text-center text-white">
          <Gift className="mx-auto h-12 w-12" />
          <h3 className="mt-4 text-xl font-bold">恭喜发财</h3>
          <p className="mt-1 text-white/80">{greetings}</p>
        </div>

        <div className="bg-white p-6">
          <div className="text-center">
            <p className="text-sm text-slate-500">红包金额</p>
            <p className="mt-1 text-3xl font-bold text-red-600">¥{amount.toFixed(2)}</p>
          </div>

          {error ? (
            <p className="mt-4 text-center text-sm text-red-500">{error}</p>
          ) : null}

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 py-3.5 text-sm font-medium text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={claiming}
            onClick={() => void handleClaim()}
            type="button"
          >
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {claiming ? "领取中..." : "领取红包"}
          </button>
        </div>
      </div>
    </div>
  );
}
