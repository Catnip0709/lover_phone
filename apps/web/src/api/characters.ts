import type {
  CharacterCardImportRequest,
  CharacterCardImportResponse,
  CharacterView,
  CreateCharacterRequest,
  CreateCharacterResponse,
  UpdateCharacterRequest,
} from "@myphone/shared";

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

export function listCharacters(accessToken: string): Promise<CharacterView[]> {
  return request<CharacterView[]>("/characters", accessToken);
}

export async function getCharacter(accessToken: string, characterId: string): Promise<CharacterView> {
  const characters = await listCharacters(accessToken);
  const character = characters.find((item) => item.id === characterId);

  if (!character) {
    throw new Error("联系人不存在");
  }

  return character;
}

export function createCharacter(
  accessToken: string,
  input: CreateCharacterRequest,
): Promise<CreateCharacterResponse> {
  return request<CreateCharacterResponse>("/characters", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCharacter(
  accessToken: string,
  characterId: string,
  input: UpdateCharacterRequest,
): Promise<CharacterView> {
  return request<CharacterView>(`/characters/${characterId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateCharacterStatus(
  accessToken: string,
  characterId: string,
  isActive: boolean,
): Promise<CharacterView> {
  return request<CharacterView>(`/characters/${characterId}/status`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function parseCharacterCard(
  accessToken: string,
  input: CharacterCardImportRequest,
): Promise<CharacterCardImportResponse> {
  return request<CharacterCardImportResponse>("/characters/import/parse", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
