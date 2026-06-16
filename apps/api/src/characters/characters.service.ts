import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  CharacterCardImportResponse,
  CharacterView,
  CreateCharacterRequest,
  CreateCharacterResponse,
} from "@myphone/shared";
import { AgentPolicyService } from "../agents/agent-policy.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { RedisService } from "../infra/redis.service.js";
import { toConversationView, toMessageView } from "../conversations/conversation-mapper.js";
import { toCharacterView } from "./character-mapper.js";
import type { CreateCharacterDto, ImportCharacterCardDto, UpdateCharacterDto } from "./characters.schemas.js";

@Injectable()
export class CharactersService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(RedisService)
    private readonly redis: RedisService,
    @Inject(AgentPolicyService)
    private readonly agentPolicy: AgentPolicyService,
  ) {}

  async list(userId: string): Promise<CharacterView[]> {
    const characters = await this.prisma.character.findMany({
      where: { userId, deletedAt: null },
      include: { conversation: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });

    return characters.map(toCharacterView);
  }

  async create(userId: string, input: CreateCharacterDto): Promise<CreateCharacterResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const safety = this.agentPolicy.evaluateCharacterCard({
      content: this.safetyText(normalizedInput),
      adultEnabled: normalizedInput.adultEnabled,
    });
    this.agentPolicy.assertCharacterCardAllowed({ safety, safetyAccepted: input.safetyAccepted });

    if (normalizedInput.adultEnabled) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { ageConfirmed: true },
      });

      if (!user?.ageConfirmed) {
        throw new BadRequestException("开启成人模式前需要先确认已满 18 岁");
      }
    }

    const firstMessageContent = this.buildFirstMessage(normalizedInput);

    const result = await this.prisma.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          userId,
          name: normalizedInput.name,
          nickname: normalizedInput.nickname,
          avatarPreset: normalizedInput.avatarPreset,
          age: normalizedInput.age,
          birthday: normalizedInput.birthday || null,
          occupation: normalizedInput.occupation || null,
          city: normalizedInput.city || null,
          rawCharacterCard: normalizedInput.rawCharacterCard,
          structuredProfile: this.buildStructuredProfile(normalizedInput),
          relationshipStage: normalizedInput.relationshipStage,
          adultEnabled: normalizedInput.adultEnabled,
          adultIntensity: normalizedInput.adultIntensity,
          proactiveFrequency: normalizedInput.proactiveFrequency,
          riskLevel: safety.level,
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          userId,
          characterId: character.id,
          unreadCount: 1,
          lastMessagePreview: firstMessageContent,
          lastMessageAt: new Date(),
        },
        include: {
          character: {
            select: {
              id: true,
              name: true,
              nickname: true,
              avatarPreset: true,
              structuredProfile: true,
            },
          },
        },
      });

      const firstMessage = await tx.message.create({
        data: {
          userId,
          conversationId: conversation.id,
          characterId: character.id,
          sender: "character",
          type: "text",
          content: firstMessageContent,
          payload: {
            source: "character_creation",
            relationshipStage: normalizedInput.relationshipStage,
          },
        },
      });

      const characterWithConversation = await tx.character.findUniqueOrThrow({
        where: { id: character.id },
        include: { conversation: { select: { id: true } } },
      });

      return {
        character: characterWithConversation,
        conversation,
        firstMessage,
      };
    });

    return {
      character: toCharacterView(result.character),
      conversation: toConversationView(result.conversation),
      firstMessage: toMessageView(result.firstMessage),
    };
  }

  async update(userId: string, characterId: string, input: UpdateCharacterDto): Promise<CharacterView> {
    const existing = await this.prisma.character.findFirst({
      where: { id: characterId, userId, deletedAt: null },
      include: { conversation: { select: { id: true } } },
    });

    if (!existing) {
      throw new NotFoundException("联系人不存在");
    }

    const normalizedInput = this.normalizeCreateInput({
      ...input,
      relationshipStage: input.relationshipStage ?? (existing.relationshipStage as CreateCharacterDto["relationshipStage"]),
      adultEnabled: input.adultEnabled ?? existing.adultEnabled,
      adultIntensity: input.adultIntensity ?? (existing.adultIntensity as CreateCharacterDto["adultIntensity"]),
      proactiveFrequency: input.proactiveFrequency ?? (existing.proactiveFrequency as CreateCharacterDto["proactiveFrequency"]),
    });
    const safety = this.agentPolicy.evaluateCharacterCard({
      content: this.safetyText(normalizedInput),
      adultEnabled: normalizedInput.adultEnabled,
    });
    this.agentPolicy.assertCharacterCardAllowed({ safety, safetyAccepted: input.safetyAccepted });

    if (normalizedInput.adultEnabled) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { ageConfirmed: true },
      });

      if (!user?.ageConfirmed) {
        throw new BadRequestException("开启成人模式前需要先确认已满 18 岁");
      }
    }

    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        name: normalizedInput.name,
        nickname: normalizedInput.nickname,
        avatarPreset: normalizedInput.avatarPreset,
        age: normalizedInput.age,
        birthday: normalizedInput.birthday || null,
        occupation: normalizedInput.occupation || null,
        city: normalizedInput.city || null,
        rawCharacterCard: normalizedInput.rawCharacterCard,
        structuredProfile: this.buildStructuredProfile(normalizedInput),
        relationshipStage: normalizedInput.relationshipStage,
        adultEnabled: normalizedInput.adultEnabled,
        adultIntensity: normalizedInput.adultIntensity,
        proactiveFrequency: normalizedInput.proactiveFrequency,
        riskLevel: safety.level,
      },
      include: { conversation: { select: { id: true } } },
    });

    if (existing.conversation?.id) {
      await this.redis.del(`conversation-profile:${userId}:${existing.conversation.id}`).catch(() => undefined);
      await this.redis.del(`conversation-context:${userId}:${existing.conversation.id}`).catch(() => undefined);
    }

    return toCharacterView(updated);
  }

  parseImport(input: ImportCharacterCardDto): CharacterCardImportResponse {
    const parsed = this.parseCharacterCard(input.content);
    const safety = this.agentPolicy.evaluateCharacterCard({
      content: parsed.rawCharacterCard,
      adultEnabled: parsed.adultEnabled ?? false,
    });
    const missingFields = this.getMissingFields(parsed);

    return {
      result: {
        ...parsed,
        safetyAccepted: false,
        confidence: this.estimateConfidence(parsed, missingFields),
        sourceFormat: this.detectSourceFormat(input.content),
        missingFields,
        safety,
      },
    };
  }

  private normalizeCreateInput(input: CreateCharacterDto): Required<Pick<CreateCharacterDto, "name" | "nickname" | "age" | "avatarPreset" | "relationshipStage" | "adultEnabled" | "adultIntensity" | "proactiveFrequency" | "rawCharacterCard">> &
    Omit<CreateCharacterDto, "name" | "nickname" | "age" | "avatarPreset" | "relationshipStage" | "adultEnabled" | "adultIntensity" | "proactiveFrequency" | "rawCharacterCard"> {
    const storyBackground = input.storyBackground?.trim();
    const rawCharacterCard = input.rawCharacterCard?.trim() || storyBackground || `${input.name} 是一个等待补充设定的 AI 角色。`;

    return {
      ...input,
      name: this.cleanName(input.name),
      nickname: input.nickname?.trim() || this.cleanName(input.name),
      age: input.age ?? 25,
      avatarPreset: input.avatarPreset ?? "moon",
      relationshipStage: input.relationshipStage ?? "stranger",
      adultEnabled: input.adultEnabled ?? false,
      adultIntensity: input.adultIntensity ?? "light",
      proactiveFrequency: input.proactiveFrequency ?? "medium",
      rawCharacterCard,
      temperature: this.clampTemperature(input.temperature),
    };
  }

  private buildStructuredProfile(input: ReturnType<CharactersService["normalizeCreateInput"]>): Prisma.InputJsonObject {
    return {
      name: input.name,
      nickname: input.nickname,
      age: input.age,
      birthday: input.birthday || null,
      occupation: input.occupation || null,
      city: input.city || null,
      avatarPreset: input.avatarPreset,
      avatarUrl: input.avatarUrl || null,
      storyBackground: input.storyBackground || null,
      userAddressing: input.userAddressing || null,
      temperature: this.clampTemperature(input.temperature),
      relationshipStage: input.relationshipStage,
      adultEnabled: input.adultEnabled,
      adultIntensity: input.adultIntensity,
      proactiveFrequency: input.proactiveFrequency,
      tags: this.extractTags(input.rawCharacterCard),
      safetyAccepted: Boolean(input.safetyAccepted),
    };
  }

  private safetyText(input: ReturnType<CharactersService["normalizeCreateInput"]>): string {
    return [input.storyBackground, input.rawCharacterCard].filter(Boolean).join("\n\n");
  }

  private extractTags(rawCharacterCard: string): string[] {
    const candidates = ["温柔", "冷淡", "年上", "年下", "黏人", "克制", "占有欲", "毒舌", "成熟"];
    return candidates.filter((tag) => rawCharacterCard.includes(tag)).slice(0, 5);
  }

  private parseCharacterCard(content: string): CreateCharacterRequest {
    const json = this.tryParseJson(content);

    if (json) {
      return this.parseJsonCard(json, content);
    }

    return this.parseTextCard(content);
  }

  private tryParseJson(content: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }

  private detectSourceFormat(content: string): "json" | "sillytavern" | "text" {
    const json = this.tryParseJson(content);
    if (!json) {
      return "text";
    }

    if (this.asRecord(json.data) || "spec" in json || "first_mes" in json || "char_persona" in json) {
      return "sillytavern";
    }

    return "json";
  }

  private parseJsonCard(card: Record<string, unknown>, originalContent: string): CreateCharacterRequest {
    const data = this.normalizeSillyTavernData(card);
    const name = this.pickString(data, ["name", "char_name", "character_name"]) ?? "未命名角色";
    const description = this.pickString(data, ["description", "desc", "char_persona", "personality"]) ?? "";
    const scenario = this.pickString(data, ["scenario", "world_scenario"]) ?? "";
    const creatorNotes = this.pickString(data, ["creator_notes", "creatorcomment", "notes"]) ?? "";
    const firstMessage = this.pickString(data, ["first_mes", "first_message", "firstMessage"]) ?? "";
    const rawCharacterCard = [description, scenario, creatorNotes, firstMessage]
      .filter(Boolean)
      .join("\n\n")
      .trim() || originalContent;

    return {
      name: this.cleanName(name),
      nickname: this.cleanName(name),
      age: this.extractAge(rawCharacterCard) ?? 25,
      birthday: this.extractField(rawCharacterCard, ["生日", "birthday"]),
      occupation: this.extractField(rawCharacterCard, ["职业", "occupation", "工作"]),
      city: this.extractField(rawCharacterCard, ["城市", "city", "居住地"]),
      avatarPreset: this.pickAvatarPreset(rawCharacterCard),
      storyBackground: scenario || this.extractLongField(rawCharacterCard, ["故事背景", "背景", "scenario"]),
      userAddressing: this.extractField(rawCharacterCard, ["对你的称呼", "称呼", "userAddressing"]),
      temperature: this.extractTemperature(rawCharacterCard) ?? 0.8,
      relationshipStage: this.inferRelationshipStage(rawCharacterCard),
      adultEnabled: this.hasAdultSignal(rawCharacterCard),
      adultIntensity: "light",
      proactiveFrequency: "medium",
      rawCharacterCard: rawCharacterCard.slice(0, 5000),
    };
  }

  private normalizeSillyTavernData(card: Record<string, unknown>): Record<string, unknown> {
    const data = this.asRecord(card.data);
    if (data) {
      return { ...card, ...data };
    }

    return card;
  }

  private parseTextCard(content: string): CreateCharacterRequest {
    const normalized = content.replace(/\r\n/g, "\n").trim();
    const name =
      this.extractField(normalized, ["姓名", "名字", "name", "角色名"]) ??
      this.extractNameFromText(normalized) ??
      "未命名角色";

    return {
      name,
      nickname: this.extractField(normalized, ["昵称", "nickname"]) ?? name,
      age: this.extractAge(normalized) ?? 25,
      birthday: this.extractField(normalized, ["生日", "birthday"]),
      occupation: this.extractField(normalized, ["职业", "occupation", "工作"]),
      city: this.extractField(normalized, ["城市", "city", "居住地"]),
      avatarPreset: this.pickAvatarPreset(normalized),
      storyBackground: this.extractLongField(normalized, ["故事背景", "背景", "scenario"]),
      userAddressing: this.extractField(normalized, ["对你的称呼", "称呼", "userAddressing"]),
      temperature: this.extractTemperature(normalized) ?? 0.8,
      relationshipStage: this.inferRelationshipStage(normalized),
      adultEnabled: this.hasAdultSignal(normalized),
      adultIntensity: "light",
      proactiveFrequency: "medium",
      rawCharacterCard: normalized.slice(0, 5000),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private pickString(card: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = card[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private extractField(content: string, labels: string[]): string | undefined {
    for (const label of labels) {
      const pattern = new RegExp(`${label}\\s*[:：]\\s*([^\\n，。；;]{1,40})`, "i");
      const match = content.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractLongField(content: string, labels: string[]): string | undefined {
    for (const label of labels) {
      const pattern = new RegExp(`${label}\\s*[:：]\\s*([^\\n]{1,500})`, "i");
      const match = content.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractTemperature(content: string): number | undefined {
    const match = content.match(/(?:模型温度|温度|temperature)\s*[:：]?\s*([0-2](?:\.[0-9])?)/i);
    if (!match?.[1]) {
      return undefined;
    }

    return this.clampTemperature(Number(match[1]));
  }

  private clampTemperature(value: number | undefined): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0.5, Math.min(1.2, value)) : 0.8;
  }

  private extractNameFromText(content: string): string | null {
    const match = content.match(/(?:他叫|她叫|男主叫|女主叫|角色叫|我是)([\u4e00-\u9fa5A-Za-z0-9_-]{1,20})/);
    return match?.[1] ? this.cleanName(match[1]) : null;
  }

  private extractAge(content: string): number | null {
    const match = content.match(/(?:年龄|age|岁数)?\s*[:：]?\s*([1-9][0-9])\s*岁?/i);
    if (!match?.[1]) {
      return null;
    }

    const age = Number(match[1]);
    return age >= 18 && age <= 80 ? age : null;
  }

  private cleanName(value: string): string {
    return value.replace(/[《》"'“”]/g, "").trim().slice(0, 80) || "未命名角色";
  }

  private pickAvatarPreset(content: string): string {
    if (/雨|潮湿|伞/.test(content)) {
      return "rain";
    }

    if (/咖啡|拿铁|美式/.test(content)) {
      return "coffee";
    }

    if (/西装|律师|金融|总裁/.test(content)) {
      return "suit";
    }

    if (/猫|黑猫/.test(content)) {
      return "black-cat";
    }

    if (/音乐|录音|耳机|工作室/.test(content)) {
      return "studio";
    }

    return "moon";
  }

  private inferRelationshipStage(content: string): CreateCharacterRequest["relationshipStage"] {
    if (/恋人|热恋|老公|老婆|爱人/.test(content)) {
      return "lover";
    }

    if (/男友|女友|交往|约会/.test(content)) {
      return "dating";
    }

    if (/暧昧|心动|暗恋|拉扯/.test(content)) {
      return "ambiguous";
    }

    return "stranger";
  }

  private hasAdultSignal(content: string): boolean {
    return /成人|轻度成人|暧昧升级|亲密|欲望|吻|拥抱|占有/.test(content);
  }

  private getMissingFields(input: CreateCharacterRequest): Array<keyof CreateCharacterRequest> {
    const missingFields: Array<keyof CreateCharacterRequest> = [];

    if (input.name === "未命名角色") {
      missingFields.push("name");
    }

    if (!input.storyBackground && input.rawCharacterCard.length < 30) {
      missingFields.push("storyBackground");
    }

    return missingFields;
  }

  private estimateConfidence(input: CreateCharacterRequest, missingFields: Array<keyof CreateCharacterRequest>): number {
    const base = input.rawCharacterCard.length > 80 ? 72 : 58;
    const bonus = [input.name, input.nickname, input.storyBackground, input.userAddressing, input.temperature].filter(
      Boolean,
    ).length * 5;
    return Math.max(35, Math.min(96, base + bonus - missingFields.length * 4));
  }

  private buildFirstMessage(input: CreateCharacterDto): string {
    const addressing = input.userAddressing ? `${input.userAddressing}，` : "";
    return `${addressing}我是${input.nickname ?? input.name}。设定已经准备好了，之后我会按这个角色与你对话。`;
  }
}
