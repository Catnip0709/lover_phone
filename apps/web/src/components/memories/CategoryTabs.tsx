import { cn } from "@/lib/utils";

type CategoryTab = {
  key: string;
  label: string;
  icon: string;
};

const CATEGORIES: CategoryTab[] = [
  { key: "all", label: "全部", icon: "📋" },
  { key: "user_profile", label: "人物", icon: "👤" },
  { key: "user_preference", label: "偏好", icon: "💡" },
  { key: "emotion_pattern", label: "情绪", icon: "💭" },
  { key: "promise", label: "约定", icon: "📌" },
];

type CategoryTabsProps = {
  selected: string;
  onChange: (key: string) => void;
};

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap",
            "transition-all duration-200 ease-out",
            "hover:-translate-y-0.5 hover:shadow-md",
            selected === cat.key
              ? "bg-[#E8A87C] text-white"
              : "bg-[#FFFEF9] text-[#3D3D3D] border border-black/12"
          )}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
