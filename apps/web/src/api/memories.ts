import type { AgentMemoryView } from "@myphone/shared";

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

export type MemoryListResponse = {
  data: AgentMemoryView[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MemoryListFilter = {
  characterId?: string;
  app?: string;
  type?: string;
  scope?: string;
  keyword?: string;
  isPinned?: boolean;
  page?: number;
  pageSize?: number;
};

function buildQueryString(filter: MemoryListFilter): string {
  const params = new URLSearchParams();
  if (filter.characterId) params.set("characterId", filter.characterId);
  if (filter.app) params.set("app", filter.app);
  if (filter.type) params.set("type", filter.type);
  if (filter.scope) params.set("scope", filter.scope);
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.isPinned !== undefined) params.set("isPinned", String(filter.isPinned));
  if (filter.page) params.set("page", String(filter.page));
  if (filter.pageSize) params.set("pageSize", String(filter.pageSize));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listMemories(accessToken: string, filter: MemoryListFilter = {}): Promise<MemoryListResponse> {
  return request<MemoryListResponse>(`/memories${buildQueryString(filter)}`, accessToken);
}

export function getMemory(accessToken: string, memoryId: string): Promise<AgentMemoryView> {
  return request<AgentMemoryView>(`/memories/${memoryId}`, accessToken);
}

export type UpdateMemoryRequest = {
  content?: string;
  weight?: number;
  visibility?: string;
  isPinned?: boolean;
  tags?: string[];
  expiresAt?: string | null;
};

export function updateMemory(
  accessToken: string,
  memoryId: string,
  patch: UpdateMemoryRequest
): Promise<AgentMemoryView> {
  return request<AgentMemoryView>(`/memories/${memoryId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteMemory(accessToken: string, memoryId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/memories/${memoryId}`, accessToken, {
    method: "DELETE",
  });
}

export type CreateMemoryRequest = {
  characterId: string;
  type: string;
  content: string;
  weight?: number;
  visibility?: string;
  isPinned?: boolean;
  tags?: string[];
  expiresAt?: string | null;
};

export function createMemory(
  accessToken: string,
  input: CreateMemoryRequest
): Promise<AgentMemoryView> {
  return request<AgentMemoryView>("/memories", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type MemoryStatsResponse = {
  total: number;
  byType: Record<string, number>;
  byApp: Record<string, number>;
  byCharacter: Record<string, number>;
  byVisibility: Record<string, number>;
  recentTrend: Array<{ date: string; count: number }>;
  topMemories: Array<{ id: string; content: string; useCount: number }>;
};

export function getMemoryStats(accessToken: string): Promise<MemoryStatsResponse> {
  return request<MemoryStatsResponse>("/memories/stats", accessToken);
}

export type ExportMemoryResponse = {
  version: string;
  exportedAt: string;
  memories: Array<{
    type: string;
    content: string;
    weight: number;
    visibility: string;
    isPinned: boolean;
    tags: string[];
    expiresAt: string | null;
    createdBy: string;
    createdAt: string;
  }>;
};

export function exportMemories(accessToken: string): Promise<ExportMemoryResponse> {
  return request<ExportMemoryResponse>("/memories/export", accessToken, {
    method: "POST",
  });
}

export type ImportMemoryRequest = {
  characterId?: string;
  memories: Array<{
    type: string;
    content: string;
    weight?: number;
    visibility?: string;
    isPinned?: boolean;
    tags?: string[];
    expiresAt?: string | null;
    createdBy?: string;
  }>;
};

export type ImportMemoryResponse = {
  imported: number;
  skipped: number;
  errors: string[];
};

export function importMemories(
  accessToken: string,
  data: ImportMemoryRequest
): Promise<ImportMemoryResponse> {
  return request<ImportMemoryResponse>("/memories/import", accessToken, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function clearAllMemories(accessToken: string): Promise<{ deleted: number }> {
  return request<{ deleted: number }>("/memories/clear", accessToken, {
    method: "DELETE",
  });
}
