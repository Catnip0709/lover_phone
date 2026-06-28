import type { GameCompanionRequest, GameCompanionResponse } from "@myphone/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

async function request<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `请求失败：${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function requestGameCompanionAction(
  accessToken: string,
  input: GameCompanionRequest,
): Promise<GameCompanionResponse> {
  return request<GameCompanionResponse>("/games/companion-action", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
