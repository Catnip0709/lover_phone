import { useState, useRef, useEffect } from "react";
import type { CharacterView } from "@myphone/shared";
import { cn } from "@/lib/utils";

type CharacterFilterProps = {
  characters: CharacterView[];
  selected: string | null;
  onChange: (characterId: string | null) => void;
};

export function CharacterFilter({
  characters,
  selected,
  onChange,
}: CharacterFilterProps) {
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

  const selectedCharacter = characters.find((c) => c.id === selected);

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
        <span>{selectedCharacter?.name ?? "全部角色"}</span>
        <span className="text-[#9A9A9A]">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[#FFFEF9] border border-black/12 rounded-xl shadow-lg z-10 overflow-hidden">
          <button
        onClick={() => {
          onChange(null);
          setIsOpen(false);
        }}
        className={cn(
          "w-full px-3 py-2 text-left text-sm hover:bg-[#FFF9E6] transition-colors",
          selected === null && "bg-[#FFF9E6] text-[#E8A87C]"
        )}
      >
        全部角色
      </button>
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => {
                onChange(character.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-[#FFF9E6] transition-colors",
                selected === character.id && "bg-[#FFF9E6] text-[#E8A87C]"
              )}
            >
              {character.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
