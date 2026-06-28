import { cn } from "@/lib/utils";

export function MemorySkeletonCard() {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[#E8E4DD] bg-[#FFFEF9] px-4 py-4 shadow-[0_8px_24px_rgba(44,44,44,0.04)]",
        "animate-pulse"
      )}
    >
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-[#F5E6C8]" />
        <div className="h-4 w-4/5 rounded bg-[#F5E6C8]" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-[#F5E6C8]" />
        <div className="h-3 w-16 rounded bg-[#F5E6C8]" />
      </div>
    </div>
  );
}
