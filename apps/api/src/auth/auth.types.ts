import type { AuthUser } from "@myphone/shared";

export type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthUser;
};
