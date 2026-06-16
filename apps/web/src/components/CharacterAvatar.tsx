type CharacterAvatarProps = {
  name: string;
  structuredProfile?: Record<string, unknown> | null;
  className?: string;
};

const avatarColors = [
  "#94a3b8",
  "#60a5fa",
  "#2dd4bf",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#34d399",
  "#f97316",
];

export function CharacterAvatar({ className = "", name, structuredProfile }: CharacterAvatarProps) {
  const avatarUrl = typeof structuredProfile?.avatarUrl === "string" ? structuredProfile.avatarUrl : "";
  const displayName = name.trim() || "角色";

  if (avatarUrl) {
    return (
      <img
        alt={`${displayName} 头像`}
        className={`shrink-0 object-cover shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-1 ring-white/70 ${className}`}
        src={avatarUrl}
      />
    );
  }

  return (
    <div
      aria-label={`${displayName} 头像`}
      className={`flex shrink-0 items-center justify-center font-medium text-white shadow-[0_12px_28px_rgba(71,85,105,0.18)] ring-1 ring-white/70 ${className}`}
      style={{ backgroundColor: avatarColor(displayName) }}
    >
      {lastCharacter(displayName)}
    </div>
  );
}

function lastCharacter(value: string): string {
  const characters = Array.from(value.trim());
  return characters.at(-1) ?? "角";
}

function avatarColor(value: string): string {
  const hash = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}
