# 小手机 MyPhone

“小手机”是一款面向年轻女性用户的 AI 恋陪产品。用户登录后进入一台沉浸式虚拟手机，在联系人中创建多个 AI 角色，并在微信式聊天中与角色持续互动。当前工程已从 MVP 的单轮 LLM 聊天，演进到 V2 Character Agent Runtime：角色具备上下文、长期记忆、工具边界、安全策略和可观测运行轨迹。

## 1. 产品定位

### 1.1 一句话说明

用户拥有一台私密虚拟手机，手机里的每个联系人都是一个可长期陪伴、会记忆、会表达、后续可跨 App 行动的 AI 角色。

### 1.2 核心体验

- 像手机，不像后台。
- 像真实联系人，不像客服机器人。
- 像微信聊天，不像通用聊天组件。
- 有主动感，但不失控。
- 有亲密感，但有安全边界。
- 有自由角色卡，但系统能理解并长期使用。
- 有跨 App 记忆基础，未来新增微博、电话、日历、相册、礼物等 App 时可复用同一个角色 Agent。

### 1.3 当前 MVP 范围

- 账号注册、登录和 JWT 鉴权。
- 用户自带 DeepSeek / GLM / Kimi API Key。
- API Key 后端 AES-256-GCM 加密保存。
- 沉浸式全屏手机桌面。
- 联系人 App：多个 AI 角色创建、编辑、导入、头像上传。
- 微信 App：会话列表、聊天详情、未读红点、消息发送、正在输入、乐观 UI。
- 角色级温度设置，范围 `0.5-1.2`，默认 `0.8`。
- 长期记忆、关系进度、角色安全边界。
- Agent V2 基础架构：Harness、Runtime、Context、Prompt、Memory、Tool、MCP Mock、Policy、Observability。

### 1.4 暂不做

- 不接真实微信、真实支付、真实地图、真实 TTS、真实视频生成。
- 不做真实后台定时推送。
- 不接海外模型 GPT / Gemini / Claude。
- 不做公开角色市场、真人用户聊天、社交广场。
- 不让 Agent 无限制访问外部网络。
- 不允许高风险工具无用户确认执行。

## 2. 技术栈

### 2.1 Monorepo

```text
myphone/
  apps/
    api/          NestJS API + Prisma
    web/          React + Vite Web App
  packages/
    shared/       前后端共享类型
  docker/         Dockerfile
  docs/           部署与辅助文档
```

### 2.2 前端

- React 18
- TypeScript
- Vite
- React Router
- Zustand
- Tailwind CSS
- Lucide React
- iOS Native / Soft UI / Neumorphism Lite / 浅色磨砂风格

### 2.3 后端

- Node.js 20
- NestJS
- TypeScript ESM
- Prisma ORM
- PostgreSQL 16
- Redis 7
- JWT Access Token / Refresh Token
- Zod
- AES-256-GCM API Key 加密

### 2.4 AI / LLM

- DeepSeek
- GLM
- Kimi
- OpenAI-compatible Chat Completions 适配
- 本地支持 `LLM_MOCK_ENABLED`，默认 `false`

## 3. 本地运行

### 3.1 本地端口

| 服务 | 地址 |
| --- | --- |
| Web | `http://localhost:15173` |
| API | `http://localhost:3000/api` |
| Health | `http://localhost:3000/api/health` |
| PostgreSQL | `localhost:15432 -> container 5432` |
| Redis | `localhost:16379 -> container 6379` |

宿主机端口使用 `15173`、`15432`、`16379`，用于避开本机常见的 `5173`、`5432`、`6379` 占用。

### 3.2 首次启动

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm --filter api prisma:migrate --name init
pnpm --filter api prisma:seed
docker compose up -d --build api web
```

访问：

- Web：`http://localhost:15173`
- API 健康检查：`http://localhost:3000/api/health`

### 3.3 常用命令

```bash
pnpm check
pnpm build
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
docker compose ps
docker compose logs -f api
docker compose logs -f web
docker compose down
```

### 3.4 环境变量

本地 `.env.example` 关键项：

```bash
DATABASE_URL=postgresql://myphone:myphone_local@localhost:15432/myphone?schema=public
REDIS_URL=redis://localhost:16379
JWT_ACCESS_SECRET=replace_with_local_access_secret
JWT_REFRESH_SECRET=replace_with_local_refresh_secret
API_KEY_ENCRYPTION_SECRET=replace_with_32_bytes_minimum_secret
CORS_ORIGIN=http://localhost:15173
VITE_API_BASE_URL=http://localhost:3000/api
LLM_MOCK_ENABLED=false
```

说明：

- `LLM_MOCK_ENABLED=false` 时，模型连接测试和微信聊天都会请求真实 LLM。
- 使用真实 LLM 前，需要在设置页保存默认模型和 API Key。
- 生产环境禁止弱 JWT 密钥、弱 API Key 加密密钥和 mock LLM。

## 4. 当前功能

### 4.1 手机桌面

- 登录后进入全屏手机桌面。
- 桌面使用浅粉、白、浅蓝渐变背景。
- 顶部时间跟随系统时间。
- 天气组件随机展示晴、雨、阴、雪等状态。
- Dock 固定放置电话、联系人、设置。
- 微信图标红点只在内部有未读消息时展示。

### 4.2 联系人

联系人 App 是 AI 角色管理页。

支持：

- 多角色列表。
- 角色详情。
- 新建角色。
- 编辑现有角色。
- 文本 / JSON / 大段角色卡导入解析。
- 故事背景。
- 对用户的称呼。
- 模型温度。
- 头像上传。
- 完整角色卡。

头像规则：

- 用户上传头像后，全 App 使用该图片。
- 未上传时，使用角色名最后一个字 + 稳定纯色背景。

创建角色时：

- 自动创建微信会话。
- 自动生成第一条角色消息。
- 不自动跳入微信。

### 4.3 微信

支持：

- 会话列表。
- 会话未读数。
- 聊天详情。
- 用户消息乐观显示。
- AI 回复等待时显示“正在输入中”。
- 顶部和底部固定，中间消息区滚动。
- 聊天气泡、头像、时间、边界和日间亮色 UI。
- 打开会话自动标记已读。

用户发送消息后：

```text
保存用户消息
  -> Harness 记录 AgentEvent / AgentRun
  -> AgentRuntime 生成 wechat.send_message action
  -> AgentActionExecutor 写入角色消息
  -> 更新会话摘要和未读数
  -> AgentRun 记录 prompt、context、actions、latency
```

### 4.4 设置

支持：

- 模型供应商配置。
- API Key 保存和连接测试。
- 默认模型选择。
- API Key 脱敏展示。
- 隐私政策和用户协议占位入口。

## 5. 核心 API

统一前缀：`/api`

### 5.1 Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### 5.2 Model Configs

```http
GET    /api/model-configs
POST   /api/model-configs
PATCH  /api/model-configs/:id
DELETE /api/model-configs/:id
POST   /api/model-configs/test
```

### 5.3 Characters / Contacts

```http
GET    /api/characters
POST   /api/characters
GET    /api/characters/:id
PATCH  /api/characters/:id
DELETE /api/characters/:id
POST   /api/characters/import/parse
```

### 5.4 Conversations

```http
GET   /api/conversations
GET   /api/conversations/:id/messages
POST  /api/conversations/:id/messages
GET   /api/conversations/:id/profile
PATCH /api/conversations/:id/read
```

### 5.5 Agent Observability

```http
GET /api/agents/runs/:id/trace
GET /api/agents/runs/:id/replay
GET /api/agents/traces/:traceId
```

这些接口用于开发期和内部排障，回答：

- 这次回复由哪个事件触发。
- 使用了哪个 prompt 版本。
- 使用了哪些上下文和记忆。
- 调用了哪些工具。
- 最终执行了哪些 AgentAction。
- 失败发生在 context、prompt、model、tool 还是 DB。

## 6. Agent V2 架构

### 6.1 架构目标

当前系统已从“业务 service 直接拼 prompt 调 LLM”，演进为 Character Agent Runtime。

目标链路：

```text
任意 App 事件
  -> Harness System 标准化事件
  -> Agent Runtime 创建 AgentRun
  -> Context System 组装上下文
  -> Prompt System 选择任务 prompt
  -> Model Provider / Tool / MCP 执行
  -> Memory System 写入或合并记忆
  -> Policy System 做安全检查
  -> Action Executor 执行业务动作
  -> App Surface 展示结果
  -> Observability 记录和回放
```

核心原则：

- App 是交互表面，不直接拥有 AI 逻辑。
- Character 不只是角色卡，而是具备记忆、状态、工具能力和行为策略的 Agent。
- 微信只是 Agent 的一个输入输出渠道。
- 长期记忆、关系进度、偏好、边界在角色维度共享，未来可被多个 App 复用。
- 每次 Agent 行为必须可观测、可回放、可审计、可降级。

### 6.2 Agent Layer 模块

```text
apps/api/src/agents/
  agents.module.ts
  agent-harness.service.ts
  agent-runtime.service.ts
  agent-context.service.ts
  agent-prompt.service.ts
  agent-memory.service.ts
  agent-tool-registry.service.ts
  mcp-tool-adapter.service.ts
  agent-policy.service.ts
  agent-action-executor.service.ts
  agent-observability.service.ts
  agent-observability.controller.ts
  prompts/
    chat-reply.prompt.ts
```

### 6.3 Harness System

Harness 是 App 和 Agent 之间的统一运行外壳，负责把 App 用户行为标准化为 AgentEvent，并创建 AgentRun。

标准事件示例：

```json
{
  "app": "wechat",
  "type": "message.user_sent",
  "visibility": "private",
  "source": "user",
  "content": "我喜欢草莓",
  "payload": {
    "conversationId": "xxx",
    "messageId": "xxx"
  },
  "idempotencyKey": "wechat:message:xxx"
}
```

### 6.4 Agent Runtime

Runtime 负责一次 AgentRun 的生命周期：

```text
handle event
  -> policy pre-check
  -> build context
  -> render prompt
  -> call model or tool
  -> parse output
  -> policy post-check
  -> write / merge memory
  -> execute action
  -> mark run succeeded / failed
```

当前微信聊天已由 AgentRuntime 接管回复生成，并返回 `wechat.send_message` action。

### 6.5 Context System

上下文分层：

- System Context：平台规则、安全边界、输出格式。
- Character Context：角色身份、故事背景、称呼、温度、关系阶段。
- User Context：用户画像、偏好、边界、近期情绪。
- App Context：当前 App、会话、可见性、消息类型、UI 限制。
- Memory Context：长期记忆、共同事件、未完成承诺。
- Recent Context：最近消息、最近事件、最近工具调用。
- Task Context：本次任务目标、输出 schema、禁止事项。

Context 需要控制预算，优先保留安全规则、角色身份、当前用户输入、最近消息、高权重记忆和未完成承诺。

### 6.6 Prompt System

Prompt 已从业务 service 抽出为版本化模板。

当前模板：

- `chat.reply.wechat`
- 版本：`2026-06-14.1`

AgentRun 会记录：

- `promptName`
- `promptVersion`
- `contextSnapshot`

这样 prompt 修改后可以回放历史 AgentRun，对比效果。

### 6.7 Memory System V2

新记忆使用 `AgentMemory` 基础结构，支持：

- `scope`
- `type`
- `content`
- `structured`
- `sourceApp`
- `sourceEventId`
- `confidence`
- `weight`
- `sensitivity`
- `visibility`
- `enabled`

典型记忆类型：

- `user_preference`
- `user_profile`
- `shared_event`
- `relationship_moment`
- `boundary`
- `promise`
- `emotion_pattern`
- `character_private_state`

示例：

```text
微信：用户说喜欢草莓
  -> 写入 user_preference: food.flavor = strawberry

未来微博：用户说想喝奶茶
  -> 写入 user_preference: drink = milk_tea

未来微信：角色检索到两条偏好
  -> 自然生成“草莓奶茶”相关表达
```

### 6.8 Tool / MCP

工具统一注册在 Tool Registry。

工具定义包含：

- `name`
- `description`
- `inputSchema`
- `outputSchema`
- `provider`
- `riskLevel`
- `readOnly`
- `destructive`
- `requiresUserConsent`
- `timeoutMs`
- `allowedApps`
- `allowedTasks`

当前支持：

- 内部工具：`sendWechatMessage`、`writeMemory`、`updateRelationship`
- Mock MCP 工具：`mock.weather.get_current`
- 高风险策略验证工具：`mock.shopping.create_order`

规则：

- 默认禁止外部工具。
- 低风险读工具可自动调用。
- 写操作、花钱、发外部消息、访问敏感数据必须用户确认。
- 每次 ToolCall 必须记录输入、输出、耗时和错误。

### 6.9 Policy System

统一安全策略集中在 `AgentPolicyService`。

覆盖：

- Input Safety：用户输入检查。
- Context Safety：防止不该暴露的记忆进入上下文。
- Output Safety：角色输出违规、越界、伪装真人时拦截或改写。
- Tool Safety：检查工具权限、风险、用户确认。
- Memory Safety：检查敏感记忆是否允许存储。

边界：

- 角色可以沉浸式陪伴，但不能声称自己是真实自然人。
- 不鼓励用户依赖、伤害自己或他人。
- 成人模式必须保留合法、自愿、成年、边界明确。
- 高风险工具必须用户确认。
- 私密记忆不能进入公开场景。

### 6.10 Observability

每次 AgentRun 记录：

- `traceId`
- user / character / app / eventType
- model provider / modelName
- promptName / promptVersion
- contextSnapshot
- memory hits
- tool calls
- actions
- latency
- status / error

开发期可通过 trace 接口查看 why-this-reply，并生成 replay payload。

## 7. 数据模型概览

核心业务表：

- `User`
- `ModelConfig`
- `Character`
- `Conversation`
- `Message`
- `Memory`
- `AiRequest`
- `AnalyticsEvent`

Agent V2 表：

- `AgentRun`
- `AgentEvent`
- `AgentToolCall`
- `AgentState`
- `AgentMemory`

关系：

- 一个用户可以有多个角色。
- 一个角色对应一个微信会话。
- 一个角色拥有独立 AgentRun、AgentEvent、AgentMemory。
- AiRequest 可关联 AgentRun。
- AgentToolCall 关联 AgentRun。

## 8. 安全与隐私

### 8.1 用户数据

- 密码必须 hash，不可逆。
- API Key 必须 AES-256-GCM 加密。
- API Key 只返回脱敏值。
- 聊天记录按用户隔离。
- 所有 `conversationId`、`characterId`、`messageId` 都必须校验资源归属。

### 8.2 内容边界

- 成人模式默认关闭。
- 开启成人模式需要用户确认成年。
- 角色必须 18+。
- MVP 仅允许轻度亲密表达。
- 禁止未成年人成人内容、胁迫、药物控制、自伤诱导、现实跟踪威胁、违法行为、极端控制。

### 8.3 工具边界

- MCP Server 不默认获得用户身份凭证。
- 外部 API Key 必须加密保存。
- Agent 只能拿 scoped credential 或一次性 token。
- 高风险 MCP 调用前必须由 Policy 审核。
- MCP 工具结果不能自动写入记忆，必须经过 Memory System。

## 9. 新 App / 新功能接入

后续新增微博、电话、相册、日历、礼物等 App，不应该各自接一套 LLM，而应该统一接入 Agent 操作系统。

标准模式：

```text
新 App 用户行为
  -> App Adapter
  -> AgentEvent
  -> AgentRun
  -> Context
  -> Prompt
  -> Memory
  -> Tool / MCP
  -> Policy
  -> AgentAction
  -> Observability
```

核心口径：

- App 是角色生活的场景。
- Agent 是角色的大脑。
- Memory 是角色的长期关系。
- Tool 是角色的能力边界。
- Policy 是安全护栏。
- Observability 是排障黑盒。

接入检查清单：

- 定义 App 场景：私密、公开、系统或工具型。
- 定义标准 AgentEvent：包含 `app`、`type`、`visibility`、`source`、`content`、`payload`、`idempotencyKey`。
- 定义 Agent 任务：`chat.reply`、`memory.extract`、`memory.merge`、`relationship.advance`、`agent.plan` 或 `tool.plan`。
- 定义 Context 边界：哪些记忆可读、哪些敏感信息不能进入公开场景。
- 定义 Prompt 模板：必须包含 `name` 和 `version`，并记录到 AgentRun。
- 定义 Memory 写入规则：必须有 `sourceApp`、`sourceEventId`、`confidence`、`weight`、`visibility`。
- 定义 AgentAction：所有动作必须由 `AgentActionExecutorService` 统一执行。
- 定义 Tool / MCP 权限：高风险工具必须用户确认。
- 接入 `AgentPolicyService`：覆盖输入、输出、记忆、工具安全。
- 接入 Observability：通过 `runId` 或 `traceId` 能查到 why-this-reply。

## 10. 测试与验收

### 10.1 常规检查

```bash
pnpm check
pnpm build
```

### 10.2 本地健康检查

```bash
docker compose up -d --build api web
curl http://localhost:3000/api/health
```

### 10.3 核心链路验收

- 注册新用户。
- 登录进入手机桌面。
- 在设置页保存默认模型 API Key。
- 创建联系人角色。
- 自动创建微信会话。
- 微信图标未读红点正确。
- 打开聊天页能看到首条消息。
- 用户发送消息后立即显示用户气泡。
- 等待 LLM 时显示“正在输入中”。
- 角色回复成功写入消息。
- AgentRun 可查到 promptName、promptVersion、contextSnapshot、actions。
- 用户偏好可写入 AgentMemory。
- 后续聊天可检索并自然引用记忆。

### 10.4 Agent 验收

- 每次用户输入都有 AgentEvent。
- 每次 Agent 执行都有 AgentRun。
- 每次 LLM 请求可追踪到 AiRequest。
- 每次工具调用可追踪到 AgentToolCall。
- 高风险输出被拦截或改写。
- 高风险工具无用户确认时不能执行。
- 任何一次回复都能通过 trace 解释“为什么这么说”。

## 11. 部署演进

### 11.1 本地阶段

```text
docker compose
  - web
  - api
  - postgres
  - redis
```

### 11.2 火山引擎内测阶段

推荐组合：

- ECS + Docker Compose 部署 `web` 和 `api`。
- RDS PostgreSQL 替代本地 postgres。
- 托管 Redis 替代本地 redis。
- CLB 绑定 API 服务。
- TOS / CDN 可选，用于前端静态资源。
- TLS 日志服务收集后端日志。

### 11.3 稳定生产阶段

推荐组合：

- VKE 部署 API 和未来 Agent Worker。
- 前端构建静态资源上传 TOS，通过 CDN 分发。
- RDS PostgreSQL 主库。
- Redis 托管版。
- CLB + HTTPS 证书。
- TLS 日志服务。
- 云监控告警：API 5xx、模型调用失败率、DB 连接数、Redis 连接数。

### 11.4 后续 Worker 化

短期同步：

```text
HTTP Request -> AgentRuntime -> Response
```

中期异步：

```text
HTTP Request -> enqueue AgentEvent -> return pending
Worker -> AgentRuntime -> ActionExecutor -> WebSocket / polling update
```

微信聊天当前建议保持同步，避免前端复杂度过高。

## 12. 后续方向

近期：

- 修复和优化 Docker 构建弱网稳定性。
- 完善 AgentRun 调试页面。
- 补充 Memory 管理 UI，让用户可查看、删除、禁用角色记忆。
- 将 `ActionExecutor` 继续标准化，减少 App Service 中的动作执行逻辑。

中期：

- 新增微博 / 动态 App。
- 新增电话 App。
- 新增相册 / 回忆 App。
- 新增日历 / 约定 App。
- 接真实 MCP 工具前补齐 allowlist、授权、限流、预算和审计。

长期：

- 分层记忆：Profile Memory、Episodic Memory、Semantic Memory、Procedural Memory。
- 向量检索和 rerank。
- 周期性关系总结。
- 多角色群聊时引入 SceneAgent / GroupAgent。
- 生产级 Agent Worker、队列、预算、熔断和限流。
