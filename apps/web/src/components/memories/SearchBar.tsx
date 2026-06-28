import { useState } from "react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "搜索记忆...",
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFEF9] border transition-all duration-200",
        isFocused ? "border-[#E8A87C] shadow-md" : "border-black/12"
      )}
    >
      <span className="text-[#9A9A9A]">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[#3D3D3D] text-sm outline-none placeholder:text-[#9A9A9A]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="text-[#9A9A9A] hover:text-[#3D3D3D]"
        >
          ✕
        </button>
      )}
    </div>
  );
}
