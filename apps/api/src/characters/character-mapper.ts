import type { CharacterView } from "@myphone/shared";

export function toCharacterView(character: {
  id: string;
  name: string;
  nickname: string;
  age: number;
  birthday: string | null;
  occupation: string | null;
  city: string | null;
  avatarPreset: string;
  relationshipStage: string;
  adultEnabled: boolean;
  adultIntensity: string;
  proactiveFrequency: string;
  isActive: boolean;
  riskLevel: string;
  rawCharacterCard: string | null;
  structuredProfile: unknown;
  conversation?: { id: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): CharacterView {
  return {
    id: character.id,
    name: character.name,
    nickname: character.nickname,
    age: character.age,
    birthday: character.birthday,
    occupation: character.occupation,
    city: character.city,
    avatarPreset: character.avatarPreset,
    relationshipStage: character.relationshipStage,
    adultEnabled: character.adultEnabled,
    adultIntensity: character.adultIntensity,
    proactiveFrequency: character.proactiveFrequency,
    isActive: character.isActive,
    riskLevel: character.riskLevel,
    rawCharacterCard: character.rawCharacterCard,
    structuredProfile:
      typeof character.structuredProfile === "object" && character.structuredProfile !== null
        ? (character.structuredProfile as Record<string, unknown>)
        : {},
    conversationId: character.conversation?.id ?? null,
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  };
}
