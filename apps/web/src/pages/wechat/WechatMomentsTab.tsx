import { Heart, Image, MessageCircle, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MomentView } from "@myphone/shared";
import { addMomentComment, deleteMoment, deleteMomentComment, listMoments, toggleMomentLike } from "@/api/moments";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { useAuthStore } from "@/stores/auth-store";

export default function WechatMomentsTab() {
  const { accessToken, user } = useAuthStore();
  const [moments, setMoments] = useState<MomentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    listMoments(accessToken)
      .then((response) => setMoments(response.items))
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载失败"),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function handleLike(postId: string) {
    if (!accessToken) return;
    try {
      const updated = await toggleMomentLike(accessToken, postId);
      setMoments((previous) => previous.map((m) => (m.id === postId ? updated : m)));
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDelete(postId: string) {
    if (!accessToken) return;
    if (!window.confirm("确认删除这条动态？")) return;

    try {
      await deleteMoment(accessToken, postId);
      setMoments((previous) => previous.filter((m) => m.id !== postId));
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSubmitComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    if (!accessToken || !commentText.trim()) return;

    try {
      const updated = await addMomentComment(accessToken, postId, { content: commentText.trim() });
      setMoments((previous) => previous.map((m) => (m.id === postId ? updated : m)));
      setCommentText("");
      setActiveCommentPostId(null);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!accessToken) return;
    try {
      const updated = await deleteMomentComment(accessToken, postId, commentId);
      setMoments((previous) => previous.map((m) => (m.id === postId ? updated : m)));
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* 顶部封面区 */}
      <div className="relative h-44 bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-500">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-3 right-4 flex items-center gap-3 text-white">
          <span className="text-base font-medium">我的朋友圈</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-xl font-semibold text-slate-700 shadow-md ring-2 ring-white/60">
            我
          </div>
        </div>
      </div>

      {/* 发布入口 */}
      <div className="border-b border-white/60 bg-white/40 px-5 py-4">
        <Link
          className="flex items-center gap-3 rounded-2xl bg-white/78 px-4 py-3 text-sm text-slate-500 shadow-sm transition hover:bg-white active:scale-[0.98]"
          to="/messages/moments/new"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Image className="h-5 w-5" />
          </span>
          分享此刻的心情...
        </Link>
      </div>

      {/* 动态列表 */}
      <div>
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-400">正在同步...</div>
        ) : error ? (
          <div className="m-5 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : moments.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            还没有动态，去分享第一条吧～
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60">
            {moments.map((moment) => (
              <MomentItem
                key={moment.id}
                moment={moment}
                isCommentOpen={activeCommentPostId === moment.id}
                commentText={activeCommentPostId === moment.id ? commentText : ""}
                onLike={() => handleLike(moment.id)}
                onDelete={() => handleDelete(moment.id)}
                onToggleComment={() => {
                  if (activeCommentPostId === moment.id) {
                    setActiveCommentPostId(null);
                    setCommentText("");
                  } else {
                    setActiveCommentPostId(moment.id);
                    setCommentText("");
                  }
                }}
                onChangeCommentText={(value) => setCommentText(value)}
                onSubmitComment={(event) => handleSubmitComment(event, moment.id)}
                onDeleteComment={(commentId) => handleDeleteComment(moment.id, commentId)}
                userId={user?.id ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MomentItem({
  moment,
  isCommentOpen,
  commentText,
  onLike,
  onDelete,
  onToggleComment,
  onChangeCommentText,
  onSubmitComment,
  onDeleteComment,
  userId,
}: {
  moment: MomentView;
  isCommentOpen: boolean;
  commentText: string;
  onLike: () => void;
  onDelete: () => void;
  onToggleComment: () => void;
  onChangeCommentText: (value: string) => void;
  onSubmitComment: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteComment: (commentId: string) => void;
  userId: string | null;
}) {
  const canDeleteAnyComment = Boolean(userId && moment.userId === userId);

  return (
    <div className="px-5 py-5">
      <div className="flex gap-3">
        {/* 头像 */}
        {isImageUrl(moment.authorAvatar) ? (
          <img
            alt={moment.authorName}
            className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-sm"
            src={moment.authorAvatar}
          />
        ) : moment.authorType === "character" ? (
          <CharacterAvatar
            className="h-11 w-11 rounded-2xl text-lg"
            name={moment.authorName}
            structuredProfile={null}
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/80 text-lg font-semibold text-white shadow-sm">
            {moment.authorName.charAt(0)}
          </div>
        )}

        {/* 内容区 */}
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-medium text-slate-800">{moment.authorName}</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{moment.content}</p>

          {/* 图片网格 */}
          {moment.imageUrls.length > 0 && (
            <div className="mt-3 grid max-w-[300px] gap-2" style={{
              gridTemplateColumns: `repeat(${Math.min(moment.imageUrls.length, 3)}, 1fr)`,
            }}>
              {moment.imageUrls.map((imageUrl, index) => (
                <img
                  key={`${imageUrl}-${index}`}
                  alt={`图片-${index}`}
                  className="aspect-square rounded-2xl object-cover shadow-sm ring-1 ring-white/60"
                  src={imageUrl}
                />
              ))}
            </div>
          )}

          {/* 位置信息 */}
          {moment.location && (
            <p className="mt-2 text-xs text-emerald-700/80">{moment.location}</p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>{formatTime(moment.createdAt)}</span>
            <button
              className="ml-auto flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs text-slate-600 shadow-sm transition hover:bg-white"
              onClick={onToggleComment}
              type="button"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              评论
            </button>
          </div>

          {/* 点赞 + 评论区域 */}
          {(moment.likes.length > 0 || moment.comments.length > 0 || isCommentOpen) && (
            <div className="mt-3 overflow-hidden rounded-2xl bg-white/70 shadow-sm backdrop-blur">
              {moment.likes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Heart className="h-4 w-4 text-pink-500" />
                  {moment.likes.map((like, index) => (
                    <span key={like.id}>
                      <span className="text-emerald-700/90">{like.actorName}</span>
                      {index < moment.likes.length - 1 && <span className="text-slate-400">，</span>}
                    </span>
                  ))}
                </div>
              )}

              {moment.likes.length > 0 && moment.comments.length > 0 && (
                <div className="border-t border-slate-200/70" />
              )}

              {moment.comments.length > 0 && (
                <div className="flex flex-col gap-2 px-4 py-2.5 text-sm text-slate-700">
                  {moment.comments.map((comment) => {
                    const canDeleteComment = canDeleteAnyComment || Boolean(userId && comment.userId === userId);

                    return (
                      <div className="flex items-start gap-2" key={comment.id}>
                        <span className="shrink-0 text-emerald-700/90">{comment.actorName}：</span>
                        <span className="min-w-0 flex-1 break-words">{comment.content}</span>
                        {canDeleteComment ? (
                          <button
                            aria-label="删除评论"
                            className="shrink-0 text-xs text-slate-400 transition hover:text-red-500"
                            onClick={() => onDeleteComment(comment.id)}
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 点赞按钮 */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition active:scale-95 ${
                moment.likes.length > 0
                  ? "bg-pink-100 text-pink-600 shadow-sm"
                  : "bg-white/60 text-slate-600 hover:bg-white"
              }`}
              onClick={onLike}
              type="button"
            >
              <Heart className={`h-3.5 w-3.5 ${moment.likes.length > 0 ? "fill-pink-500 text-pink-500" : ""}`} />
              {moment.likes.length > 0 ? `已点赞 ${moment.likes.length}` : "点赞"}
            </button>
          </div>

          {/* 评论输入框 */}
          {isCommentOpen && (
            <form className="mt-3 flex gap-2" onSubmit={onSubmitComment}>
              <input
                className="flex-1 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
                maxLength={500}
                placeholder="说点什么..."
                value={commentText}
                onChange={(e) => onChangeCommentText(e.target.value)}
              />
              <button
                className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-md transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                disabled={!commentText.trim()}
                type="submit"
              >
                发送
              </button>
            </form>
          )}

          {/* 删除按钮 */}
          <button
            className="mt-2 text-xs text-slate-400 transition hover:text-red-500"
            onClick={onDelete}
            type="button"
          >
            删除这条动态
          </button>
        </div>
      </div>
    </div>
  );
}

function isImageUrl(value: string | null): value is string {
  return Boolean(value && (/^https?:\/\//.test(value) || /^data:image\//.test(value)));
}

function formatTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const dayDiff = Math.floor(hours / 24);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (dayDiff < 7) return `${dayDiff}天前`;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
