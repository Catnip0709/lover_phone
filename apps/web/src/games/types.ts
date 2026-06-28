import type { CharacterView, GameCompanionResponse, GameMemoryMode } from "@myphone/shared";
import type { ComponentType } from "react";

export type GameRuntimeEvent = {
  phase?: string;
  event?: string;
  score?: number;
  summary?: string;
  payload?: Record<string, unknown>;
  userIntent?: string;
};

export type GameRuntimeProps = {
  character: CharacterView | null;
  memoryMode: GameMemoryMode;
  companion: GameCompanionResponse | null;
  requestCompanionAction: (event: GameRuntimeEvent) => Promise<GameCompanionResponse | null>;
};

export type GameDefinition = {
  id: string;
  title: string;
  description: string;
  status?: "ready" | "draft" | "soon";
  tags?: string[];
  accentClassName?: string;
  backdropClassName?: string;
  component?: ComponentType<GameRuntimeProps>;
};
