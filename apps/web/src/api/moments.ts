import type { CreateMomentCommentRequest, CreateMomentRequest, MomentView } from "@myphone/shared";

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

export function listMoments(accessToken: string): Promise<{ items: MomentView[] }> {
  return request<{ items: MomentView[] }>(`/wechat/moments`, accessToken);
}

export function createMoment(accessToken: string, input: CreateMomentRequest): Promise<MomentView> {
  return request<MomentView>("/wechat/moments", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteMoment(accessToken: string, postId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/wechat/moments/${postId}`, accessToken, {
    method: "DELETE",
  });
}

export function toggleMomentLike(accessToken: string, postId: string): Promise<MomentView> {
  return request<MomentView>(`/wechat/moments/${postId}/like`, accessToken, {
    method: "POST",
  });
}

export function addMomentComment(
  accessToken: string,
  postId: string,
  input: CreateMomentCommentRequest,
): Promise<MomentView> {
  return request<MomentView>(`/wechat/moments/${postId}/comments`, accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteMomentComment(
  accessToken: string,
  postId: string,
  commentId: string,
): Promise<MomentView> {
  return request<MomentView>(`/wechat/moments/${postId}/comments/${commentId}`, accessToken, {
    method: "DELETE",
  });
}
