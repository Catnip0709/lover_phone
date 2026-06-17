import type {
  ChatStreamEvent,
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

export type ChatStreamHandlers = {
  onEvent?: (event: ChatStreamEvent) => void | Promise<void>;
  signal?: AbortSignal;
};

export async function sendMessageStream(
  accessToken: string,
  conversationId: string,
  input: SendMessageRequest,
  handlers: ChatStreamHandlers = {},
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(input),
    signal: handlers.signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `请求失败：${response.status}`);
  }

  if (!response.body) {
    throw new Error("流式响应为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload) as ChatStreamEvent;
          await handlers.onEvent?.(parsed);
        } catch {
          // 忽略损坏的事件
        }
      }
    }
  }
}

export function markConversationRead(
  accessToken: string,
  conversationId: string,
): Promise<{ success: true }> {
  return request<{ success: true }>(`/conversations/${conversationId}/read`, accessToken, {
    method: "POST",
  });
}
