import { ArrowLeft, Camera, Check, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { PatchWechatProfileRequest, WechatProfileView } from "@myphone/shared";
import { getWechatProfile, patchWechatProfile } from "@/api/wechat";
import { useAuthStore } from "@/stores/auth-store";

export default function WechatProfileEdit() {
  const { accessToken } = useAuthStore();
  const [profile, setProfile] = useState<WechatProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [wechatId, setWechatId] = useState("");
  const [bio, setBio] = useState("");
  const [region, setRegion] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    getWechatProfile(accessToken)
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName ?? "");
        setWechatId(p.wechatId ?? "");
        setBio(p.bio ?? "");
        setRegion(p.region ?? "");
        setAvatarUrl(p.avatarUrl ?? "");
      })
      .catch(() => setError("加载资料失败"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !displayName.trim()) {
      setError("显示名称不能为空");
      return;
    }

    setSaving(true);
    setError(null);

    const input: PatchWechatProfileRequest = {
      displayName: displayName.trim(),
      wechatId: wechatId.trim() || null,
      bio: bio.trim() || null,
      region: region.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    };

    try {
      const updated = await patchWechatProfile(accessToken, input);
      setProfile(updated);
      window.history.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(255,205,222,0.48),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.58),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_50%,#edf7ff_100%)]" />

      <div className="relative z-10 flex min-h-screen min-h-0 flex-col">
        {/* 顶部导航 */}
        <header className="shrink-0 border-b border-white/70 bg-white/54 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
              to="/messages"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <p className="text-base font-medium text-slate-900">编辑资料</p>
            <button
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 disabled:opacity-50"
              disabled={saving || !displayName.trim()}
              form="edit-form"
              type="submit"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              保存
            </button>
          </div>
        </header>

        {/* 表单内容 */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <form
            className="flex flex-1 flex-col gap-4 px-4 py-6"
            id="edit-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* 头像（暂不支持上传，显示 URL 输入） */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    alt={displayName}
                    className="h-24 w-24 rounded-full object-cover shadow-[0_8px_24px_rgba(148,163,184,0.2)] ring-4 ring-white/70"
                    src={avatarUrl}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(145deg,#dbeafe,#93c5fd)] text-3xl font-semibold text-white shadow-[0_8px_24px_rgba(148,163,184,0.2)] ring-4 ring-white/70">
                    {displayName[0] ?? "我"}
                  </div>
                )}
                <button
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
                  type="button"
                  onClick={() => {
                    const url = window.prompt("输入头像图片 URL：", avatarUrl);
                    if (url !== null) {
                      setAvatarUrl(url);
                    }
                  }}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">点击相机图标修改头像</p>
            </div>

            {/* 字段列表 */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/54 p-4 shadow backdrop-blur-xl">
              <FieldInput
                label="昵称"
                value={displayName}
                onChange={setDisplayName}
                placeholder="输入显示名称"
                maxLength={40}
              />
              <FieldInput
                label="微信号"
                value={wechatId}
                onChange={setWechatId}
                placeholder="设置微信号"
                maxLength={40}
              />
              <FieldTextarea
                label="个性签名"
                value={bio}
                onChange={setBio}
                placeholder="填写个性签名"
                maxLength={200}
              />
              <FieldInput
                label="地区"
                value={region}
                onChange={setRegion}
                placeholder="填写地区"
                maxLength={80}
              />
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-20 shrink-0 text-sm font-medium text-slate-500">{label}</label>
      <input
        className="min-w-0 flex-1 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
        maxLength={maxLength}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <label className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-500">{label}</label>
      <textarea
        className="min-h-20 w-full flex-1 resize-none rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
