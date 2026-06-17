import { ChevronRight, QrCode, Settings as SettingsIcon, Sparkles, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WechatProfileView } from "@myphone/shared";
import { getWechatProfile, rechargeWallet } from "@/api/wechat";
import { useAuthStore } from "@/stores/auth-store";

export default function WechatMeTab() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [profile, setProfile] = useState<WechatProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [chargingAmount, setChargingAmount] = useState<6 | 66 | 666 | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    getWechatProfile(accessToken)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setWalletBalance(nextProfile.walletBalanceCents);
      })
      .catch(() => {
        // Silently fail, show placeholder
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const displayName = profile?.displayName ?? "用户";
  const avatarUrl = profile?.avatarUrl;

  async function handleRecharge(amount: 6 | 66 | 666) {
    if (!accessToken || chargingAmount) {
      return;
    }

    if (!window.confirm(`确认虚拟充值 ¥${amount}.00？`)) {
      return;
    }

    setChargingAmount(amount);
    setWalletError(null);
    try {
      const result = await rechargeWallet(accessToken, amount);
      setWalletBalance(result.balanceCents);
      setProfile((current) => current ? { ...current, walletBalanceCents: result.balanceCents } : current);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "充值失败");
    } finally {
      setChargingAmount(null);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white/20">
      {/* 个人信息卡片 */}
      <button
        className="bg-white/54 px-5 py-6 backdrop-blur-xl transition hover:bg-white/70 active:bg-white/60"
        onClick={() => navigate("/messages/me/edit")}
        type="button"
      >
        <div className="flex items-center gap-4">
          {/* 头像 */}
          {avatarUrl ? (
            <img
              alt={displayName}
              className="h-16 w-16 rounded-[22px] object-cover shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-2 ring-white/70"
              src={avatarUrl}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,#dbeafe,#93c5fd)] text-2xl font-semibold text-white shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-2 ring-white/70">
              {displayName[0]}
            </div>
          )}

          {/* 昵称和微信号 */}
          <div className="min-w-0 flex-1 text-left">
            <p className="text-lg font-medium text-slate-900">{displayName}</p>
            <p className="mt-1 text-sm text-slate-400">
              微信号：{profile?.wechatId ?? "未设置"}
            </p>
            {profile?.bio && (
              <p className="mt-1 truncate text-sm text-slate-400">{profile.bio}</p>
            )}
          </div>

          {/* 二维码入口 */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm backdrop-blur">
            <QrCode className="h-5 w-5" />
          </div>
        </div>
      </button>

      {/* 功能列表 */}
      <div className="mt-3 flex-1 overflow-y-auto">
        {/* 钱包区域 */}
        <div className="mb-3 px-4">
          <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/78 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-sky-200/60 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-pink-200/56 blur-2xl" />
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#ffd6e7,#9bdcff)] text-sky-700 shadow-[0_14px_28px_rgba(147,197,253,0.28)] ring-1 ring-white/90">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">钱包</p>
                <p className="text-xs text-slate-500">余额上限 ¥100000.00</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-[-0.02em] text-slate-900">
                  ¥{(walletBalance / 100).toFixed(2)}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {[6, 66, 666].map((amount) => (
                <button
                  className="group rounded-[20px] border border-white/85 bg-white/78 px-2 py-3 text-center shadow-[0_10px_22px_rgba(148,163,184,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-50"
                  disabled={loading || chargingAmount !== null}
                  key={amount}
                  onClick={() => void handleRecharge(amount as 6 | 66 | 666)}
                  type="button"
                >
                  <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-400">
                    <Sparkles className="h-3 w-3 text-pink-300" />
                    充值
                  </span>
                  <span className="mt-1 block text-base font-semibold text-slate-800">
                    ¥{amount}
                  </span>
                </button>
              ))}
            </div>
            {walletError ? (
              <p className="relative mt-3 rounded-2xl bg-rose-50/82 px-3 py-2 text-xs text-rose-500">{walletError}</p>
            ) : null}
          </div>
        </div>

        {/* 设置入口 */}
        <div className="px-4">
          <div className="rounded-2xl border border-white/70 bg-white/54 backdrop-blur-xl">
            <MenuItem icon={<SettingsIcon className="h-5 w-5" />} label="设置" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-white/50 active:bg-white/30"
      type="button"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white shadow-sm">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}
