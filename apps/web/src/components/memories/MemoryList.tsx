import type { AgentMemoryView } from "@myphone/shared";
import { MemoryCard } from "./MemoryCard";
import { MemorySkeletonCard } from "./MemorySkeletonCard";
import { EmptyState } from "./EmptyState";

type MemoryListProps = {
  memories: AgentMemoryView[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onMemoryClick?: (memory: AgentMemoryView) => void;
  onMemoryEdit?: (memory: AgentMemoryView) => void;
  onMemoryDelete?: (memory: AgentMemoryView) => void;
};

export function MemoryList({
  memories,
  isLoading,
  emptyTitle,
  emptyDescription,
  onMemoryClick,
  onMemoryEdit,
  onMemoryDelete,
}: MemoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <MemorySkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3 pb-4">
      {memories.map((memory) => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          onClick={onMemoryClick ? () => onMemoryClick(memory) : undefined}
          onEdit={onMemoryEdit ? () => onMemoryEdit(memory) : undefined}
          onDelete={onMemoryDelete ? () => onMemoryDelete(memory) : undefined}
        />
      ))}
    </div>
  );
}
