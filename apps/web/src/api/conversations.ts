import type {
  ConversationProfileView,
  ConversationView,
  MessageView,
  SendMessageRequest,
  SendMessageResponse,
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

export function listConversations(accessToken: string): Promise<ConversationView[]> {
  return request<ConversationView[]>("/conversations", accessToken);
}

export function listMessages(accessToken: string, conversationId: string): Promise<MessageView[]> {
  return request<MessageView[]>(`/conversations/${conversationId}/messages`, accessToken);
}

export function getConversationProfile(
  accessToken: string,
  conversationId: string,
): Promise<ConversationProfileView> {
  return request<ConversationProfileView>(`/conversations/${conversationId}/profile`, accessToken);
}

export function sendMessage(
  accessToken: string,
  conversationId: string,
  input: SendMessageRequest,
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(`/conversations/${conversationId}/messages`, accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function markConversationRead(
  accessToken: string,
  conversationId: string,
): Promise<{ success: true }> {
  return request<{ success: true }>(`/conversations/${conversationId}/read`, accessToken, {
    method: "POST",
  });
}
