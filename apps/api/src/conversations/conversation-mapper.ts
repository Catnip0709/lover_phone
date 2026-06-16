import type { ConversationView, MemoryView, MessageView } from "@myphone/shared";

export function toMessageView(message: {
  id: string;
  conversationId: string;
  characterId: string;
  sender: MessageView["sender"];
  type: MessageView["type"];
  content: string | null;
  payload: unknown;
  status: string;
  createdAt: Date;
}): MessageView {
  return {
    id: message.id,
    conversationId: message.conversationId,
    characterId: message.characterId,
    sender: message.sender,
    type: message.type,
    content: message.content,
    payload:
      typeof message.payload === "object" && message.payload !== null
        ? (message.payload as Record<string, unknown>)
        : {},
    status: message.status,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toConversationView(conversation: {
  id: string;
  pinned: boolean;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  character: {
    id: string;
    name: string;
    nickname: string;
    avatarPreset: string;
    structuredProfile: unknown;
  };
}): ConversationView {
  const structuredProfile =
    typeof conversation.character.structuredProfile === "object" && conversation.character.structuredProfile !== null
      ? (conversation.character.structuredProfile as Record<string, unknown>)
      : {};

  return {
    id: conversation.id,
    character: {
      ...conversation.character,
      structuredProfile,
    },
    pinned: conversation.pinned,
    unreadCount: conversation.unreadCount,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function toMemoryView(memory: {
  id: string;
  characterId: string;
  content: string;
  type: string;
  weight: number;
  enabled: boolean;
  sourceMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MemoryView {
  return {
    id: memory.id,
    characterId: memory.characterId,
    content: memory.content,
    type: memory.type,
    weight: memory.weight,
    enabled: memory.enabled,
    sourceMessageId: memory.sourceMessageId,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}
