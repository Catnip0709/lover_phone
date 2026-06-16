import type {
  ModelConfigView,
  TestModelConfigRequest,
  TestModelConfigResponse,
  UpsertModelConfigRequest,
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

export function listModelConfigs(accessToken: string): Promise<ModelConfigView[]> {
  return request<ModelConfigView[]>("/model-configs", accessToken);
}

export function createModelConfig(
  accessToken: string,
  input: UpsertModelConfigRequest,
): Promise<ModelConfigView> {
  return request<ModelConfigView>("/model-configs", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateModelConfig(
  accessToken: string,
  id: string,
  input: UpsertModelConfigRequest,
): Promise<ModelConfigView> {
  return request<ModelConfigView>(`/model-configs/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function testModelConfig(
  accessToken: string,
  input: TestModelConfigRequest,
): Promise<TestModelConfigResponse> {
  return request<TestModelConfigResponse>("/model-configs/test", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
