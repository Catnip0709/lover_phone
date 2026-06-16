import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AgentApp, AgentTaskType, AgentToolProvider, AgentToolRiskLevel } from "@myphone/shared";

export type AgentToolDefinition = {
  name: string;
  description: string;
  provider: AgentToolProvider;
  riskLevel: AgentToolRiskLevel;
  readOnly: boolean;
  destructive: boolean;
  requiresUserConsent: boolean;
  timeoutMs: number;
  allowedApps: AgentApp[];
  allowedTasks: AgentTaskType[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  transport?: {
    type: "stdio" | "http";
    command?: string;
    url?: string;
  };
};

@Injectable()
export class AgentToolRegistryService {
  private readonly tools = new Map<string, AgentToolDefinition>();

  constructor() {
    this.register({
      name: "sendWechatMessage",
      description: "Write a character message into an internal WeChat conversation.",
      provider: "internal",
      riskLevel: "low",
      readOnly: false,
      destructive: false,
      requiresUserConsent: false,
      timeoutMs: 5_000,
      allowedApps: ["wechat"],
      allowedTasks: ["chat.reply"],
    });
    this.register({
      name: "writeMemory",
      description: "Create or merge a character-private agent memory.",
      provider: "internal",
      riskLevel: "low",
      readOnly: false,
      destructive: false,
      requiresUserConsent: false,
      timeoutMs: 5_000,
      allowedApps: ["wechat", "contacts", "system"],
      allowedTasks: ["chat.reply", "memory.extract", "memory.merge"],
    });
    this.register({
      name: "updateRelationship",
      description: "Update relationship score and stage for one character.",
      provider: "internal",
      riskLevel: "medium",
      readOnly: false,
      destructive: false,
      requiresUserConsent: false,
      timeoutMs: 5_000,
      allowedApps: ["wechat", "contacts", "system"],
      allowedTasks: ["chat.reply", "relationship.advance"],
    });
    this.register({
      name: "mock.weather.get_current",
      description: "Mock MCP weather lookup for validating MCP client plumbing.",
      provider: "mcp",
      riskLevel: "low",
      readOnly: true,
      destructive: false,
      requiresUserConsent: false,
      timeoutMs: 3_000,
      allowedApps: ["wechat", "system"],
      allowedTasks: ["chat.reply", "tool.plan"],
      inputSchema: {
        type: "object",
        required: ["city"],
        properties: {
          city: { type: "string" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
          forceError: { type: "boolean" },
        },
      },
      outputSchema: {
        type: "object",
        required: ["city", "condition", "temperature"],
        properties: {
          city: { type: "string" },
          condition: { type: "string" },
          temperature: { type: "number" },
          unit: { type: "string" },
        },
      },
      transport: {
        type: "stdio",
        command: "mock-mcp-server",
      },
    });
    this.register({
      name: "mock.shopping.create_order",
      description: "High-risk mock MCP purchase tool for validating consent policy.",
      provider: "mcp",
      riskLevel: "high",
      readOnly: false,
      destructive: false,
      requiresUserConsent: true,
      timeoutMs: 3_000,
      allowedApps: ["wechat", "system"],
      allowedTasks: ["tool.plan"],
      inputSchema: {
        type: "object",
        required: ["itemName"],
        properties: {
          itemName: { type: "string" },
          amount: { type: "number" },
        },
      },
      outputSchema: {
        type: "object",
        required: ["orderId", "status"],
        properties: {
          orderId: { type: "string" },
          status: { type: "string" },
        },
      },
      transport: {
        type: "stdio",
        command: "mock-mcp-server",
      },
    });
  }

  list(): AgentToolDefinition[] {
    return Array.from(this.tools.values());
  }

  get(name: string): AgentToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new NotFoundException(`Agent tool not registered: ${name}`);
    }

    return tool;
  }

  assertCallable(input: {
    toolName: string;
    app: AgentApp;
    taskType: AgentTaskType;
    userConsented?: boolean;
    allowHighRisk?: boolean;
  }): AgentToolDefinition {
    const tool = this.get(input.toolName);

    if (!tool.allowedApps.includes(input.app)) {
      throw new ForbiddenException(`Tool ${tool.name} is not allowed in app ${input.app}`);
    }

    if (!tool.allowedTasks.includes(input.taskType)) {
      throw new ForbiddenException(`Tool ${tool.name} is not allowed for task ${input.taskType}`);
    }

    if (tool.riskLevel === "high" && !input.allowHighRisk) {
      throw new ForbiddenException(`High risk tool ${tool.name} is disabled by default`);
    }

    if ((tool.requiresUserConsent || tool.destructive) && !input.userConsented) {
      throw new ForbiddenException(`Tool ${tool.name} requires user consent`);
    }

    return tool;
  }

  private register(tool: AgentToolDefinition): void {
    this.tools.set(tool.name, tool);
  }
}
