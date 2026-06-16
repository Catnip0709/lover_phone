import { BadRequestException, Injectable } from "@nestjs/common";

export type McpTransportConfig =
  | {
      type: "stdio";
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }
  | {
      type: "http";
      url: string;
      headers?: Record<string, string>;
    };

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  transport: McpTransportConfig;
};

export type McpToolResult = {
  content: Array<{
    type: "json" | "text";
    value: Record<string, unknown> | string;
  }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

@Injectable()
export class MockMcpToolAdapterService {
  private readonly mockTransport: McpTransportConfig = {
    type: "stdio",
    command: "mock-mcp-server",
    args: ["--local", "--readonly"],
  };

  listTools(): McpToolDefinition[] {
    return [
      {
        name: "mock.weather.get_current",
        description: "Mock MCP weather lookup for validating MCP tool-call plumbing.",
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
            source: { type: "string" },
          },
        },
        transport: this.mockTransport,
      },
      {
        name: "mock.shopping.create_order",
        description: "High-risk mock purchase tool for validating MCP consent policy.",
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
        transport: this.mockTransport,
      },
    ];
  }

  async invoke(input: { toolName: string; input: Record<string, unknown>; timeoutMs: number }): Promise<McpToolResult> {
    if (input.toolName === "mock.shopping.create_order") {
      const itemName =
        typeof input.input.itemName === "string" && input.input.itemName.trim() ? input.input.itemName.trim() : "未知商品";
      const output = {
        orderId: `mock_order_${Date.now().toString(36)}`,
        status: "created",
        itemName,
        source: "mock_mcp",
      };

      return {
        content: [{ type: "json", value: output }],
        structuredContent: output,
        isError: false,
      };
    }

    if (input.toolName !== "mock.weather.get_current") {
      throw new BadRequestException(`Mock MCP tool not found: ${input.toolName}`);
    }

    if (input.input.forceError === true) {
      throw new BadRequestException("Mock MCP weather tool failed by request");
    }

    const city = typeof input.input.city === "string" && input.input.city.trim() ? input.input.city.trim() : "北京";
    const unit = input.input.unit === "fahrenheit" ? "fahrenheit" : "celsius";
    const temperature = unit === "fahrenheit" ? 73 : 23;
    const output = {
      city,
      condition: "晴",
      temperature,
      unit,
      source: "mock_mcp",
      transport: this.mockTransport.type,
      timeoutMs: input.timeoutMs,
    };

    return {
      content: [{ type: "json", value: output }],
      structuredContent: output,
      isError: false,
    };
  }
}
