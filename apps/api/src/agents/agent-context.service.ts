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

export type WechatMomentsAgentContext = {
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
    visibility: Extract<AgentVisibility, "public">;
  };
  memory: {
    items: MemoryView[];
    summaryText: string;
  };
  relationship: RelationshipProgressView;
  task: {
    type: "moments.comment";
    momentContent: string;
    momentLocation: string | null;
    momentImageCount: number;
    outputRequirement: string;
  };
  runtime: {
    temperature: number;
    contextBudget: {
      memoryLimit: number;
    };
  };
  snapshot: Prisma.InputJsonObject;
};

export type WechatMomentsPostAgentContext = {
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
    adultEnabled: boolean;
  };
  app: {
    app: "wechat";
    visibility: Extract<AgentVisibility, "public">;
  };
  memory: {
    items: MemoryView[];
    summaryText: string;
  };
  relationship: RelationshipProgressView;
  task: {
    type: "moments.post";
    outputRequirement: string;
  };
  runtime: {
    temperature: number;
    contextBudget: {
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

  buildWechatMomentsContext(input: {
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      rawCharacterCard: string | null;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    memories: MemoryView[];
    relationship: RelationshipProgressView;
    momentContent: string;
    momentLocation: string | null;
    momentImageCount: number;
  }): WechatMomentsAgentContext {
    const profile = this.normalizeProfile(input.character.structuredProfile);
    const storyBackground = typeof profile.storyBackground === "string" ? profile.storyBackground : null;
    const userAddressing = typeof profile.userAddressing === "string" ? profile.userAddressing : null;
    const memories = input.memories.slice(0, 6);
    const memoryText =
      memories.length > 0
        ? memories.map((memory) => `- [${memory.type}/权重${memory.weight}] ${memory.content}`).join("\n")
        : "- 暂无相关记忆";

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
        visibility: "public",
      },
      memory: {
        items: memories,
        summaryText: memoryText,
      },
      relationship: input.relationship,
      task: {
        type: "moments.comment",
        momentContent: input.momentContent,
        momentLocation: input.momentLocation,
        momentImageCount: input.momentImageCount,
        outputRequirement:
          "你正在决定是否给用户的这条朋友圈点赞或评论。朋友圈是半公开场景，你的评论会显示在公开动态下方。要求：1）判断是否点赞和/或评论；2）评论内容必须自然、符合人设、不泄露私聊信息；3）长度控制在50字以内；4）输出JSON格式：{\"like\": true/false, \"comment\": \"评论内容或null\"}",
      },
      runtime: {
        temperature: this.getModelTemperature(profile),
        contextBudget: {
          memoryLimit: 6,
        },
      },
      snapshot: {
        app: "wechat",
        visibility: "public",
        taskType: "moments.comment",
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
        runtime: {
          temperature: this.getModelTemperature(profile),
          contextBudget: {
            memoryLimit: 6,
          },
        },
      },
    };
  }

  buildWechatMomentsPostContext(input: {
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      rawCharacterCard: string | null;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    memories: MemoryView[];
    relationship: RelationshipProgressView;
  }): WechatMomentsPostAgentContext {
    const profile = this.normalizeProfile(input.character.structuredProfile);
    const storyBackground = typeof profile.storyBackground === "string" ? profile.storyBackground : null;
    const memories = input.memories.slice(0, 6);
    const memoryText =
      memories.length > 0
        ? memories.map((memory) => `- [${memory.type}/权重${memory.weight}] ${memory.content}`).join("\n")
        : "- 暂无相关记忆";

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
        adultEnabled: input.character.adultEnabled,
      },
      app: {
        app: "wechat",
        visibility: "public",
      },
      memory: {
        items: memories,
        summaryText: memoryText,
      },
      relationship: input.relationship,
      task: {
        type: "moments.post",
        outputRequirement:
          "你正在考虑是否发布一条朋友圈动态。要求：1）判断是否发布（可以选择不发）；2）如果发布，内容必须自然、符合人设、不提及自己是AI；3）可以包含心情、日常、想法等；4）输出JSON格式：{\"post\": true/false, \"content\": \"朋友圈内容或null\", \"location\": \"可选位置或null\"}",
      },
      runtime: {
        temperature: this.getModelTemperature(profile),
        contextBudget: {
          memoryLimit: 6,
        },
      },
      snapshot: {
        app: "wechat",
        visibility: "public",
        taskType: "moments.post",
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
        runtime: {
          temperature: this.getModelTemperature(profile),
          contextBudget: {
            memoryLimit: 6,
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
