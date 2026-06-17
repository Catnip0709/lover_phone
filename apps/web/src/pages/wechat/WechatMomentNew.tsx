import { ArrowLeft, Image, MapPin } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateMomentRequest } from "@myphone/shared";
import { createMoment } from "@/api/moments";
import { useAuthStore } from "@/stores/auth-store";

export default function WechatMomentNew() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    const input: CreateMomentRequest = {
      content: content.trim(),
      imageUrls,
      location: location.trim() || null,
      visibility: "public",
    };

    try {
      await createMoment(accessToken, input);
      navigate("/messages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddImage() {
    if (!newImageUrl.trim()) return;
    setImageUrls((previous) => [...previous, newImageUrl.trim()]);
    setNewImageUrl("");
  }

  return (
    <main className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(255,205,222,0.48),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.58),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_50%,#edf7ff_100%)]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* 顶部导航 */}
        <header className="shrink-0 border-b border-white/70 bg-white/54 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
              onClick={() => navigate("/messages")}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              取消
            </button>
            <p className="text-base font-medium text-slate-900">发布动态</p>
            <button
              className="text-sm font-medium text-emerald-600 disabled:opacity-50"
              disabled={!content.trim() || submitting}
              form="new-moment-form"
              type="submit"
            >
              {submitting ? "发布中..." : "发布"}
            </button>
          </div>
        </header>

        {/* 表单内容 */}
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
          id="new-moment-form"
          onSubmit={handleSubmit}
        >
          {/* 用户信息 */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/80 text-lg font-semibold text-white shadow-sm">
              {user?.nickname?.[0] ?? user?.username?.[0] ?? "我"}
            </div>
            <p className="text-sm font-medium text-slate-800">
              {user?.nickname ?? user?.username ?? "用户"}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 正文输入 */}
          <textarea
            className="min-h-32 w-full resize-none rounded-2xl border border-white/70 bg-white/78 p-4 text-sm leading-relaxed text-slate-800 shadow-sm outline-none backdrop-blur focus:ring-2 focus:ring-emerald-200"
            maxLength={1000}
            placeholder="分享此刻的心情..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <p className="text-right text-xs text-slate-400">{content.length}/1000</p>

          {/* 图片预览 */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((imageUrl, index) => (
                <div className="relative" key={`${imageUrl}-${index}`}>
                  <img
                    alt={`图片-${index}`}
                    className="aspect-square rounded-2xl object-cover shadow-sm ring-1 ring-white/60"
                    src={imageUrl}
                  />
                  <button
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white shadow-sm"
                    onClick={() => setImageUrls((previous) => previous.filter((_, i) => i !== index))}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 添加图片 URL */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-2xl border border-white/70 bg-white/78 px-4 py-2.5 text-sm text-slate-800 outline-none shadow-sm backdrop-blur focus:ring-2 focus:ring-emerald-200"
              placeholder="粘贴图片 URL（最多 9 张）"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              disabled={!newImageUrl.trim() || imageUrls.length >= 9}
              onClick={handleAddImage}
              type="button"
            >
              <Image className="h-4 w-4" />
              添加
            </button>
          </div>

          {/* 位置 */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <input
              className="flex-1 rounded-2xl border border-white/70 bg-white/78 px-4 py-2.5 text-sm text-slate-800 outline-none shadow-sm backdrop-blur focus:ring-2 focus:ring-emerald-200"
              maxLength={80}
              placeholder="添加位置（选填）"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </form>
      </div>
    </main>
  );
}
