import { Injectable } from "@nestjs/common";
import type { AiChatMessage } from "../ai/model-provider.service.js";
import type { WechatChatAgentContext } from "./agent-context.service.js";
import { chatReplyPrompt } from "./prompts/chat-reply.prompt.js";

export type RenderedAgentPrompt = {
  name: string;
  version: string;
  messages: AiChatMessage[];
};

@Injectable()
export class AgentPromptService {
  renderWechatChatReply(context: WechatChatAgentContext): RenderedAgentPrompt {
    return {
      name: chatReplyPrompt.name,
      version: chatReplyPrompt.version,
      messages: chatReplyPrompt.render(context),
    };
  }

  parseWechatChatReply(rawContent: string, fallbackName: string): string {
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json|text)?/i, "")
      .replace(/```$/u, "")
      .trim();

    if (!cleaned) {
      return `${fallbackName}轻轻回了一句：我在。`;
    }

    const jsonReply = this.tryParseReplyJson(cleaned);
    if (jsonReply) {
      return this.limitReply(jsonReply);
    }

    return this.limitReply(cleaned);
  }

  private tryParseReplyJson(content: string): string | null {
    if (!content.startsWith("{")) {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as { reply?: unknown; content?: unknown; message?: unknown };
      const value = parsed.reply ?? parsed.content ?? parsed.message;
      return typeof value === "string" && value.trim() ? value.trim() : null;
    } catch {
      return null;
    }
  }

  private limitReply(content: string): string {
    return content.length > 220 ? `${content.slice(0, 220)}...` : content;
  }
}
