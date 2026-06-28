import type { AgentMemoryView } from "@myphone/shared";
import { cn } from "@/lib/utils";

type MemoryCardProps = {
  memory: AgentMemoryView;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function MemoryCard({ memory, onClick, onEdit, onDelete }: MemoryCardProps) {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") onClick?.();
      }}
      className={cn(
        "rounded-[24px] border border-[#E8E4DD] bg-[#FFFEF9] px-4 py-4 shadow-[0_8px_24px_rgba(44,44,44,0.04)]",
        onClick && "cursor-pointer transition hover:border-[#D4A574]",
        memory.isPinned && "border-[#D4A574] bg-[#FFF9F0]"
      )}
    >
      <p className="text-[15px] leading-7 text-[#2C2C2C]">
        {memory.content}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#9A9A9A]">
        <div className="flex min-w-0 items-center gap-2">
          {memory.isPinned ? (
            <span className="rounded-full bg-[#F5E6C8] px-2 py-0.5 text-[#6F5F38]">置顶</span>
          ) : null}
          <span>{new Date(memory.updatedAt).toLocaleDateString("zh-CN")}</span>
        </div>
        {hasActions ? (
          <div className="flex shrink-0 gap-3">
            {onEdit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="transition-colors hover:text-[#2C2C2C]"
              >
                编辑
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="transition-colors hover:text-red-500"
              >
                删除
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
