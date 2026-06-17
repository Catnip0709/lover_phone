import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ConversationView } from "@myphone/shared";
import { listConversations } from "@/api/conversations";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { useAuthStore } from "@/stores/auth-store";

export default function WechatChatTab() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    listConversations(accessToken)
      .then(setConversations)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载会话失败"),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="flex h-full flex-col">
      {/* 搜索栏 */}
      <div className="shrink-0 bg-white/20 px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/58 px-3 py-2 text-sm text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <Search className="h-4 w-4" />
          搜索
        </div>
      </div>

      {/* 会话列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-white/20">
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-400">正在同步...</div>
        ) : error ? (
          <div className="m-5 rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">暂无消息</div>
        ) : (
          <div className="divide-y divide-slate-200/65">
            {conversations.map((conversation) => (
              <button
                className={`flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/55 ${
                  conversation.unreadCount > 0 ? "bg-white/48" : ""
                }`}
                key={conversation.id}
                onClick={() => navigate(`/messages/${conversation.id}`)}
                type="button"
              >
                <CharacterAvatar
                  className="h-12 w-12 rounded-[18px] text-lg"
                  name={conversation.character.nickname}
                  structuredProfile={conversation.character.structuredProfile}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <p
                      className={`text-[15px] font-medium ${
                        conversation.unreadCount > 0 ? "text-slate-950" : "text-slate-800"
                      }`}
                    >
                      {conversation.character.nickname}
                    </p>
                    <p className="shrink-0 text-xs text-slate-400">
                      {formatTime(conversation.lastMessageAt)}
                    </p>
                  </div>
                  <p
                    className={`mt-1 truncate text-sm ${
                      conversation.unreadCount > 0 ? "font-medium text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {conversation.lastMessagePreview ?? ""}
                  </p>
                </div>
                {conversation.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b30] px-1.5 text-xs text-white shadow-[0_0_20px_rgba(255,59,48,0.35)]">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((today - target) / 86_400_000);

  if (dayDiff === 0) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (dayDiff === 1) {
    return "昨天";
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
