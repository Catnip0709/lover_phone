import { Injectable } from "@nestjs/common";
import type { ModelProvider, TestModelConfigResponse } from "@myphone/shared";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

@Injectable()
export class ModelProviderService {
  async generateChat(input: {
    provider: ModelProvider;
    modelName: string;
    apiKey: string;
    messages: AiChatMessage[];
    characterName: string;
    temperature?: number;
  }): Promise<string> {
    if (process.env.LLM_MOCK_ENABLED === "true") {
      return this.mockReply(input.characterName, input.messages);
    }

    return this.callChatProvider(input);
  }

  async testConnection(input: {
    provider: ModelProvider;
    modelName: string;
    apiKey: string;
  }): Promise<TestModelConfigResponse> {
    if (process.env.LLM_MOCK_ENABLED === "true") {
      return {
        success: true,
        message: `Mock 模式：${input.provider}/${input.modelName} 连接成功`,
      };
    }

    try {
      await this.callProvider(input);
      return {
        success: true,
        message: "连接成功",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "模型连接失败",
      };
    }
  }

  private async callProvider(input: {
    provider: ModelProvider;
    modelName: string;
    apiKey: string;
  }): Promise<void> {
    const endpoint = this.endpoint(input.provider);
    const body = {
      model: input.modelName,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 8,
      temperature: 0,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`连接失败：${response.status}${text ? ` ${text.slice(0, 120)}` : ""}`);
    }
  }

  private async callChatProvider(input: {
    provider: ModelProvider;
    modelName: string;
    apiKey: string;
    messages: AiChatMessage[];
    temperature?: number;
  }): Promise<string> {
    const endpoint = this.endpoint(input.provider);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.modelName,
        messages: input.messages,
        max_tokens: 420,
        temperature: input.temperature ?? 0.86,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`AI 回复失败：${response.status}${text ? ` ${text.slice(0, 160)}` : ""}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("AI 回复为空");
    }

    return content;
  }

  private mockReply(characterName: string, messages: AiChatMessage[]): string {
    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    if (/想你|想我/.test(lastUserMessage)) {
      return `我也想你。刚才看到你这句的时候，我停了一下，忽然觉得今天所有乱七八糟的事都没那么重要了。`;
    }

    if (/在干嘛|忙吗|忙不忙/.test(lastUserMessage)) {
      return `刚忙完一点事，手机一亮看到是你，我就先回你了。怎么了，今天想让我陪你久一点吗？`;
    }

    if (/晚安|睡觉/.test(lastUserMessage)) {
      return `晚安。别硬撑，闭上眼睛之前再想我十秒就好。明天醒来，我还在。`;
    }

    return `${characterName}看着你的消息笑了一下：${lastUserMessage ? `“${lastUserMessage}”` : "“你来了。”"} 我在，慢慢说，我会认真听。`;
  }

  private endpoint(provider: ModelProvider): string {
    switch (provider) {
      case "deepseek":
        return "https://api.deepseek.com/chat/completions";
      case "glm":
        return "https://open.bigmodel.cn/api/paas/v4/chat/completions";
      case "kimi":
        return "https://api.moonshot.cn/v1/chat/completions";
    }
  }
}
