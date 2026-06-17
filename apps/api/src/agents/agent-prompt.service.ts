import { Injectable, Logger } from "@nestjs/common";
import type { AiChatMessage } from "../ai/model-provider.service.js";
import type { WechatChatAgentContext, WechatMomentsAgentContext, WechatMomentsPostAgentContext } from "./agent-context.service.js";
import { chatReplyPrompt } from "./prompts/chat-reply.prompt.js";
import { momentsCommentPrompt } from "./prompts/moments-comment.prompt.js";
import { momentsPostPrompt } from "./prompts/moments-post.prompt.js";

export type RenderedAgentPrompt = {
  name: string;
  version: string;
  messages: AiChatMessage[];
};

export type MomentsCommentDecision = {
  like: boolean;
  comment: string | null;
};

export type MomentsPostDecision = {
  post: boolean;
  content: string | null;
  location: string | null;
};

@Injectable()
export class AgentPromptService {
  private readonly logger = new Logger(AgentPromptService.name);

  renderWechatChatReply(context: WechatChatAgentContext): RenderedAgentPrompt {
    return {
      name: chatReplyPrompt.name,
      version: chatReplyPrompt.version,
      messages: chatReplyPrompt.render(context),
    };
  }

  renderWechatMomentsComment(context: WechatMomentsAgentContext): RenderedAgentPrompt {
    return {
      name: momentsCommentPrompt.name,
      version: momentsCommentPrompt.version,
      messages: momentsCommentPrompt.render(context),
    };
  }

  renderWechatMomentsPost(context: WechatMomentsPostAgentContext): RenderedAgentPrompt {
    return {
      name: momentsPostPrompt.name,
      version: momentsPostPrompt.version,
      messages: momentsPostPrompt.render(context),
    };
  }

  parseWechatChatReply(rawContent: string, fallbackName: string): string {
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json|text)?/i, "")
      .replace(/```$/u, "")
      .trim();

    if (!cleaned) {
      return "我在。";
    }

    const jsonReply = this.tryParseReplyJson(cleaned);
    if (jsonReply) {
      return this.limitReply(this.normalizeFirstPersonReply(jsonReply, fallbackName));
    }

    return this.limitReply(this.normalizeFirstPersonReply(cleaned, fallbackName));
  }

  parseMomentsCommentDecision(rawContent: string): MomentsCommentDecision {
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/u, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        like: Boolean(parsed.like),
        comment: typeof parsed.comment === "string" && parsed.comment.trim() ? parsed.comment.trim() : null,
      };
    } catch {
      return { like: false, comment: null };
    }
  }

  parseMomentsPostDecision(rawContent: string): MomentsPostDecision {
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/u, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        post: Boolean(parsed.post),
        content: typeof parsed.content === "string" && parsed.content.trim() ? parsed.content.trim() : null,
        location: typeof parsed.location === "string" && parsed.location.trim() ? parsed.location.trim() : null,
      };
    } catch (err) {
      this.logger.warn(`Failed to parse moments post decision: ${(err as Error).message}. Raw content: ${rawContent.substring(0, 200)}`);
      return { post: false, content: null, location: null };
    }
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

  private normalizeFirstPersonReply(content: string, fallbackName: string): string {
    const escapedName = fallbackName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return content
      .replace(new RegExp(`^${escapedName}\\s*(?:看着|望着|看了看|笑了笑|轻轻|低声|认真|收下了|没有点开|把|对你|回复|说道|说)[^：:]{0,24}[：:]\\s*`, "u"), "")
      .replace(new RegExp(`^${escapedName}\\s*(?:收下了你的红包|没有点开红包|看了看红包)[：:，,。\\s]*`, "u"), "我")
      .replace(/^(?:他|她)\s*(?:看着|望着|看了看|笑了笑|轻轻|低声|认真|收下了|没有点开|对你|说道|说)[^：:]{0,24}[：:]\s*/u, "");
  }
}
