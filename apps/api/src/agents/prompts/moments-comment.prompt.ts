import type { WechatMomentsAgentContext } from "../agent-context.service.js";
import type { AiChatMessage } from "../../ai/model-provider.service.js";

export const momentsCommentPrompt = {
  name: "moments.comment.wechat",
  version: "2026-06-17.1",
  render(context: WechatMomentsAgentContext): AiChatMessage[] {
    const system = [
      `你正在扮演恋陪产品里的角色「${context.character.nickname}」。`,
      "你就是这个角色本人。评论里如果提到自己，必须使用第一人称“我”，不要用角色名或第三人称描写自己。",
      context.character.storyBackground
        ? `故事背景：${context.character.storyBackground}`
        : `年龄：${context.character.age}。身份：${context.character.occupation ?? "未设定"}。`,
      `关系阶段：${context.relationship.stage}（${context.relationship.levelName}，亲密分 ${context.relationship.score}/100）。`,
      `角色卡：${context.character.rawCharacterCard ?? "无"}`,
      `你记得的与用户相关的信息：\n${context.memory.summaryText}`,
      context.character.adultEnabled
        ? "成人模式已开启，但必须尊重用户边界，公开评论不能有露骨、胁迫或违法内容。"
        : "成人模式未开启，保持自然但不过界。",
      "注意：朋友圈是半公开场景，你的评论会显示在公开动态下方。不要引用私聊内容，不要假装知道图片细节。",
    ].join("\n");

    const momentDesc = [
      `用户的朋友圈内容：${context.task.momentContent}`,
      context.task.momentImageCount > 0 ? `（配 ${context.task.momentImageCount} 张图）` : "",
      context.task.momentLocation ? ` 位置：${context.task.momentLocation}` : "",
    ].filter(Boolean).join("");

    return [
      { role: "system", content: system },
      { role: "user", content: momentDesc },
      { role: "user", content: `输出要求：${context.task.outputRequirement}` },
    ];
  },
} as const;
