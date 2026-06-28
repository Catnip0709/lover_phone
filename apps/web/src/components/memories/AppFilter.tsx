import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type AppFilterOption = {
  key: string;
  label: string;
  icon: string;
};

const APP_OPTIONS: AppFilterOption[] = [
  { key: "all", label: "全部来源", icon: "📋" },
  { key: "wechat", label: "微信", icon: "📱" },
  { key: "contacts", label: "通讯录", icon: "📇" },
  { key: "system", label: "系统", icon: "🌐" },
  { key: "moments", label: "朋友圈", icon: "🌟" },
];

type AppFilterProps = {
  selected: string | null;
  onChange: (app: string | null) => void;
};

export function AppFilter({ selected, onChange }: AppFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = APP_OPTIONS.find((opt) => opt.key === selected) ?? APP_OPTIONS[0];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
          "border border-black/12 bg-[#FFFEF9] transition-all duration-200",
          "hover:border-[#E8A87C]",
          isOpen && "border-[#E8A87C]"
        )}
      >
        <span>{selectedOption.icon}</span>
        <span>{selectedOption.label}</span>
        <span className="text-[#9A9A9A] text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-[#FFFEF9] border border-black/12 rounded-xl shadow-lg z-10 overflow-hidden">
          {APP_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                onChange(opt.key === "all" ? null : opt.key);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FFF9E6] transition-colors",
                selected === (opt.key === "all" ? null : opt.key) && "bg-[#FFF9E6] text-[#E8A87C]"
              )}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
