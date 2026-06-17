import type { AgeConfirmResponse, MeProfileView, PatchMeProfileRequest } from "@myphone/shared";

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

export function confirmAdult(accessToken: string): Promise<AgeConfirmResponse> {
  return request<AgeConfirmResponse>("/users/age-confirm", accessToken, {
    method: "POST",
  });
}

export function getMeProfile(accessToken: string): Promise<MeProfileView> {
  return request<MeProfileView>("/me/profile", accessToken);
}

export function patchMeProfile(
  accessToken: string,
  body: PatchMeProfileRequest,
): Promise<MeProfileView> {
  return request<MeProfileView>("/me/profile", accessToken, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function uploadAvatar(accessToken: string, dataUrl: string): Promise<{ url: string }> {
  return request<{ url: string }>("/uploads/avatar", accessToken, {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
}

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${apiOrigin}${url}`;
  }
  return url;
}
