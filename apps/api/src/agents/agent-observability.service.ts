import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AgentAction,
  AgentEventSource,
  AgentEventView,
  AgentMemoryScope,
  AgentMemorySensitivity,
  AgentMemoryView,
  AgentReplayPayload,
  AgentRunStatus,
  AgentRunView,
  AgentTaskType,
  AgentToolCallView,
  AgentToolProvider,
  AgentToolRiskLevel,
  AgentTraceTimelineItem,
  AgentTraceView,
  AgentVisibility,
  ModelProvider,
} from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../infra/prisma.service.js";

@Injectable()
export class AgentObservabilityService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getRunTrace(userId: string, runId: string): Promise<AgentTraceView> {
    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, userId },
    });

    if (!run) {
      throw new NotFoundException("AgentRun 不存在或无权访问");
    }

    return this.buildTrace(userId, run.id, run.traceId);
  }

  async getTrace(userId: string, traceId: string): Promise<AgentTraceView> {
    const run = await this.prisma.agentRun.findFirst({
      where: { traceId, userId },
      orderBy: { createdAt: "desc" },
    });

    if (!run) {
      throw new NotFoundException("Trace 不存在或无权访问");
    }

    return this.buildTrace(userId, run.id, traceId);
  }

  async getReplayPayload(userId: string, runId: string): Promise<AgentReplayPayload> {
    const trace = await this.getRunTrace(userId, runId);
    return trace.replay;
  }

  private async buildTrace(userId: string, runId: string, traceId: string): Promise<AgentTraceView> {
    const [run, events, toolCalls, aiRequests] = await Promise.all([
      this.prisma.agentRun.findFirstOrThrow({
        where: { id: runId, userId },
      }),
      this.prisma.agentEvent.findMany({
        where: { traceId, userId },
        orderBy: { occurredAt: "asc" },
      }),
      this.prisma.agentToolCall.findMany({
        where: { agentRunId: runId, userId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.aiRequest.findMany({
        where: { agentRunId: runId, userId },
        include: {
          messages: {
            select: {
              id: true,
              sender: true,
              content: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const memoryHits = await this.findMemoryHits({
      userId,
      characterId: run.characterId,
      contextSnapshot: run.contextSnapshot,
      eventIds: events.map((event) => event.id),
    });
    const runView = this.toRunView(run);
    const eventViews = events.map((event) => this.toEventView(event));
    const toolCallViews = toolCalls.map((toolCall) => this.toToolCallView(toolCall));
    const memoryHitViews = memoryHits.map((memory) => this.toMemoryView(memory));
    const aiRequestViews = aiRequests.map((request) => ({
      id: request.id,
      provider: request.provider as ModelProvider,
      modelName: request.modelName,
      requestType: request.requestType,
      status: request.status,
      latencyMs: request.latencyMs,
      errorCode: request.errorCode,
      errorMessage: request.errorMessage,
      createdAt: request.createdAt.toISOString(),
      messages: request.messages.map((message) => ({
        id: message.id,
        sender: message.sender as "user" | "character" | "system",
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    }));
    const replay = this.toReplayPayload(runView);

    return {
      traceId,
      run: runView,
      events: eventViews,
      toolCalls: toolCallViews,
      memoryHits: memoryHitViews,
      aiRequests: aiRequestViews,
      timeline: this.buildTimeline({
        run: runView,
        events: eventViews,
        toolCalls: toolCallViews,
        aiRequests: aiRequestViews,
        memoryHits: memoryHitViews,
      }),
      explanation: this.explain({
        run: runView,
        events: eventViews,
        toolCalls: toolCallViews,
        memoryHits: memoryHitViews,
        aiRequests: aiRequestViews,
      }),
      replay,
    };
  }

  private async findMemoryHits(input: {
    userId: string;
    characterId: string | null;
    contextSnapshot: Prisma.JsonValue;
    eventIds: string[];
  }) {
    const context = this.asObject(input.contextSnapshot);
    const memory = this.asObject(context.memory);
    const ids = Array.isArray(memory.ids) ? memory.ids.filter((id): id is string => typeof id === "string") : [];

    if (!input.characterId) {
      return [];
    }

    return this.prisma.agentMemory.findMany({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        OR: [{ id: { in: ids.length > 0 ? ids : ["__none__"] } }, { sourceEventId: { in: input.eventIds } }],
      },
      orderBy: [{ weight: "desc" }, { updatedAt: "desc" }],
      take: 20,
    });
  }

  private buildTimeline(input: {
    run: AgentRunView;
    events: AgentEventView[];
    toolCalls: AgentToolCallView[];
    aiRequests: AgentTraceView["aiRequests"];
    memoryHits: AgentMemoryView[];
  }): AgentTraceTimelineItem[] {
    const items: AgentTraceTimelineItem[] = [
      {
        id: input.run.id,
        kind: "run",
        label: `AgentRun ${input.run.taskType}`,
        status: input.run.status,
        occurredAt: input.run.createdAt,
        summary: input.run.inputSummary,
      },
      ...input.events.map((event) => ({
        id: event.id,
        kind: "event" as const,
        label: `${event.app}.${event.type}`,
        status: null,
        occurredAt: event.occurredAt,
        summary: event.content,
      })),
      ...input.toolCalls.map((toolCall) => ({
        id: toolCall.id,
        kind: "tool_call" as const,
        label: toolCall.toolName,
        status: toolCall.status,
        occurredAt: toolCall.createdAt,
        summary: toolCall.errorMessage,
      })),
      ...input.aiRequests.map((request) => ({
        id: request.id,
        kind: "ai_request" as const,
        label: `${request.provider}.${request.modelName}`,
        status: request.status,
        occurredAt: request.createdAt,
        summary: request.errorMessage,
      })),
      ...input.memoryHits.map((memory) => ({
        id: memory.id,
        kind: "memory" as const,
        label: `${memory.type} / ${memory.sourceApp}`,
        status: memory.enabled ? "enabled" : "disabled",
        occurredAt: memory.updatedAt,
        summary: memory.content,
      })),
    ];

    return items.sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  }

  private explain(input: {
    run: AgentRunView;
    events: AgentEventView[];
    toolCalls: AgentToolCallView[];
    memoryHits: AgentMemoryView[];
    aiRequests: AgentTraceView["aiRequests"];
  }): AgentTraceView["explanation"] {
    const whyThisReply = [
      `任务来自 ${input.run.app}.${input.run.eventType}，执行类型是 ${input.run.taskType}。`,
      input.run.promptName
        ? `回复使用 prompt ${input.run.promptName}@${input.run.promptVersion ?? "unknown"}。`
        : "本次运行没有记录 prompt，可能发生在 Prompt System 接入前或模型调用前失败。",
      input.run.modelProvider && input.run.modelName
        ? `模型使用 ${input.run.modelProvider}/${input.run.modelName}。`
        : "本次运行没有成功记录模型信息。",
      input.memoryHits.length > 0
        ? `上下文命中 ${input.memoryHits.length} 条长期记忆，最高权重记忆是「${input.memoryHits[0]?.content ?? ""}」。`
        : "上下文没有命中 V2 长期记忆。",
      input.toolCalls.length > 0
        ? `执行了 ${input.toolCalls.length} 次工具调用：${input.toolCalls.map((tool) => `${tool.toolName}:${tool.status}`).join(", ")}。`
        : "本次回复没有调用工具。",
      input.run.actions && input.run.actions.length > 0
        ? `最终产生 ${input.run.actions.length} 个 AgentAction。`
        : "本次运行没有记录 AgentAction。",
    ];
    const failureHints: string[] = [];

    if (input.run.status === "failed") {
      failureHints.push(`AgentRun 失败：${input.run.errorCode ?? "UNKNOWN"} ${input.run.errorMessage ?? ""}`.trim());
    }

    for (const request of input.aiRequests) {
      if (request.status === "failed") {
        failureHints.push(`模型请求失败：${request.errorCode ?? "UNKNOWN"} ${request.errorMessage ?? ""}`.trim());
      }
    }

    for (const toolCall of input.toolCalls) {
      if (toolCall.status === "failed") {
        failureHints.push(`工具调用失败：${toolCall.toolName} ${toolCall.errorCode ?? "UNKNOWN"} ${toolCall.errorMessage ?? ""}`.trim());
      }
    }

    if (!input.run.contextSnapshot) {
      failureHints.push("AgentRun 缺少 contextSnapshot，问题可能发生在 Context System 之前。");
    }

    if (!input.run.promptName) {
      failureHints.push("AgentRun 缺少 promptName，问题可能发生在 Prompt System 之前。");
    }

    return {
      whyThisReply,
      failureHints,
    };
  }

  private toReplayPayload(run: AgentRunView): AgentReplayPayload {
    return {
      runId: run.id,
      traceId: run.traceId,
      app: run.app,
      taskType: run.taskType,
      promptName: run.promptName,
      promptVersion: run.promptVersion,
      modelProvider: run.modelProvider,
      modelName: run.modelName,
      contextSnapshot: run.contextSnapshot,
      actions: run.actions,
      inputSummary: run.inputSummary,
      outputSummary: run.outputSummary,
    };
  }

  private toRunView(run: {
    id: string;
    traceId: string;
    userId: string;
    characterId: string | null;
    app: string;
    eventType: string;
    taskType: string;
    status: string;
    modelProvider: ModelProvider | null;
    modelName: string | null;
    promptName: string | null;
    promptVersion: string | null;
    inputSummary: string | null;
    outputSummary: string | null;
    contextSnapshot: Prisma.JsonValue;
    actions: Prisma.JsonValue;
    latencyMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AgentRunView {
    const actions = Array.isArray(run.actions) ? (run.actions as unknown as AgentAction[]) : null;

    return {
      id: run.id,
      traceId: run.traceId,
      userId: run.userId,
      characterId: run.characterId,
      app: run.app,
      eventType: run.eventType,
      taskType: run.taskType as AgentTaskType,
      status: run.status as AgentRunStatus,
      modelProvider: run.modelProvider,
      modelName: run.modelName,
      promptName: run.promptName,
      promptVersion: run.promptVersion,
      inputSummary: run.inputSummary,
      outputSummary: run.outputSummary,
      contextSnapshot: this.asNullableObject(run.contextSnapshot),
      actions,
      latencyMs: run.latencyMs,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    };
  }

  private toEventView(event: {
    id: string;
    traceId: string;
    userId: string;
    characterId: string | null;
    app: string;
    type: string;
    visibility: string;
    source: string;
    content: string | null;
    payload: Prisma.JsonValue;
    idempotencyKey: string | null;
    occurredAt: Date;
    createdAt: Date;
  }): AgentEventView {
    return {
      id: event.id,
      traceId: event.traceId,
      userId: event.userId,
      characterId: event.characterId,
      app: event.app,
      type: event.type,
      visibility: event.visibility as AgentVisibility,
      source: event.source as AgentEventSource,
      content: event.content,
      payload: this.asObject(event.payload),
      idempotencyKey: event.idempotencyKey,
      occurredAt: event.occurredAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
    };
  }

  private toToolCallView(toolCall: {
    id: string;
    agentRunId: string;
    userId: string;
    characterId: string | null;
    toolName: string;
    provider: string;
    riskLevel: string;
    input: Prisma.JsonValue;
    output: Prisma.JsonValue | null;
    status: string;
    latencyMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
  }): AgentToolCallView {
    return {
      id: toolCall.id,
      agentRunId: toolCall.agentRunId,
      userId: toolCall.userId,
      characterId: toolCall.characterId,
      toolName: toolCall.toolName,
      provider: toolCall.provider as AgentToolProvider,
      riskLevel: toolCall.riskLevel as AgentToolRiskLevel,
      input: this.asObject(toolCall.input),
      output: this.asNullableObject(toolCall.output),
      status: toolCall.status as AgentRunStatus,
      latencyMs: toolCall.latencyMs,
      errorCode: toolCall.errorCode,
      errorMessage: toolCall.errorMessage,
      createdAt: toolCall.createdAt.toISOString(),
    };
  }

  private toMemoryView(memory: {
    id: string;
    userId: string;
    characterId: string;
    scope: string;
    type: string;
    content: string;
    structured: Prisma.JsonValue;
    sourceApp: string;
    sourceEventId: string | null;
    confidence: number;
    weight: number;
    sensitivity: string;
    visibility: string;
    enabled: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AgentMemoryView {
    return {
      id: memory.id,
      userId: memory.userId,
      characterId: memory.characterId,
      scope: memory.scope as AgentMemoryScope,
      type: memory.type,
      content: memory.content,
      structured: this.asObject(memory.structured),
      sourceApp: memory.sourceApp,
      sourceEventId: memory.sourceEventId,
      confidence: memory.confidence,
      weight: memory.weight,
      sensitivity: memory.sensitivity as AgentMemorySensitivity,
      visibility: memory.visibility as AgentVisibility,
      enabled: memory.enabled,
      lastUsedAt: memory.lastUsedAt?.toISOString() ?? null,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
    };
  }

  private asObject(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private asNullableObject(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }

    return this.asObject(value);
  }
}
