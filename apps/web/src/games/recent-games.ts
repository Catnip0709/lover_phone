const RECENT_GAMES_KEY = "myphone:recent-games";
const RECENT_LIMIT = 6;

export type RecentGameRecord = {
  id: string;
  title: string;
  playedAt: string;
};

export function listRecentGames(): RecentGameRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_GAMES_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRecentGameRecord)
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentGame(input: { id: string; title: string }): RecentGameRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const nextRecord: RecentGameRecord = {
    id: input.id,
    title: input.title,
    playedAt: new Date().toISOString(),
  };
  const records = [nextRecord, ...listRecentGames().filter((record) => record.id !== input.id)].slice(0, RECENT_LIMIT);
  window.localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify(records));

  return records;
}

function isRecentGameRecord(value: unknown): value is RecentGameRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.playedAt === "string"
  );
}
