import { Injectable } from "@nestjs/common";
import type { ModelProvider, TestModelConfigResponse } from "@myphone/shared";
import { parseOpenAiSseStream } from "./sse-parser.js";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateChatStreamInput = {
  provider: ModelProvider;
  modelName: string;
  apiKey: string;
  messages: AiChatMessage[];
  characterName: string;
  temperature?: number;
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

  async *generateChatStream(
    input: GenerateChatStreamInput,
    options: { signal?: AbortSignal } = {},
  ): AsyncIterable<string> {
    if (process.env.LLM_MOCK_ENABLED === "true") {
      yield* this.mockStreamReply(input.characterName, input.messages, options.signal);
      return;
    }

    yield* this.callChatProviderStream(input, options.signal);
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

  private async *callChatProviderStream(
    input: GenerateChatStreamInput,
    externalSignal?: AbortSignal,
  ): AsyncIterable<string> {
    const endpoint = this.endpoint(input.provider);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("AI 回复超时")), 30_000);
    const onExternalAbort = () => controller.abort(externalSignal?.reason);
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort(externalSignal.reason);
      } else {
        externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.apiKey}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: input.modelName,
          messages: input.messages,
          max_tokens: 420,
          temperature: input.temperature ?? 0.86,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`AI 回复失败：${response.status}${text ? ` ${text.slice(0, 160)}` : ""}`);
      }

      if (!response.body) {
        throw new Error("AI 回复流为空");
      }

      let yielded = false;
      for await (const chunk of parseOpenAiSseStream(response.body)) {
        yielded = true;
        yield chunk;
      }

      if (!yielded) {
        throw new Error("AI 回复为空");
      }
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  private async *mockStreamReply(
    characterName: string,
    messages: AiChatMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const full = this.mockReply(characterName, messages);
    const segments = full.match(/[^。！？!?\n]+[。！？!?]?/g) ?? [full];
    for (const segment of segments) {
      const piece = segment.trim();
      if (!piece) continue;
      const tokens = piece.match(/.{1,4}/g) ?? [piece];
      for (const token of tokens) {
        if (signal?.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, 35));
        yield token;
      }
    }
  }

  private mockReply(_characterName: string, messages: AiChatMessage[]): string {
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

    return lastUserMessage
      ? `我看到你说“${lastUserMessage}”了。先别急，我在，慢慢说，我会认真听。`
      : "我在。你来了，我就想先听你说。";
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
