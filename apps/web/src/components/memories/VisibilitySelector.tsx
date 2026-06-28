import { cn } from "@/lib/utils";

type VisibilityOption = {
  key: string;
  label: string;
  description: string;
  icon: string;
};

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    key: "private",
    label: "仅当前角色",
    description: "只有当前角色能看到这条记忆",
    icon: "🔒",
  },
  {
    key: "public",
    label: "所有角色",
    description: "所有角色都能使用这条记忆",
    icon: "🌐",
  },
  {
    key: "system",
    label: "系统设定",
    description: "最高优先级，不可被AI覆盖",
    icon: "⚙️",
  },
];

type VisibilitySelectorProps = {
  value: string;
  onChange: (visibility: string) => void;
  disabled?: boolean;
};

export function VisibilitySelector({ value, onChange, disabled }: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      {VISIBILITY_OPTIONS.map((option) => (
        <label
          key={option.key}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
            value === option.key
              ? "border-[#E8A87C] bg-[#FFF9E6]"
              : "border-black/12 bg-[#FFFEF9] hover:border-[#E8A87C]/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="radio"
            name="visibility"
            value={option.key}
            checked={value === option.key}
            onChange={() => onChange(option.key)}
            disabled={disabled}
            className="sr-only"
          />
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              value === option.key
                ? "border-[#E8A87C] bg-[#E8A87C]"
                : "border-[#9A9A9A]"
            )}
          >
            {value === option.key && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          <span className="text-lg">{option.icon}</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-[#3D3D3D]">{option.label}</div>
            <div className="text-xs text-[#9A9A9A]">{option.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
