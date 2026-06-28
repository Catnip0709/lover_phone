import { cn } from "@/lib/utils";

type EmptyStateProps = {
  className?: string;
  title?: string;
  description?: string;
};

export function EmptyState({
  className,
  title = "暂无记忆",
  description = "和角色多聊聊，记忆会慢慢出现。",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[#E8E4DD] bg-white/60 px-8 py-12",
        className
      )}
    >
      <div className="mb-4 h-12 w-12 rounded-2xl border border-[#E8E4DD] bg-[#FFFEF9]" />
      <h3 className="mb-2 text-base font-medium text-[#3D3D3D]">{title}</h3>
      <p className="text-center text-sm leading-6 text-[#9A9A9A]">{description}</p>
    </div>
  );
}
