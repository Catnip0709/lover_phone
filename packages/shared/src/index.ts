export type HealthStatus = {
  status: "ok";
  service: "api";
  timestamp: string;
  dependencies: {
    database: "ok" | "error";
    redis: "ok" | "error";
  };
};

export type ApiErrorResponse = {
  errorCode: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
};

export type ModelProvider = "deepseek" | "glm" | "kimi";

export type MessageType =
  | "text"
  | "voice"
  | "image"
  | "sticker"
  | "quote"
  | "red_packet"
  | "transfer"
  | "location"
  | "official_account_article"
  | "moment_share"
  | "video"
  | "system_hint";

export type MessageSender = "user" | "character" | "system";

export type ChatMessagePayload = Record<string, unknown>;

export type AuthUser = {
  id: string;
  username: string;
  nickname: string | null;
  ageConfirmed: boolean;
  createdAt: string;
};

export type Gender = "male" | "female" | "other";

export type MeProfileView = {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  birthday: string | null;
  gender: Gender | null;
  bio: string | null;
  region: string | null;
  ageConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PatchMeProfileRequest = {
  nickname?: string | null;
  avatar?: string | null;
  birthday?: string | null;
  gender?: Gender | null;
  bio?: string | null;
  region?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: AuthUser;
};

export type RegisterRequest = {
  username: string;
  password: string;
};

export type LoginRequest = RegisterRequest;

export type RefreshRequest = {
  refreshToken: string;
};

export type ModelConfigView = {
  id: string;
  provider: ModelProvider;
  modelName: string;
  apiKeyMasked: string;
  isDefault: boolean;
  lastTestStatus: "success" | "failed" | "untested";
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertModelConfigRequest = {
  provider: ModelProvider;
  modelName: string;
  apiKey: string;
  isDefault: boolean;
};

export type TestModelConfigRequest = {
  provider: ModelProvider;
  modelName: string;
  apiKey: string;
};

export type TestModelConfigResponse = {
  success: boolean;
  message: string;
};

export type RelationshipStage = "stranger" | "ambiguous" | "dating" | "lover";

export type AdultIntensity = "light" | "medium" | "high";

export type ProactiveFrequency = "low" | "medium" | "high";

export type CreateCharacterRequest = {
  name: string;
  nickname?: string;
  age?: number;
  birthday?: string;
  occupation?: string;
  city?: string;
  avatarPreset?: string;
  avatarUrl?: string;
  storyBackground?: string;
  userAddressing?: string;
  temperature?: number;
  relationshipStage?: RelationshipStage;
  adultEnabled?: boolean;
  adultIntensity?: AdultIntensity;
  proactiveFrequency?: ProactiveFrequency;
  isActive?: boolean;
  rawCharacterCard: string;
  safetyAccepted?: boolean;
};

export type UpdateCharacterRequest = CreateCharacterRequest;

export type CharacterView = {
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
  structuredProfile: Record<string, unknown>;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageView = {
  id: string;
  conversationId: string;
  characterId: string;
  sender: MessageSender;
  type: MessageType;
  content: string | null;
  payload: ChatMessagePayload;
  status: string;
  createdAt: string;
};

export type ConversationView = {
  id: string;
  character: Pick<CharacterView, "id" | "name" | "nickname" | "avatarPreset" | "structuredProfile">;
  pinned: boolean;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCharacterResponse = {
  character: CharacterView;
  conversation: ConversationView;
  firstMessage: MessageView;
};

export type CharacterCardImportRequest = {
  content: string;
};

export type SafetyRiskLevel = "none" | "low" | "medium" | "high" | "blocked";

export type SafetyIssueView = {
  code: string;
  level: SafetyRiskLevel;
  message: string;
};

export type CharacterCardParseResult = CreateCharacterRequest & {
  confidence: number;
  sourceFormat: "json" | "sillytavern" | "text";
  missingFields: Array<keyof CreateCharacterRequest>;
  safety: {
    level: SafetyRiskLevel;
    blocked: boolean;
    requiresAgeConfirmation: boolean;
    issues: SafetyIssueView[];
  };
};

export type CharacterCardImportResponse = {
  result: CharacterCardParseResult;
};

export type AgeConfirmResponse = {
  user: AuthUser;
};

export type SendMessageRequest = {
  content?: string;
  type?: MessageType;
  payload?: Record<string, unknown>;
};

export type SendMessageResponse = {
  userMessage: MessageView;
  aiMessage: MessageView;
  conversation: ConversationView;
  relationship: RelationshipProgressView;
  newMemories: MemoryView[];
};

export type ChatStreamEvent =
  | { type: "user_message"; data: MessageView }
  | { type: "ai_message"; data: { message: MessageView; index: number } }
  | {
      type: "all_done";
      data: {
        conversation: ConversationView;
        relationship: RelationshipProgressView;
        newMemories: MemoryView[];
      };
    }
  | { type: "error"; data: { message: string; errorCode?: string } };

export type MemoryView = {
  id: string;
  characterId: string;
  content: string;
  type: string;
  weight: number;
  enabled: boolean;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  // 新增字段
  isPinned?: boolean;
  tags?: string[];
  expiresAt?: string | null;
  createdBy?: string;
};

export type RelationshipProgressView = {
  stage: RelationshipStage;
  score: number;
  levelName: string;
  nextLevelScore: number | null;
  momentum: number;
  lastUpdatedAt: string | null;
};

export type ConversationProfileView = {
  conversation: ConversationView;
  relationship: RelationshipProgressView;
  memories: MemoryView[];
};

export type GameMemoryMode = "readOnly" | "ephemeral" | "off";

export type GameCompanionAction =
  | "idle"
  | "observe"
  | "cheer"
  | "celebrate"
  | "hint"
  | "think"
  | "comfort"
  | "tease"
  | "focus";

export type GameCompanionMood =
  | "calm"
  | "happy"
  | "excited"
  | "focused"
  | "soft"
  | "playful"
  | "concerned";

export type GameCompanionRequest = {
  gameId: string;
  gameTitle: string;
  characterId: string;
  memoryMode?: GameMemoryMode;
  userIntent?: string;
  gameState?: {
    phase?: string;
    event?: string;
    score?: number;
    summary?: string;
    payload?: Record<string, unknown>;
  };
};

export type GameCompanionResponse = {
  action: GameCompanionAction;
  mood: GameCompanionMood;
  text: string;
  memoryMode: GameMemoryMode;
  usedMemoryCount: number;
  generatedAt: string;
};

export type AgentApp = "wechat" | "contacts" | "system" | (string & {});

export type AgentVisibility = "private" | "public" | "system";

export type AgentEventSource = "user" | "character" | "system" | "tool";

export type AgentRunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

export type AgentTaskType =
  | "chat.reply"
  | "memory.extract"
  | "memory.merge"
  | "relationship.advance"
  | "safety.check"
  | "agent.plan"
  | "tool.plan"
  | (string & {});

export type AgentMemoryScope = "character_private" | "user_global" | "app_private" | "public";

export type AgentMemorySensitivity = "low" | "medium" | "high";

export type AgentToolProvider = "internal" | "mcp";

export type AgentToolRiskLevel = "low" | "medium" | "high";

export type AgentEventView = {
  id: string;
  traceId: string;
  userId: string;
  characterId: string | null;
  app: AgentApp;
  type: string;
  visibility: AgentVisibility;
  source: AgentEventSource;
  content: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  occurredAt: string;
  createdAt: string;
};

export type AgentMemoryDraft = {
  scope: AgentMemoryScope;
  type: string;
  content: string;
  structured?: Record<string, unknown>;
  sourceApp: AgentApp;
  sourceEventId?: string;
  confidence?: number;
  weight?: number;
  sensitivity?: AgentMemorySensitivity;
  visibility?: AgentVisibility;
};

export type AgentMemoryView = {
  id: string;
  userId: string;
  characterId: string;
  scope: AgentMemoryScope;
  type: string;
  content: string;
  structured: Record<string, unknown>;
  sourceApp: AgentApp;
  sourceEventId: string | null;
  confidence: number;
  weight: number;
  sensitivity: AgentMemorySensitivity;
  visibility: AgentVisibility;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 新增字段
  isPinned: boolean;
  tags: string[];
  expiresAt: string | null;
  createdBy: string;
};

export type AgentAction =
  | {
      type: "wechat.send_message";
      conversationId: string;
      content: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "wechat.moments.like";
      postId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "wechat.moments.comment";
      postId: string;
      content: string;
      replyToCommentId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "wechat.moments.create_post";
      content: string;
      imageUrls?: string[];
      location?: string;
      visibility?: "public" | "private";
      metadata?: Record<string, unknown>;
    }
  | {
      type: "memory.write";
      memory: AgentMemoryDraft;
    }
  | {
      type: "memory.merge";
      memoryId: string;
      patch: Record<string, unknown>;
    }
  | {
      type: "relationship.update";
      delta: number;
      reason: string;
    }
  | {
      type: "tool.call";
      toolName: string;
      input: Record<string, unknown>;
    }
  | {
      type: "none";
      reason: string;
    };

export type AgentToolCallView = {
  id: string;
  agentRunId: string;
  userId: string;
  characterId: string | null;
  toolName: string;
  provider: AgentToolProvider;
  riskLevel: AgentToolRiskLevel;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: AgentRunStatus;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type AgentRunView = {
  id: string;
  traceId: string;
  userId: string;
  characterId: string | null;
  app: AgentApp;
  eventType: string;
  taskType: AgentTaskType;
  status: AgentRunStatus;
  modelProvider: ModelProvider | null;
  modelName: string | null;
  promptName: string | null;
  promptVersion: string | null;
  inputSummary: string | null;
  outputSummary: string | null;
  contextSnapshot: Record<string, unknown> | null;
  actions: AgentAction[] | null;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentTraceTimelineItem = {
  id: string;
  kind: "event" | "run" | "tool_call" | "ai_request" | "message" | "memory";
  label: string;
  status?: string | null;
  occurredAt: string;
  summary?: string | null;
};

export type AgentReplayPayload = {
  runId: string;
  traceId: string;
  app: AgentApp;
  taskType: AgentTaskType;
  promptName: string | null;
  promptVersion: string | null;
  modelProvider: ModelProvider | null;
  modelName: string | null;
  contextSnapshot: Record<string, unknown> | null;
  actions: AgentAction[] | null;
  inputSummary: string | null;
  outputSummary: string | null;
};

export type AgentTraceView = {
  traceId: string;
  run: AgentRunView;
  events: AgentEventView[];
  toolCalls: AgentToolCallView[];
  memoryHits: AgentMemoryView[];
  aiRequests: Array<{
    id: string;
    provider: ModelProvider;
    modelName: string;
    requestType: string;
    status: string;
    latencyMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
    messages: Array<{
      id: string;
      sender: "user" | "character" | "system";
      content: string | null;
      createdAt: string;
    }>;
  }>;
  timeline: AgentTraceTimelineItem[];
  explanation: {
    whyThisReply: string[];
    failureHints: string[];
  };
  replay: AgentReplayPayload;
};

export type AgentStateView = {
  id: string;
  userId: string;
  characterId: string;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WechatProfileView = {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  wechatId: string | null;
  bio: string | null;
  region: string | null;
  walletBalanceCents: number;
  defaultMomentVisibility: "public" | "private" | "partial";
  effectiveDisplayName: string;
  effectiveAvatarUrl: string | null;
  effectiveBio: string | null;
  effectiveRegion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatchWechatProfileRequest = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  region?: string | null;
  wechatId?: string | null;
  defaultMomentVisibility?: "public" | "private" | "partial";
};

export type MomentLikeView = {
  id: string;
  actorName: string;
  createdAt: string;
};

export type MomentCommentView = {
  id: string;
  userId: string | null;
  characterId: string | null;
  actorName: string;
  content: string;
  createdAt: string;
};

export type MomentVisibility = "public" | "private" | "friends";

export type MomentView = {
  id: string;
  userId: string;
  characterId: string | null;
  authorType: "user" | "character";
  authorName: string;
  authorAvatar: string | null;
  content: string;
  imageUrls: string[];
  location: string | null;
  visibility: MomentVisibility;
  likes: MomentLikeView[];
  comments: MomentCommentView[];
  createdAt: string;
  updatedAt: string;
};

export type CreateMomentRequest = {
  content: string;
  imageUrls?: string[];
  location?: string | null;
  visibility?: MomentVisibility;
};

export type CreateMomentCommentRequest = {
  content: string;
};
