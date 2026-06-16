# 新 App / 新功能接入 Agent SOP

版本：v0.1  
适用范围：小手机产品内新增 App，或现有 App 新增需要角色 Agent 参与的功能  
目标读者：产品、前端、后端、Agent 工程师、测试工程师  
关联文档：`README.md`

## 1. SOP 目标

本 SOP 用来指导后续工程师把新 App 或现有 App 新功能接入统一 Agent 架构。

核心原则：

- App 不直接写大模型逻辑。
- App 不直接拼复杂 prompt。
- App 不直接决定长期记忆怎么写。
- App 不直接调用外部工具。
- App 只负责场景展示、用户输入、App 自有数据落库。
- 角色智能统一交给 Agent Layer：Harness、Runtime、Context、Prompt、Memory、Policy、Tool、Observability。

标准链路：

```text
用户在 App 内产生行为
  -> App Adapter 校验权限和资源归属
  -> Harness 标准化为 AgentEvent
  -> AgentRuntime 创建 / 更新 AgentRun
  -> Context System 组装上下文
  -> Prompt System 选择版本化模板
  -> Model / Tool / MCP 执行
  -> Memory System 写入或合并记忆
  -> Policy System 做输入、输出、记忆、工具安全检查
  -> AgentActionExecutor 执行业务动作
  -> App Surface 展示结果
  -> Observability 记录 trace / replay / why-this-reply
```

## 2. 什么时候必须接入 Agent

以下场景必须走 Agent：

- 需要角色理解用户输入并回复。
- 需要角色记住用户偏好、经历、边界、承诺。
- 需要跨 App 共享角色记忆。
- 需要根据角色人格生成内容。
- 需要调用工具，例如天气、日历、礼物、地图、搜索、购物。
- 需要主动规划下一步动作。
- 需要解释“为什么这次这么回复”。

以下场景可以不走 Agent：

- 纯 UI 展示，例如桌面时钟、静态设置页。
- 纯 CRUD 且不需要角色理解，例如修改 App 图标排序。
- 只读系统配置查询。
- 不进入角色世界观的工程管理功能。

判断标准：

```text
如果这个功能会影响角色怎么理解用户、怎么记住用户、怎么表达自己、怎么行动，就必须接 Agent。
```

## 3. 角色分工

### 3.1 产品负责人

- 定义 App 场景：私密、公开、系统、工具型。
- 定义用户行为：哪些行为需要 Agent 感知。
- 定义角色体验：角色应该说什么、记什么、做什么。
- 定义安全边界：哪些内容不能被公开、不能被记忆、不能自动执行。
- 定义验收标准：用户体验、记忆效果、失败降级。

### 3.2 前端工程师

- 实现 App Surface 页面。
- 负责用户输入、加载态、失败态、乐观 UI。
- 调用 App Adapter API。
- 不在前端拼 prompt。
- 不在前端决定长期记忆。
- 不在前端直接调用模型或 MCP。

### 3.3 后端 App 工程师

- 实现 App Module / Controller / Service。
- 做鉴权、资源归属校验、App 自有数据落库。
- 把用户行为转换成 AgentEvent。
- 执行 AgentAction 返回的业务动作。
- 保证 App 数据一致性。

### 3.4 Agent 工程师

- 定义 AgentEvent / AgentAction。
- 扩展 Context System。
- 新增 Prompt 模板和版本。
- 接入 Memory System。
- 注册 Tool / MCP。
- 接入 Policy 和 Observability。

### 3.5 测试工程师

- 验证 App 行为。
- 验证 AgentRun 轨迹。
- 验证记忆写入和检索。
- 验证安全策略和工具授权。
- 验证失败降级。

## 4. 接入前设计清单

新 App 开发前必须先回答这些问题。

### 4.1 App 基础信息

| 问题 | 示例 |
| --- | --- |
| App 名称是什么 | `weibo`、`phone`、`calendar`、`album` |
| App 是私密还是公开 | 微信是 `private`，微博偏 `public` |
| App 是否属于角色世界观 | 电话、微博、相册属于；设置页不一定属于 |
| App 是否允许角色主动行动 | 电话可能允许，设置页不允许 |
| App 是否需要外部工具 | 日历、天气、礼物可能需要 |

### 4.2 用户行为

每个需要 Agent 感知的用户行为，都要定义事件。

示例：

| App | 用户行为 | AgentEvent.type | 是否需要回复 | 是否需要记忆 |
| --- | --- | --- | --- | --- |
| 微信 | 用户发消息 | `message.user_sent` | 是 | 是 |
| 微博 | 用户发动态 | `post.user_created` | 可选 | 是 |
| 电话 | 用户结束通话 | `call.ended` | 可选 | 是 |
| 日历 | 用户创建约会 | `calendar.event_created` | 可选 | 是 |
| 相册 | 用户查看照片 | `photo.viewed` | 否 | 可选 |

### 4.3 记忆边界

必须明确：

- 哪些信息可以写入角色私有记忆。
- 哪些信息可以写入用户全局画像。
- 哪些信息只能在 App 内使用。
- 哪些信息不能记。
- 哪些信息不能在公开场景引用。

示例：

```text
微信里用户说：我喜欢草莓
  -> 可以写入 character_private / user_preference / private

微博里用户说：最近想喝奶茶
  -> 可以写入 character_private / user_preference / public 或 private，取决于产品定义

用户说：不要叫我宝宝
  -> 应写入 boundary / high weight / private

用户说：我的身份证号是 xxx
  -> 默认不写入长期记忆，或标记 high sensitivity 并禁止进入普通上下文
```

### 4.4 工具权限

必须明确：

- App 是否允许工具调用。
- 工具是内部工具还是 MCP 工具。
- 工具是否只读。
- 工具是否有副作用。
- 工具是否需要用户确认。
- 工具失败时如何降级。

示例：

| 工具 | 风险 | 是否自动调用 | 是否需用户确认 |
| --- | --- | --- | --- |
| 获取天气 | low | 可以 | 否 |
| 查询日历空闲时间 | medium | 视情况 | 可选 |
| 创建真实日程 | high | 不可以 | 是 |
| 购买礼物 | high | 不可以 | 是 |
| 发外部消息 | high | 不可以 | 是 |

## 5. 标准接入步骤

### Step 1：定义 App Surface

前端先定义用户看到的界面和交互。

产出：

- 页面路由。
- 主要状态：空态、加载态、失败态、成功态。
- 用户输入组件。
- 消息 / 内容展示组件。
- 是否需要乐观 UI。

要求：

- App Surface 不包含模型调用逻辑。
- App Surface 不拼 prompt。
- App Surface 不直接操作 AgentMemory。
- App Surface 只调用后端 App API。

### Step 2：定义 App 数据模型

后端定义 App 自己需要的数据表。

示例：

- 微博：`Post`、`Comment`、`Like`。
- 电话：`CallSession`、`CallTranscript`。
- 日历：`CalendarEvent`。
- 相册：`Photo`、`Album`、`PhotoMemory`。

要求：

- App 自有数据和 Agent 数据分离。
- App 表要带 `userId`，必要时带 `characterId`。
- 所有查询和写入必须做资源归属校验。
- 不要把 AgentRun、AgentMemory 当作 App 主业务表使用。

### Step 3：定义 AgentEvent

每个 Agent 感知的行为必须转换成标准 AgentEvent。

字段规范：

```ts
type AgentEvent = {
  traceId: string;
  userId: string;
  characterId: string | null;
  app: string;
  type: string;
  visibility: "private" | "public" | "system";
  source: "user" | "character" | "system" | "tool";
  content?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  idempotencyKey?: string;
};
```

命名规范：

- `app` 使用小写英文，例如 `wechat`、`weibo`、`phone`。
- `type` 使用 `{domain}.{action}` 或 `{object}.{actor_action}`。
- 用户主动行为建议带 `user_`，例如 `message.user_sent`、`post.user_created`。
- 系统行为建议带 `system_`，例如 `notification.system_received`。
- 工具行为建议带 `tool_`，例如 `weather.tool_returned`。

示例：

```json
{
  "app": "weibo",
  "type": "post.user_created",
  "visibility": "public",
  "source": "user",
  "content": "今天好想喝奶茶",
  "payload": {
    "postId": "post_xxx"
  },
  "idempotencyKey": "weibo:post:post_xxx"
}
```

要求：

- 每个用户输入事件必须有 `idempotencyKey`。
- `payload` 只放结构化引用，不放超大文本。
- `content` 可以为空，但如果为空，`payload` 必须能解释事件。
- 公开 App 的 `visibility` 不得误标为 `private`。

### Step 4：创建 AgentRun

App Adapter 记录 AgentEvent 后，创建或触发 AgentRun。

AgentRun 至少记录：

- `traceId`
- `userId`
- `characterId`
- `app`
- `eventType`
- `taskType`
- `status`
- `inputSummary`
- `contextSnapshot`

常见 `taskType`：

- `chat.reply`：需要角色回复。
- `memory.extract`：需要抽取长期记忆。
- `memory.merge`：需要合并记忆。
- `relationship.advance`：需要推进关系。
- `safety.check`：需要安全检查。
- `agent.plan`：需要规划动作。
- `tool.plan`：需要判断工具调用。

要求：

- 不要在业务 service 里绕过 AgentRun 直接调模型。
- 每次模型调用必须能追溯到 AgentRun。
- 每次工具调用必须能追溯到 AgentRun。

### Step 5：扩展 Context System

新 App 要明确上下文如何组装。

Context 分层：

```text
System Context
  平台规则、安全边界、输出格式要求

Character Context
  角色身份、故事背景、称呼、温度、关系阶段

User Context
  用户画像、偏好、边界、近期情绪

App Context
  当前 App、会话、可见性、消息类型、UI 限制

Memory Context
  检索到的长期记忆、共同事件、未完成承诺

Recent Context
  最近消息、最近事件、最近工具调用

Task Context
  本次任务目标、输出 schema、禁止事项
```

新 App 接入时必须定义：

- 当前 App 是 `private`、`public` 还是 `system`。
- 当前任务最多需要多少最近上下文。
- 当前任务最多读取多少条长期记忆。
- 哪些 memory scope 可以读取。
- 哪些 memory sensitivity 不允许进入上下文。
- 输出长度、风格、格式要求。

Context Budget 建议：

| 优先级 | 内容 |
| --- | --- |
| 1 | 安全规则和平台规则 |
| 2 | 当前角色身份 |
| 3 | 当前用户输入 |
| 4 | 当前 App 场景 |
| 5 | 最近 8-12 条相关事件 |
| 6 | 高权重长期记忆 |
| 7 | 未完成承诺 |
| 8 | 低权重偏好摘要 |

要求：

- 不要无限塞历史消息。
- 不要把私密记忆带入公开场景。
- 不要把工具原始输出无过滤塞给模型。
- `contextSnapshot` 必须记录摘要，方便回放和审计。

### Step 6：新增 Prompt 模板

每个任务都要使用版本化 prompt。

建议目录：

```text
apps/api/src/agents/prompts/
  chat-reply.prompt.ts
  memory-extract.prompt.ts
  memory-merge.prompt.ts
  action-plan.prompt.ts
  safety-check.prompt.ts
  {app}-{task}.prompt.ts
```

Prompt 模板结构：

```ts
export const xxxPrompt = {
  name: "weibo.post.react",
  version: "2026-06-14.1",
  render(context) {
    return [
      { role: "system", content: "..." },
      { role: "user", content: "..." },
    ];
  },
} as const;
```

要求：

- 每个 prompt 必须有 `name`。
- 每个 prompt 必须有 `version`。
- AgentRun 必须记录 `promptName` 和 `promptVersion`。
- Prompt 输出需要结构化时，必须有 schema 校验。
- 用户输入必须放在明确的 user message 或 data block 中。
- Prompt 不得信任用户输入里的“忽略以上规则”等内容。

### Step 7：接入 Memory System

新 App 不直接写旧 `Memory`，应统一走 `AgentMemoryService`。

记忆类型建议：

| 类型 | 用途 |
| --- | --- |
| `user_preference` | 用户偏好，例如喜欢草莓、奶茶 |
| `user_profile` | 用户基本信息，例如生日、作息 |
| `shared_event` | 共同经历 |
| `relationship_moment` | 关系节点 |
| `boundary` | 用户明确边界 |
| `promise` | 承诺和待办 |
| `emotion_pattern` | 情绪规律 |
| `character_private_state` | 角色自己的状态 |

写入原则：

- 只记长期有用的信息。
- 用户明确偏好优先记。
- 用户明确边界必须记。
- 承诺和待办必须记。
- 敏感信息默认不记，确需记时必须高敏标记。
- 冲突记忆不直接覆盖，要合并或降权。
- 每条记忆必须有来源 App 和来源事件。

Memory Draft 示例：

```ts
{
  scope: "character_private",
  type: "user_preference",
  content: "用户喜欢草莓口味",
  structured: {
    category: "food.flavor",
    value: "strawberry"
  },
  sourceApp: "wechat",
  sourceEventId: "event_xxx",
  confidence: 85,
  weight: 80,
  sensitivity: "low",
  visibility: "private"
}
```

要求：

- 微信、电话等私密 App 默认写 `private`。
- 微博等公开 App 写入前必须确认是否能公开引用。
- `boundary` 类型权重要高于普通偏好。
- 记忆写入必须经过 `AgentPolicyService.normalizeMemoryDraft()`。
- 记忆读取必须经过 Context visibility 过滤。

### Step 8：定义 AgentAction

AgentAction 是 Agent 对外输出的标准动作。

已有动作：

```ts
type AgentAction =
  | { type: "wechat.send_message"; conversationId: string; content: string; metadata?: Record<string, unknown> }
  | { type: "memory.write"; memory: AgentMemoryDraft }
  | { type: "memory.merge"; memoryId: string; patch: Record<string, unknown> }
  | { type: "relationship.update"; delta: number; reason: string }
  | { type: "tool.call"; toolName: string; input: Record<string, unknown> }
  | { type: "none"; reason: string };
```

新 App 如果需要新动作，应按以下方式命名：

```text
{app}.{verb_object}
```

示例：

- `weibo.create_draft`
- `weibo.send_comment`
- `phone.start_call`
- `phone.save_summary`
- `calendar.create_event`
- `album.create_memory`

要求：

- Action 必须可审计。
- Action 必须可校验权限。
- Action 必须由 `AgentActionExecutorService` 执行。
- 高风险 Action 必须要求用户确认。
- App Service 不应私自执行未注册的 AgentAction。

### Step 9：注册 Tool / MCP

如果新 App 需要工具能力，必须先注册工具定义。

工具定义字段：

```ts
type AgentToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema?: unknown;
  provider: "internal" | "mcp";
  riskLevel: "low" | "medium" | "high";
  readOnly: boolean;
  destructive: boolean;
  requiresUserConsent: boolean;
  timeoutMs: number;
  allowedApps?: string[];
  allowedTasks?: string[];
};
```

命名规范：

- 内部工具：`sendWechatMessage`、`writeMemory`。
- MCP 工具：`weather.get_current`、`calendar.create_event`、`shopping.create_order`。
- mock 工具：`mock.weather.get_current`。

要求：

- 默认不允许外部工具。
- 工具必须有输入 schema。
- 工具必须有超时。
- 工具必须标记风险等级。
- 工具必须声明是否只读。
- 写操作、花钱、发外部消息、真实日程创建必须用户确认。
- MCP 输出不能直接写入记忆，必须经过 Memory System。
- 所有 ToolCall 必须写入 `AgentToolCall`。

### Step 10：接入 Policy System

新 App 必须接入统一安全策略。

策略层：

```text
Input Safety
  用户输入检查

Context Safety
  检查是否把不该暴露的记忆放入上下文

Output Safety
  检查角色回复是否违规、越界、伪装真人

Tool Safety
  检查工具调用权限、风险、是否需要确认

Memory Safety
  检查敏感记忆是否允许存储
```

接入点：

- 用户输入进入 Agent 前：`assertInputAllowed()`。
- 角色卡 / App 内容保存前：`evaluateCharacterCard()` 或后续 App 专属评估函数。
- AI 输出落库前：`sanitizeOutput()`。
- 记忆写入前：`normalizeMemoryDraft()`。
- 工具调用前：`assertToolAllowed()`。

要求：

- 不允许 App 自己维护一套安全正则。
- 不允许公开 App 引用私密记忆。
- 不允许 Agent 声称自己是真实自然人。
- 不允许高风险工具无确认执行。
- 敏感心理、自伤、暴力、未成年人、胁迫内容必须降级或拦截。

### Step 11：接入 Observability

每次 Agent 行为都必须可追踪。

必须能查：

- 这次行为的 `traceId`。
- 触发事件是什么。
- 用了哪个 prompt 版本。
- 用了哪个模型。
- 命中了哪些记忆。
- 调用了哪些工具。
- 产生了哪些 actions。
- 失败在哪里。
- 为什么这次这么回复。

已有接口：

- `GET /api/agents/runs/:id/trace`
- `GET /api/agents/runs/:id/replay`
- `GET /api/agents/traces/:traceId`

要求：

- 每个新 App 的 AgentRun 必须有 `traceId`。
- 每个模型调用必须能关联到 AgentRun。
- 每个 ToolCall 必须能关联到 AgentRun。
- 每个 MemoryWrite 应能追溯到 source App / Event。
- 线上问题必须能通过 trace 回放定位。

## 6. 新 App 接入代码结构建议

以后新增 App 时，建议采用以下目录结构。

```text
apps/api/src/{app}/
  {app}.controller.ts
  {app}.service.ts
  {app}.schemas.ts
  {app}-mapper.ts

apps/web/src/pages/{app}/
  {App}List.tsx
  {App}Detail.tsx
  {App}Composer.tsx

apps/api/src/agents/prompts/
  {app}-{task}.prompt.ts
```

如果 App 需要专属上下文，可扩展：

```text
apps/api/src/agents/
  agent-context.service.ts
```

如果 App 需要新动作，可扩展：

```text
apps/api/src/agents/
  agent-action-executor.service.ts
  agent-tool-registry.service.ts
```

如果 App 需要新共享类型，可扩展：

```text
packages/shared/src/index.ts
```

## 7. 接入示例：微博 App

### 7.1 用户发微博

用户行为：

```text
用户在微博 App 发动态：今天好想喝奶茶
```

App Adapter：

```text
WeiboService.createPost()
  -> 校验用户身份
  -> 创建 Post
  -> recordAgentEvent({
       app: "weibo",
       type: "post.user_created",
       visibility: "public",
       source: "user",
       content: "今天好想喝奶茶",
       payload: { postId },
       idempotencyKey: `weibo:post:${postId}`
     })
  -> AgentRuntime.handleEvent()
```

Agent 处理：

```text
Context System
  -> 读取角色身份
  -> 读取可公开引用的记忆
  -> 读取近期微博事件

Prompt System
  -> 使用 weibo.post.react@version

Memory System
  -> 抽取 user_preference: 用户想喝奶茶

Policy System
  -> 检查公开场景不能引用微信私密暧昧内容

Action
  -> 可选：weibo.create_draft
  -> 可选：memory.write
```

效果：

```text
微信里用户说喜欢草莓
微博里用户说想喝奶茶
未来微信聊天时，角色能自然说：下次给你点草莓奶茶。
```

### 7.2 微博公开场景限制

微博是公开场景，不能这样回复：

```text
宝宝，昨晚你在微信里撒娇说想我了，我给你买奶茶。
```

原因：

- 引用了微信私密记忆。
- 公开暴露亲密关系。
- 违反 App visibility 边界。

应该改成：

```text
今天适合喝点甜的，奶茶确实很治愈。
```

## 8. 接入示例：电话 App

用户行为：

```text
用户和角色完成一次电话
```

AgentEvent：

```json
{
  "app": "phone",
  "type": "call.ended",
  "visibility": "private",
  "source": "user",
  "content": "通话摘要文本",
  "payload": {
    "callId": "call_xxx",
    "durationSec": 180
  },
  "idempotencyKey": "phone:call:call_xxx"
}
```

Agent 任务：

- `memory.extract`：抽取用户偏好、情绪、承诺。
- `relationship.advance`：根据通话质量推进关系。
- `chat.reply`：可选，生成通话后的微信 follow-up。

记忆示例：

```text
用户最近工作压力大。
用户喜欢睡前听低声安慰。
角色答应明天提醒用户喝水。
```

## 9. 接入示例：日历 / 礼物类高风险功能

如果 App 需要真实创建日程、下单、发外部消息，必须走高风险授权。

错误做法：

```text
Agent 觉得用户想喝奶茶 -> 自动下单
```

正确做法：

```text
Agent 觉得用户想喝奶茶
  -> 生成 tool.plan
  -> 判断 shopping.create_order 是 high risk
  -> 返回确认卡片：要不要帮你下单草莓奶茶？
  -> 用户确认
  -> ToolCall 执行
  -> 记录 AgentToolCall
  -> 写入 shared_event 或 promise
```

要求：

- 高风险工具必须有用户确认。
- 用户确认必须有可审计记录。
- 金钱、外部消息、真实世界行为必须可取消或可确认。

## 10. 现有 App 新功能接入 SOP

如果不是新增 App，而是在现有 App 里加新功能，也按同样流程。

### 10.1 判断是否是新 AgentEvent

示例：

- 微信新增“发送图片”：新增 `message.image_sent`。
- 微信新增“语音消息”：新增 `message.voice_sent`。
- 联系人新增“角色状态修改”：新增 `character.profile_updated`。
- 设置新增“用户偏好修改”：新增 `settings.preference_updated`。

### 10.2 判断是否是新 AgentAction

示例：

- 微信新增“发送图片回复”：新增 `wechat.send_image`。
- 电话新增“保存通话总结”：新增 `phone.save_summary`。
- 相册新增“生成回忆”：新增 `album.create_memory`。

### 10.3 判断是否需要新 Prompt

以下情况需要新 Prompt：

- 输出格式变了。
- 任务目标变了。
- App 场景变了。
- 需要结构化 JSON 输出。
- 需要调用工具前规划。

以下情况不一定需要新 Prompt：

- 只是 UI 样式变化。
- 只是列表筛选。
- 只是字段展示。

### 10.4 判断是否需要新 Memory 类型

以下情况可能需要：

- 新功能产生新类型长期信息。
- 旧类型无法准确表达。
- 需要新的合并策略。
- 需要新的 visibility 规则。

新增 Memory 类型前必须先确认：

- 是否可以复用 `user_preference`。
- 是否可以复用 `shared_event`。
- 是否可以复用 `promise`。
- 是否可以复用 `boundary`。

## 11. 最小开发闭环

每个新 App / 新功能至少完成以下闭环。

### 11.1 后端闭环

- App API 可创建或接收用户行为。
- 用户行为可生成 AgentEvent。
- AgentEvent 可创建 AgentRun。
- AgentRun 可记录 promptName / promptVersion。
- AgentRun 可记录 contextSnapshot。
- AgentAction 可被执行。
- AiRequest / ToolCall / MemoryWrite 可关联 AgentRun。

### 11.2 前端闭环

- 页面可触发用户行为。
- 页面有加载态。
- 页面有失败态。
- 页面有成功态。
- 如果是聊天/动态类功能，要支持乐观 UI 或明确等待态。
- 安全拦截要给用户可理解提示。

### 11.3 记忆闭环

- 用户输入可抽取记忆。
- 重复记忆可合并。
- 冲突记忆可降权或禁用。
- 后续 Agent 回复能读取相关记忆。
- 公开场景不会读取私密记忆。

### 11.4 安全闭环

- 输入安全检查通过。
- 输出安全检查通过。
- 记忆安全检查通过。
- 工具风险检查通过。
- 高风险操作需要确认。
- 失败时有降级文案。

### 11.5 可观测闭环

- 可以通过 `runId` 查询 trace。
- 可以通过 `traceId` 查询完整链路。
- 可以看到 prompt 版本。
- 可以看到 contextSnapshot。
- 可以看到 memoryHits。
- 可以看到 toolCalls。
- 可以看到 actions。
- 可以看到 why-this-reply。

## 12. 验收清单

### 12.1 产品验收

- App 体验符合场景定位。
- 角色表达符合角色卡。
- 角色能自然引用应该引用的记忆。
- 角色不会在公开场景暴露私密记忆。
- 失败和等待状态用户可理解。

### 12.2 技术验收

- `pnpm check` 通过。
- 新增 API 有鉴权。
- 新增 API 有资源归属校验。
- 新增 AgentEvent 有 idempotencyKey。
- AgentRun 状态正确流转。
- Prompt 有 name / version。
- Memory 写入包含 sourceApp / sourceEventId。
- ToolCall 记录输入、输出、耗时、错误。
- Policy 覆盖输入、输出、工具、记忆。
- Observability 接口可查。

### 12.3 安全验收

- 未成年人、胁迫、暴力、自伤、违法内容可拦截或降级。
- 高风险工具不能无确认执行。
- 私密记忆不能进入公开场景。
- 外部 MCP 工具不能默认获得用户凭证。
- API Key 和外部凭证必须加密或隔离。

### 12.4 回归验收

- 不影响微信聊天。
- 不影响联系人创建和编辑。
- 不影响设置里的模型配置。
- 不影响桌面 App 入口。
- 不影响已有记忆读取。
- 不影响 Docker 本地启动。

## 13. 常见错误

### 错误 1：App 里直接调 LLM

错误：

```text
WeiboService -> ModelProviderService.generateChat()
```

正确：

```text
WeiboService -> AgentEvent -> AgentRuntime -> PromptSystem -> ModelProviderService
```

### 错误 2：App 里直接拼 Prompt

错误：

```text
PhoneService.buildPrompt()
```

正确：

```text
Prompt 模板放到 apps/api/src/agents/prompts/
AgentPromptService 统一渲染
AgentRun 记录 promptName / promptVersion
```

### 错误 3：App 里直接写长期记忆

错误：

```text
prisma.memory.create()
```

正确：

```text
AgentMemoryService.writeDraft()
AgentPolicyService.normalizeMemoryDraft()
AgentRun / AgentEvent 记录来源
```

### 错误 4：公开场景引用私密记忆

错误：

```text
微博回复里提到微信私聊内容。
```

正确：

```text
Context System 按 visibility 过滤，公开场景只使用 public 或允许公开引用的记忆。
```

### 错误 5：高风险工具自动执行

错误：

```text
Agent 自动下单、自动发外部消息、自动创建真实日程。
```

正确：

```text
Tool Registry 标记 high risk。
Policy 要求 userConsented。
用户确认后再执行。
AgentToolCall 全量记录。
```

### 错误 6：没有 trace，出了问题查不清

错误：

```text
只保存最终消息，不保存 AgentRun / Prompt / Context / ToolCall。
```

正确：

```text
每次 Agent 行为都有 traceId。
Observability 能查 why-this-reply。
```

## 14. 推荐任务拆分模板

新增 App 可以按以下任务拆给工程师。

### 任务 A：产品和协议设计

- 定义 App 场景。
- 定义 AgentEvent。
- 定义 AgentAction。
- 定义 Memory 写入规则。
- 定义 Tool 权限。
- 定义安全边界。

### 任务 B：后端 App Adapter

- 建 App Module / Controller / Service。
- 建 App 数据表。
- 实现鉴权和资源归属校验。
- 实现 AgentEvent 记录。
- 实现 AgentRun 创建。

### 任务 C：Agent 接入

- 扩展 Context。
- 新增 Prompt 模板。
- 接入 Memory。
- 注册 Tool。
- 接入 Policy。
- 接入 Observability。

### 任务 D：Action Executor

- 新增 AgentAction 类型。
- 实现 Action 执行。
- 写入 ToolCall 或业务表。
- 处理失败回滚和降级。

### 任务 E：前端 App Surface

- 实现页面。
- 实现 API 调用。
- 实现加载态、失败态、成功态。
- 实现安全提示和确认卡片。

### 任务 F：测试与验收

- 单元测试。
- 接口测试。
- Agent trace 验证。
- Memory 写入 / 检索验证。
- Policy 拦截验证。
- Docker 本地验证。

## 15. 最终原则

后续团队开发新 App 时，只需要记住一句话：

```text
App 是角色生活的场景，Agent 是角色的大脑，Memory 是角色的长期关系，Tool 是角色的能力边界，Policy 是安全护栏，Observability 是排障黑盒。
```

因此：

- 新 App 接入的是 Agent 操作系统，不是单独接一个 LLM。
- 新功能沉淀的是标准事件和标准动作，不是临时 prompt。
- 新记忆进入的是统一 Memory System，不是散落在各 App 里的字段。
- 新工具进入的是 Tool Registry / MCP，不是业务代码随手调用外部 API。
- 新风险进入的是 Policy System，不是各模块各写一套判断。
- 新问题进入的是 Observability，不是靠日志猜。
