import { Inject, Injectable } from "@nestjs/common";
import type { AgentAction, MemoryView, MessageView, ModelProvider, RelationshipProgressView } from "@myphone/shared";
import { ModelProviderService } from "../ai/model-provider.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { AgentContextService } from "./agent-context.service.js";
import { AgentHarnessService, type AgentHarnessRun } from "./agent-harness.service.js";
import { AgentPromptService, type MomentsCommentDecision, type MomentsPostDecision } from "./agent-prompt.service.js";
import { SentenceSplitter } from "./sentence-splitter.js";

export type WechatAgentRuntimeResult = {
  action: Extract<AgentAction, { type: "wechat.send_message" }>;
  aiRequestId: string;
  startedAt: number;
};

export type WechatAgentStreamInput = {
  userId: string;
  conversationId: string;
  characterId: string;
  agentRun: AgentHarnessRun | null;
  model: {
    provider: ModelProvider;
    modelName: string;
    apiKey: string;
  };
  character: {
    nickname: string;
    age: number;
    occupation: string | null;
    city: string | null;
    rawCharacterCard: string | null;
    relationshipStage: string;
    adultEnabled: boolean;
    structuredProfile: unknown;
  };
  recentMessages: Array<{ sender: MessageView["sender"]; content: string | null }>;
  currentUserMessage: string;
  memories: MemoryView[];
  relationship: RelationshipProgressView;
};

export type WechatAgentStreamResult = {
  aiRequestId: string;
  startedAt: number;
  fullText: string;
  sentenceCount: number;
};

export type WechatAgentStreamSentenceContext = {
  aiRequestId: string;
  startedAt: number;
};

@Injectable()
export class AgentRuntimeService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ModelProviderService)
    private readonly modelProvider: ModelProviderService,
    @Inject(AgentHarnessService)
    private readonly agentHarness: AgentHarnessService,
    @Inject(AgentContextService)
    private readonly agentContext: AgentContextService,
    @Inject(AgentPromptService)
    private readonly agentPrompt: AgentPromptService,
  ) {}

  async handleWechatUserMessage(input: {
    userId: string;
    conversationId: string;
    characterId: string;
    agentRun: AgentHarnessRun | null;
    model: {
      provider: ModelProvider;
      modelName: string;
      apiKey: string;
    };
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      city: string | null;
      rawCharacterCard: string | null;
      relationshipStage: string;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    recentMessages: Array<{ sender: MessageView["sender"]; content: string | null }>;
    currentUserMessage: string;
    memories: MemoryView[];
    relationship: RelationshipProgressView;
  }): Promise<WechatAgentRuntimeResult> {
    const startedAt = Date.now();
    const aiRequest = await this.prisma.aiRequest.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        conversationId: input.conversationId,
        provider: input.model.provider,
        modelName: input.model.modelName,
        requestType: "chat_reply",
        status: "pending",
        agentRunId: input.agentRun?.runId,
      },
    });

    try {
      const context = this.agentContext.buildWechatChatContext({
        conversationId: input.conversationId,
        character: input.character,
        recentMessages: input.recentMessages,
        currentUserMessage: input.currentUserMessage,
        memories: input.memories,
        relationship: input.relationship,
      });

      const prompt = this.agentPrompt.renderWechatChatReply(context);
      if (input.agentRun) {
        await this.prisma.agentRun
          .update({
            where: { id: input.agentRun.runId },
            data: {
              contextSnapshot: context.snapshot,
              promptName: prompt.name,
              promptVersion: prompt.version,
            },
          })
          .catch(() => undefined);
      }

      const rawAiContent = await this.modelProvider.generateChat({
        provider: input.model.provider,
        modelName: input.model.modelName,
        apiKey: input.model.apiKey,
        temperature: context.runtime.temperature,
        characterName: context.character.nickname,
        messages: prompt.messages,
      });
      const aiContent = this.agentPrompt.parseWechatChatReply(rawAiContent, context.character.nickname);

      return {
        aiRequestId: aiRequest.id,
        startedAt,
        action: {
          type: "wechat.send_message",
          conversationId: input.conversationId,
          content: aiContent,
          metadata: {
            aiRequestId: aiRequest.id,
            source: "agent_runtime",
          },
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.prisma.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: "failed",
          latencyMs,
          errorCode: "AI_REPLY_FAILED",
          errorMessage: error instanceof Error ? error.message : "AI 回复失败",
        },
      });

      if (input.agentRun) {
        await this.agentHarness
          .markRunFailed({
            runId: input.agentRun.runId,
            provider: input.model.provider,
            modelName: input.model.modelName,
            error,
            latencyMs,
          })
          .catch(() => undefined);
      }

      throw error;
    }
  }

  async handleWechatUserMessageStream(
    input: WechatAgentStreamInput,
    onSentence: (
      sentence: string,
      index: number,
      ctx: WechatAgentStreamSentenceContext,
    ) => Promise<void>,
    options: { signal?: AbortSignal } = {},
  ): Promise<WechatAgentStreamResult> {
    const startedAt = Date.now();
    const aiRequest = await this.prisma.aiRequest.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        conversationId: input.conversationId,
        provider: input.model.provider,
        modelName: input.model.modelName,
        requestType: "chat_reply",
        status: "pending",
        agentRunId: input.agentRun?.runId,
      },
    });

    const ctx: WechatAgentStreamSentenceContext = {
      aiRequestId: aiRequest.id,
      startedAt,
    };

    try {
      const context = this.agentContext.buildWechatChatContext({
        conversationId: input.conversationId,
        character: input.character,
        recentMessages: input.recentMessages,
        currentUserMessage: input.currentUserMessage,
        memories: input.memories,
        relationship: input.relationship,
      });

      const prompt = this.agentPrompt.renderWechatChatReply(context);
      if (input.agentRun) {
        await this.prisma.agentRun
          .update({
            where: { id: input.agentRun.runId },
            data: {
              contextSnapshot: context.snapshot,
              promptName: prompt.name,
              promptVersion: prompt.version,
            },
          })
          .catch(() => undefined);
      }

      const splitter = new SentenceSplitter({ maxSentences: 5, maxTotalChars: 400, softLimit: 80 });
      let rawText = "";
      let sentenceIndex = 0;
      let lastChunkAt = Date.now();

      for await (const chunk of this.modelProvider.generateChatStream(
        {
          provider: input.model.provider,
          modelName: input.model.modelName,
          apiKey: input.model.apiKey,
          temperature: context.runtime.temperature,
          characterName: context.character.nickname,
          messages: prompt.messages,
        },
        { signal: options.signal },
      )) {
        if (options.signal?.aborted) {
          throw new Error("AI 回复已取消");
        }
        if (Date.now() - lastChunkAt > 8_000) {
          throw new Error("AI 回复超时");
        }
        lastChunkAt = Date.now();
        rawText += chunk;
        const sentences = splitter.push(chunk);
        for (const sentence of sentences) {
          const cleaned = this.agentPrompt
            .parseWechatChatReply(sentence, context.character.nickname)
            .trim();
          if (!cleaned) continue;
          await onSentence(cleaned, sentenceIndex, ctx);
          sentenceIndex += 1;
        }
        if (splitter.done) break;
      }

      const tail = splitter.flush();
      for (const sentence of tail) {
        const cleaned = this.agentPrompt
          .parseWechatChatReply(sentence, context.character.nickname)
          .trim();
        if (!cleaned) continue;
        await onSentence(cleaned, sentenceIndex, ctx);
        sentenceIndex += 1;
      }

      if (sentenceIndex === 0) {
        const fallback = this.agentPrompt.parseWechatChatReply(rawText || "我在。", context.character.nickname);
        await onSentence(fallback || "我在。", 0, ctx);
        sentenceIndex = 1;
      }

      return {
        aiRequestId: aiRequest.id,
        startedAt,
        fullText: rawText,
        sentenceCount: sentenceIndex,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.prisma.aiRequest
        .update({
          where: { id: aiRequest.id },
          data: {
            status: "failed",
            latencyMs,
            errorCode: "AI_REPLY_STREAM_FAILED",
            errorMessage: error instanceof Error ? error.message : "AI 流式回复失败",
          },
        })
        .catch(() => undefined);

      if (input.agentRun) {
        await this.agentHarness
          .markRunFailed({
            runId: input.agentRun.runId,
            provider: input.model.provider,
            modelName: input.model.modelName,
            error,
            latencyMs,
          })
          .catch(() => undefined);
      }

      throw error;
    }
  }

  async handleWechatMomentInteraction(input: {
    userId: string;
    characterId: string;
    model: {
      provider: ModelProvider;
      modelName: string;
      apiKey: string;
    };
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      rawCharacterCard: string | null;
      relationshipStage: string;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    memories: MemoryView[];
    relationship: RelationshipProgressView;
    momentContent: string;
    momentLocation: string | null;
    momentImageCount: number;
  }): Promise<{ decision: MomentsCommentDecision; aiRequestId: string; startedAt: number }> {
    const startedAt = Date.now();
    const aiRequest = await this.prisma.aiRequest.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        provider: input.model.provider,
        modelName: input.model.modelName,
        requestType: "moments_comment_decision",
        status: "pending",
      },
    });

    try {
      const context = this.agentContext.buildWechatMomentsContext({
        character: input.character,
        memories: input.memories,
        relationship: input.relationship,
        momentContent: input.momentContent,
        momentLocation: input.momentLocation,
        momentImageCount: input.momentImageCount,
      });

      const prompt = this.agentPrompt.renderWechatMomentsComment(context);

      const rawAiContent = await this.modelProvider.generateChat({
        provider: input.model.provider,
        modelName: input.model.modelName,
        apiKey: input.model.apiKey,
        temperature: context.runtime.temperature,
        characterName: context.character.nickname,
        messages: prompt.messages,
      });

      const decision = this.agentPrompt.parseMomentsCommentDecision(rawAiContent);

      return { decision, aiRequestId: aiRequest.id, startedAt };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.prisma.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: "failed",
          latencyMs,
          errorCode: "MOMENTS_INTERACTION_FAILED",
          errorMessage: error instanceof Error ? error.message : "朋友圈互动决策失败",
        },
      });

      throw error;
    }
  }

  async handleWechatMomentPost(input: {
    userId: string;
    characterId: string;
    model: {
      provider: ModelProvider;
      modelName: string;
      apiKey: string;
    };
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      rawCharacterCard: string | null;
      relationshipStage: string;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    memories: MemoryView[];
    relationship: RelationshipProgressView;
  }): Promise<{ decision: MomentsPostDecision; aiRequestId: string; startedAt: number }> {
    const startedAt = Date.now();
    const aiRequest = await this.prisma.aiRequest.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        provider: input.model.provider,
        modelName: input.model.modelName,
        requestType: "moments_post_decision",
        status: "pending",
      },
    });

    try {
      const context = this.agentContext.buildWechatMomentsPostContext({
        character: input.character,
        memories: input.memories,
        relationship: input.relationship,
      });

      const prompt = this.agentPrompt.renderWechatMomentsPost(context);

      const rawAiContent = await this.modelProvider.generateChat({
        provider: input.model.provider,
        modelName: input.model.modelName,
        apiKey: input.model.apiKey,
        temperature: context.runtime.temperature,
        characterName: context.character.nickname,
        messages: prompt.messages,
      });

      const decision = this.agentPrompt.parseMomentsPostDecision(rawAiContent);

      return { decision, aiRequestId: aiRequest.id, startedAt };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.prisma.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: "failed",
          latencyMs,
          errorCode: "MOMENTS_POST_FAILED",
          errorMessage: error instanceof Error ? error.message : "朋友圈发布决策失败",
        },
      });

      throw error;
    }
  }
}
