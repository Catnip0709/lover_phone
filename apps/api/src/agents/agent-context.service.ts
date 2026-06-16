import { Injectable } from "@nestjs/common";
import type { AgentTaskType, AgentVisibility, MemoryView, MessageView, RelationshipProgressView } from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import type { AiChatMessage } from "../ai/model-provider.service.js";

export type WechatChatAgentContext = {
  system: {
    product: "myphone";
    safetyMode: "relationship_companion";
  };
  character: {
    nickname: string;
    age: number;
    occupation: string | null;
    rawCharacterCard: string | null;
    storyBackground: string | null;
    userAddressing: string | null;
    adultEnabled: boolean;
  };
  app: {
    app: "wechat";
    visibility: Extract<AgentVisibility, "private">;
    conversationId: string;
  };
  memory: {
    items: MemoryView[];
    summaryText: string;
  };
  recent: {
    messages: Array<{ sender: MessageView["sender"]; content: string | null }>;
    history: AiChatMessage[];
  };
  relationship: RelationshipProgressView;
  task: {
    type: Extract<AgentTaskType, "chat.reply">;
    currentUserMessage: string;
    outputRequirement: string;
  };
  runtime: {
    temperature: number;
    contextBudget: {
      recentMessageLimit: number;
      memoryLimit: number;
    };
  };
  snapshot: Prisma.InputJsonObject;
};

@Injectable()
export class AgentContextService {
  buildWechatChatContext(input: {
    conversationId: string;
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      rawCharacterCard: string | null;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    recentMessages: Array<{ sender: MessageView["sender"]; content: string | null }>;
    currentUserMessage: string;
    memories: MemoryView[];
    relationship: RelationshipProgressView;
  }): WechatChatAgentContext {
    const profile = this.normalizeProfile(input.character.structuredProfile);
    const storyBackground = typeof profile.storyBackground === "string" ? profile.storyBackground : null;
    const userAddressing = typeof profile.userAddressing === "string" ? profile.userAddressing : null;
    const recentMessages = input.recentMessages.slice(-12);
    const memories = input.memories.slice(0, 8);
    const memoryText =
      memories.length > 0
        ? memories.map((memory) => `- [${memory.type}/权重${memory.weight}] ${memory.content}`).join("\n")
        : "- 暂无长期记忆";
    const history: AiChatMessage[] = recentMessages
      .filter((message) => message.content)
      .map((message) => ({
        role: message.sender === "user" ? "user" : "assistant",
        content: message.content ?? "",
      }));

    return {
      system: {
        product: "myphone",
        safetyMode: "relationship_companion",
      },
      character: {
        nickname: input.character.nickname,
        age: input.character.age,
        occupation: input.character.occupation,
        rawCharacterCard: input.character.rawCharacterCard,
        storyBackground,
        userAddressing,
        adultEnabled: input.character.adultEnabled,
      },
      app: {
        app: "wechat",
        visibility: "private",
        conversationId: input.conversationId,
      },
      memory: {
        items: memories,
        summaryText: memoryText,
      },
      recent: {
        messages: recentMessages,
        history,
      },
      relationship: input.relationship,
      task: {
        type: "chat.reply",
        currentUserMessage: input.currentUserMessage,
        outputRequirement:
          "只输出男主会发给用户的一条微信消息；自然、亲密、有分寸；不要自称 AI；不要解释设定；长度控制在 120 字以内。",
      },
      runtime: {
        temperature: this.getModelTemperature(profile),
        contextBudget: {
          recentMessageLimit: 12,
          memoryLimit: 8,
        },
      },
      snapshot: {
        app: "wechat",
        visibility: "private",
        taskType: "chat.reply",
        character: {
          nickname: input.character.nickname,
          hasStoryBackground: Boolean(storyBackground),
          adultEnabled: input.character.adultEnabled,
        },
        relationship: input.relationship,
        memory: {
          count: memories.length,
          ids: memories.map((memory) => memory.id),
        },
        recent: {
          count: recentMessages.length,
        },
        runtime: {
          temperature: this.getModelTemperature(profile),
          contextBudget: {
            recentMessageLimit: 12,
            memoryLimit: 8,
          },
        },
      },
    };
  }

  private getModelTemperature(profile: Prisma.InputJsonObject): number {
    const temperature = profile.temperature;
    return typeof temperature === "number" && Number.isFinite(temperature)
      ? Math.max(0.5, Math.min(1.2, temperature))
      : 0.8;
  }

  private normalizeProfile(profile: unknown): Prisma.InputJsonObject {
    if (typeof profile === "object" && profile !== null && !Array.isArray(profile)) {
      return profile as Prisma.InputJsonObject;
    }

    return {};
  }
}
