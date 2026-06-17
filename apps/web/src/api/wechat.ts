import type { WechatProfileView, PatchWechatProfileRequest } from "@myphone/shared";

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

export function getWechatProfile(accessToken: string): Promise<WechatProfileView> {
  return request<WechatProfileView>("/wechat/profile", accessToken);
}

export function patchWechatProfile(
  accessToken: string,
  input: PatchWechatProfileRequest,
): Promise<WechatProfileView> {
  return request<WechatProfileView>("/wechat/profile", accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export type WalletInfo = {
  balanceCents: number;
  transactions: Array<{
    id: string;
    type: "red_packet" | "transfer" | "recharge";
    amountCents: number;
    direction: "sent" | "received";
    remark: string | null;
    status: string;
    createdAt: string;
  }>;
};

export function getWalletInfo(accessToken: string): Promise<WalletInfo> {
  return request<WalletInfo>("/wechat/wallet", accessToken);
}

export function rechargeWallet(
  accessToken: string,
  amount: 6 | 66 | 666,
): Promise<{ balanceCents: number; addedCents: number }> {
  return request<{ balanceCents: number; addedCents: number }>("/wechat/wallet/recharge", accessToken, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function claimRedPacket(accessToken: string, messageId: string): Promise<{ success: boolean; amountCents?: number; message: string }> {
  return request<{ success: boolean; amountCents?: number; message: string }>(
    `/wechat/wallet/red-packet/${messageId}/claim`,
    accessToken,
    { method: "POST" },
  );
}

export function claimTransfer(accessToken: string, messageId: string): Promise<{ success: boolean; amountCents?: number; message: string }> {
  return request<{ success: boolean; amountCents?: number; message: string }>(
    `/wechat/wallet/transfer/${messageId}/claim`,
    accessToken,
    { method: "POST" },
  );
}

export function sendRedPacket(
  accessToken: string,
  conversationId: string,
  characterId: string,
  amount: number,
  greetings: string,
): Promise<{ messageId: string }> {
  return request<{ messageId: string }>("/wechat/wallet/send/red-packet", accessToken, {
    method: "POST",
    body: JSON.stringify({ conversationId, characterId, amount, greetings }),
  });
}

export function sendTransfer(
  accessToken: string,
  conversationId: string,
  characterId: string,
  amount: number,
  remark: string,
): Promise<{ messageId: string }> {
  return request<{ messageId: string }>("/wechat/wallet/send/transfer", accessToken, {
    method: "POST",
    body: JSON.stringify({ conversationId, characterId, amount, remark }),
  });
}
