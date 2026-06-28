import { useState } from "react";
import { cn } from "@/lib/utils";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
};

export function TagInput({
  tags,
  onChange,
  placeholder = "输入标签后回车添加",
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (tags.length < maxTags && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 p-3 rounded-xl bg-[#FFFEF9] border border-black/12",
        "focus-within:border-[#E8A87C] transition-colors"
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full bg-[#E8A87C]/20 text-sm text-[#3D3D3D]"
          )}
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-[#9A9A9A] hover:text-[#E8A87C] transition-colors"
          >
            ✕
          </button>
        </span>
      ))}
      {tags.length < maxTags && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] bg-transparent text-sm outline-none placeholder:text-[#9A9A9A]"
        />
      )}
    </div>
  );
}
