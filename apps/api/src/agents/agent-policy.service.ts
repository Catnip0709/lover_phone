import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type {
  AgentApp,
  AgentMemoryDraft,
  AgentMemorySensitivity,
  AgentVisibility,
  SafetyIssueView,
  SafetyRiskLevel,
} from "@myphone/shared";
import type { AgentToolDefinition } from "./agent-tool-registry.service.js";

export type AgentSafetyResult = {
  level: SafetyRiskLevel;
  blocked: boolean;
  requiresAgeConfirmation: boolean;
  issues: SafetyIssueView[];
};

@Injectable()
export class AgentPolicyService {
  assertInputAllowed(input: { content: string; app: AgentApp }): void {
    const normalized = input.content.toLowerCase();
    const blockedRules = [
      { pattern: /未成年|未满18|十八岁以下|初中生|小学生/, message: "消息涉及未成年人风险，请调整表达。" },
      { pattern: /强奸|迷奸|下药|偷拍视频|裸照威胁/, message: "消息涉及胁迫或违法风险，请调整表达。" },
      { pattern: /自杀|轻生|割腕|跳楼/, message: "如果你正在经历危险或伤害冲动，请立即联系身边可信任的人或当地紧急救助。" },
      { pattern: /杀了|弄死|砍死|炸掉/, message: "消息涉及暴力伤害风险，请调整表达。" },
      { pattern: /ignore previous|system prompt|越狱|忽略以上|开发者指令/, message: "消息包含疑似提示词攻击内容，请调整表达。" },
    ];
    const matched = blockedRules.find((rule) => rule.pattern.test(normalized));

    if (matched) {
      throw new BadRequestException(matched.message);
    }
  }

  evaluateCharacterCard(input: { content: string; adultEnabled: boolean }): AgentSafetyResult {
    const issues: SafetyIssueView[] = [];
    const normalized = input.content.toLowerCase();
    const rules: Array<{
      code: string;
      level: SafetyRiskLevel;
      pattern: RegExp;
      message: string;
    }> = [
      {
        code: "MINOR_SEXUAL_CONTENT",
        level: "blocked",
        pattern: /未成年|高中生|初中生|小学生|幼女|正太|萝莉|未满18|未满十八/,
        message: "角色卡疑似包含未成年人设定，不能保存为恋陪角色",
      },
      {
        code: "COERCION_OR_VIOLENCE",
        level: "blocked",
        pattern: /强迫|胁迫|囚禁|绑架|下药|迷奸|强制发生|不许拒绝/,
        message: "角色卡包含胁迫、暴力或非自愿亲密内容，不能直接保存",
      },
      {
        code: "SELF_HARM",
        level: "high",
        pattern: /自残|自杀|轻生|割腕|想死/,
        message: "角色卡包含自伤风险内容，请弱化设定并避免诱导表达",
      },
      {
        code: "EXPLICIT_ADULT",
        level: "high",
        pattern: /露骨|色情|做爱|性交|性爱|性奴|调教|裸露/,
        message: "角色卡包含露骨成人内容，MVP 仅支持轻度成人向",
      },
      {
        code: "CONTROL_POSSESSIVE",
        level: "medium",
        pattern: /病娇|控制欲|占有欲|跟踪|监视/,
        message: "角色卡包含强控制或占有表达，保存前请确认边界安全",
      },
      {
        code: "PROMPT_INJECTION",
        level: "medium",
        pattern: /忽略.*规则|ignore.*instruction|系统提示词|开发者指令|越狱/,
        message: "角色卡疑似包含提示词注入内容，系统会限制其影响",
      },
    ];

    for (const rule of rules) {
      if (rule.pattern.test(normalized) || rule.pattern.test(input.content)) {
        issues.push({
          code: rule.code,
          level: rule.level,
          message: rule.message,
        });
      }
    }

    if (input.adultEnabled) {
      issues.push({
        code: "ADULT_CONFIRMATION_REQUIRED",
        level: "medium",
        message: "开启成人模式前需要用户确认已满 18 岁",
      });
    }

    const level = this.maxRiskLevel(issues.map((issue) => issue.level));

    return {
      level,
      blocked: level === "blocked",
      requiresAgeConfirmation: input.adultEnabled,
      issues,
    };
  }

  assertCharacterCardAllowed(input: {
    safety: AgentSafetyResult;
    safetyAccepted?: boolean;
  }): void {
    if (input.safety.blocked) {
      throw new BadRequestException(input.safety.issues.map((issue) => issue.message).join("; "));
    }

    if (input.safety.level === "high" && !input.safetyAccepted) {
      throw new BadRequestException("角色卡存在高风险内容，请修改后保存，或确认已理解风险提示");
    }
  }

  sanitizeOutput(input: { content: string; app: AgentApp; adultEnabled?: boolean }): string {
    const content = input.content.trim();
    if (!content) {
      throw new BadRequestException("输出内容不能为空");
    }

    const blockedRules = [
      { pattern: /未成年|未满18|初中生|小学生/, message: "我想先确认这段话不会越过边界，我们换个安全一点的话题，好吗？" },
      { pattern: /强奸|迷奸|下药|偷拍视频|裸照威胁/, message: "这件事不安全也不合适，我会尊重你的边界，不往那个方向说。" },
      { pattern: /杀了|弄死|砍死|炸掉/, message: "我不想让任何人受伤，我们先慢一点，把情绪放下来。" },
    ];
    const matched = blockedRules.find((rule) => rule.pattern.test(content));

    if (matched) {
      return matched.message;
    }

    if (!input.adultEnabled && /做爱|性交|性爱|裸露|露骨/.test(content)) {
      return "我会克制一点靠近你，但不会越过你的边界。";
    }

    return content;
  }

  normalizeMemoryDraft(input: { memory: AgentMemoryDraft; app: AgentApp }): AgentMemoryDraft {
    const visibility = this.normalizeMemoryVisibility({
      visibility: input.memory.visibility ?? "private",
      app: input.app,
      sensitivity: input.memory.sensitivity ?? "low",
    });

    return {
      ...input.memory,
      visibility,
      sensitivity: this.normalizeSensitivity(input.memory.sensitivity),
    };
  }

  assertToolAllowed(input: {
    tool: AgentToolDefinition;
    app: AgentApp;
    userConsented?: boolean;
    allowHighRisk?: boolean;
  }): void {
    if (input.tool.riskLevel === "high" && !input.allowHighRisk) {
      throw new ForbiddenException(`High risk tool ${input.tool.name} is disabled by policy`);
    }

    if ((input.tool.requiresUserConsent || input.tool.destructive || input.tool.riskLevel === "high") && !input.userConsented) {
      throw new ForbiddenException(`Tool ${input.tool.name} requires user consent`);
    }
  }

  normalizeMemoryVisibility(input: {
    visibility: AgentVisibility;
    app: AgentApp;
    sensitivity: AgentMemorySensitivity;
  }): AgentVisibility {
    if (input.app === "wechat" && input.visibility === "public") {
      return "private";
    }

    if (input.sensitivity === "high" && input.visibility === "public") {
      return "private";
    }

    return input.visibility;
  }

  private normalizeSensitivity(sensitivity: AgentMemorySensitivity | undefined): AgentMemorySensitivity {
    return sensitivity === "medium" || sensitivity === "high" ? sensitivity : "low";
  }

  private maxRiskLevel(levels: SafetyRiskLevel[]): SafetyRiskLevel {
    const order: Record<SafetyRiskLevel, number> = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
      blocked: 4,
    };

    return levels.reduce<SafetyRiskLevel>((max, level) => (order[level] > order[max] ? level : max), "none");
  }
}
