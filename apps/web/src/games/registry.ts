import type { GameDefinition } from "./types";

// Register concrete game definitions here; the shell will handle routing, char selection, and companion actions.
export const gameRegistry: GameDefinition[] = [];

export function getGameById(gameId: string): GameDefinition | null {
  return gameRegistry.find((game) => game.id === gameId) ?? null;
}
