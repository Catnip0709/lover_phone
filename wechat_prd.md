# 微信 App PRD 与接入执行方案

版本：v0.1  
状态：需求设计与工程拆解版  
适用范围：小手机产品内的微信 App 升级，包括聊天、朋友圈、我、消息组件、钱包红包，以及 Agent / Memory / Policy / Observability 接入  
目标读者：产品、前端、后端、Agent 工程师、测试工程师  
关联文档：`README.md`、`new_app_sop.md`

## 1. 背景与目标

当前微信 App 只完成了“微信聊天 MVP”：

- 桌面微信入口。
- 会话列表。
- 单聊详情。
- 文本消息。
- 用户消息乐观 UI。
- 角色正在输入中。
- 未读数和桌面红点。
- 角色头像规则。
- 文本聊天接入 Character Agent Runtime。

下一阶段目标是把微信从“聊天页”升级成完整社交 App Surface：

```text
微信 App
  - 微信
    - 会话列表
    - 单聊详情
    - 多类型消息组件

  - 朋友圈
    - 用户发朋友圈
    - 角色发朋友圈
    - 点赞
    - 评论 / 回复
    - 定位
    - 照片
    - 提到某人
    - 可见范围，第一期不做屏蔽某人
    - 朋友圈事件进入角色 Agent 记录

  - 我
    - 微信头像
    - 微信名称
    - 个性签名
    - 钱包余额
    - 朋友圈隐私配置
```

最终体验目标：

- 用户感觉自己在使用一个真实的微信式社交 App。
- 角色不只在聊天框里存在，也能出现在朋友圈、点赞、评论、红包、定位等场景里。
- 朋友圈成为角色生活感和跨场景记忆的重要来源。
- 所有角色智能行为统一走 Agent 架构，不允许各功能单独接 LLM。

## 2. 设计原则

### 2.1 产品原则

- 保持 iOS Native、Soft UI、浅色磨砂、真实社交感。
- 微信是私密亲密场景，朋友圈是半公开社交场景。
- 用户和角色都可以成为内容作者。
- 角色行为要自然，不要像系统机器人。
- 朋友圈内容不一定都写入长期记忆，只写长期有价值的信息。
- 钱包、红包、转账短期都是虚拟资产，不接真实支付。
- 高风险动作必须用户确认。

### 2.2 技术原则

遵循 `new_app_sop.md`：

- App 不直接写大模型逻辑。
- App 不直接拼复杂 prompt。
- App 不直接决定长期记忆怎么写。
- App 不直接调用外部工具。
- App 只负责场景展示、用户输入、App 自有数据落库。
- 角色智能统一交给 Harness、Runtime、Context、Prompt、Memory、Policy、Tool、Observability。

标准链路：

```text
微信内用户行为
  -> Wechat Adapter 校验权限和资源归属
  -> Harness 标准化为 AgentEvent
  -> AgentRuntime 创建 / 更新 AgentRun
  -> Context System 组装上下文
  -> Prompt System 选择版本化模板
  -> Model / Tool / MCP 执行
  -> Memory System 写入或合并记忆
  -> Policy System 做安全检查
  -> AgentActionExecutor 执行业务动作
  -> 微信 App Surface 展示结果
  -> Observability 记录 trace / replay / why-this-reply
```

## 3. 当前能力盘点

### 3.1 已有能力

| 模块 | 当前状态 |
| --- | --- |
| 微信入口 | 已有，桌面点击微信进入会话列表 |
| 会话列表 | 已有，展示角色、最后消息、未读数、时间 |
| 单聊详情 | 已有，支持文本消息 |
| 文本消息 | 已有，用户发文本，角色回文本 |
| 乐观 UI | 已有，用户消息立即展示 |
| 正在输入 | 已有，等待 LLM 时展示 |
| 头像 | 已有，上传头像优先，否则角色名尾字 + 稳定色 |
| 未读红点 | 已有，桌面红点基于微信内部未读数 |
| Agent 接入 | 已有，文本聊天走 AgentRuntime |
| Memory 接入 | 已有，聊天内容可写入 AgentMemory |
| Policy 接入 | 已有，输入、输出、记忆、工具安全已收口 |
| Observability | 已有，可查 AgentRun trace / replay |

### 3.2 缺失能力

| 模块 | 当前状态 |
| --- | --- |
| 微信内部底部 Tab | 未做 |
| 朋友圈 | 未做 |
| 我页面 | 未做 |
| 微信个人资料 | 未做 |
| 钱包余额 | 未做 |
| 图片消息 | 未做 |
| 语音消息 | 未做 |
| 定位消息 | 未做 |
| 红包消息 | 未做 |
| 转账消息 | 未做 |
| 公众号文章转发 | 未做 |
| 表情包 | 未做 |
| 引用回复 | 未做 |
| 撤回 | 未做 |
| 朋友圈点赞 / 评论 | 未做 |
| 角色主动发朋友圈 | 未做 |
| 角色自动点赞 / 评论朋友圈 | 未做 |
| 朋友圈可见范围 | 未做 |
| 提到某人 | 未做 |
| 屏蔽某人 | 暂不做 |

结论：

```text
当前微信是聊天 MVP，不是完整微信 App。
```

## 4. 信息架构

### 4.1 一级结构

```text
/messages
  -> 微信 App Shell
     - tab=chat
     - tab=moments
     - tab=me
```

建议后续路由：

```text
/messages
  微信 App Shell，默认进入微信 Tab

/messages/:conversationId
  单聊详情，保留沉浸聊天页，可从微信 Tab 进入

/messages/moments/new
  发布朋友圈

/messages/moments/:postId
  朋友圈详情，可选

/messages/me/edit
  编辑微信个人资料
```

也可以在 React 内部用 query 或 state 控制 Tab，但 URL 路由更利于后续分享、回退和调试。

### 4.2 底部 Tab

Tab：

- 微信
- 朋友圈
- 我

展示规则：

- 微信 App Shell 页面底部固定 Tab。
- 单聊详情不展示底部 Tab，保持真实聊天沉浸感。
- 从单聊返回后回到微信 Tab。
- 朋友圈和我页面展示底部 Tab。

### 4.3 视觉原则

- 继续沿用当前全屏手机 App 体验，不出现手机边框。
- 日间亮色，不使用夜间模式。
- 背景使用浅粉、白、浅蓝渐变。
- 卡片使用浅色磨砂和柔和阴影。
- 朋友圈信息流要比聊天页更“生活感”，不要做成后台列表。
- 钱包余额可以更精致，但不能像真实金融 App 那样沉重。

## 5. 角色与用户模型

### 5.1 参与方

微信内有两类主体：

```ts
type WechatActorType = "user" | "character";
```

用户：

- 当前登录用户在虚拟微信中的身份。
- 可以发消息、发朋友圈、点赞、评论、收发红包、转账。

角色：

- 联系人 App 中创建的 AI Character。
- 可以发消息、点赞、评论、发朋友圈、收发红包、转账。
- 角色行为由 Agent 决定或由用户触发。

### 5.2 微信个人资料

建议新增 `WechatProfile`。

字段建议：

```ts
type WechatProfile = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  wechatId: string | null;
  bio: string | null;
  region: string | null;
  walletBalanceCents: number;
  defaultMomentVisibility: "public" | "private" | "partial";
  createdAt: string;
  updatedAt: string;
};
```

说明：

- `WechatProfile` 不等于系统账号。
- 系统账号用于登录和模型配置。
- 微信个人资料用于虚拟微信身份展示。
- 钱包余额是虚拟余额，不代表真实资产。

## 6. 微信 Tab

### 6.1 会话列表

当前已有：

- 角色头像。
- 角色昵称。
- 最后一条消息。
- 最后消息时间。
- 未读数。

后续增强：

- 搜索会话。
- 置顶会话。
- 消息免打扰。
- 删除会话。
- 最近一条消息支持不同类型预览。

消息预览规则：

| 消息类型 | 预览 |
| --- | --- |
| text | 文本内容 |
| image | `[图片]` |
| voice | `[语音] 8''` |
| location | `[位置] 三里屯太古里` |
| red_packet | `[红包] 今天也要开心` |
| transfer | `[转账] ¥5.20` |
| system | 系统文案 |
| moment_share | `[朋友圈] xxx` |

### 6.2 单聊详情

当前已有：

- 文本消息发送。
- AI 文本回复。
- 正在输入中。
- 头像与气泡对齐。
- 中间滚动。

后续增强：

- 多类型消息渲染。
- 输入栏扩展面板。
- 表情面板。
- 加号面板。
- 语音输入模式，第一期只做 Mock 展示，不接录音、ASR、TTS 或真实音频播放。
- 长按消息菜单。
- 引用回复。
- 撤回。

### 6.3 消息组件化

前端建议抽象：

```text
MessageBubble
  - TextMessage
  - ImageMessage
  - VoiceMessage
  - LocationMessage
  - RedPacketMessage
  - TransferMessage
  - SystemMessage
  - MomentShareMessage
  - OfficialAccountArticleMessage
```

后端消息类型建议：

```ts
type WechatMessageType =
  | "text"
  | "image"
  | "voice"
  | "location"
  | "red_packet"
  | "transfer"
  | "system"
  | "moment_share"
  | "official_account_article";
```

现有 `Message.type` 可以继续复用，差异字段放在 `payload`。

组件样式要求：

- `VoiceMessage` 第一期是 Mock 语音，不接真实音频；默认展示为语音条、时长、播放图标、语音转文字内容。
- `LocationMessage` 必须是地图卡片样式，不允许只显示纯文本；卡片包含地点名、地址、浅色地图底纹、定位 pin、可选距离文案。
- `RedPacketMessage` 必须是红包卡片样式，不允许只显示纯文本；卡片包含红包封面、祝福语、金额状态、领取状态。
- `TransferMessage` 必须是转账卡片样式，不允许只显示纯文本；卡片包含金额、备注、收款状态和钱包感视觉。
- `OfficialAccountArticleMessage` 是公众号文章转发卡片；第一期不需要可点击打开，只展示文章封面、公众号名、标题、摘要和“公众号文章”标识。

### 6.4 消息 Payload 示例

文本：

```json
{
  "type": "text",
  "content": "今天有点想你"
}
```

图片：

```json
{
  "type": "image",
  "content": null,
  "payload": {
    "imageUrl": "https://...",
    "width": 1080,
    "height": 1440,
    "caption": "路过时拍给你看"
  }
}
```

语音：

```json
{
  "type": "voice",
  "content": "今天累不累？",
  "payload": {
    "durationSec": 8,
    "audioUrl": null,
    "transcript": "今天累不累？",
    "mock": true
  }
}
```

第一期说明：

- `audioUrl` 固定为 `null` 或不传。
- 不接真实录音、播放、ASR、TTS。
- 前端以 `transcript` 展示“语音转文字”。
- Agent 只读取 `transcript`，不读取音频。

定位：

```json
{
  "type": "location",
  "content": "我在这里",
  "payload": {
    "name": "三里屯太古里",
    "address": "北京市朝阳区",
    "latitude": 39.93,
    "longitude": 116.45
  }
}
```

红包：

```json
{
  "type": "red_packet",
  "content": "给你一个小红包",
  "payload": {
    "amountCents": 520,
    "currency": "CNY",
    "status": "unclaimed",
    "blessing": "今天也要开心"
  }
}
```

转账：

```json
{
  "type": "transfer",
  "content": "转账给你",
  "payload": {
    "amountCents": 520,
    "currency": "CNY",
    "status": "pending",
    "note": "买杯奶茶"
  }
}
```

公众号文章转发：

```json
{
  "type": "official_account_article",
  "content": "转发了一篇公众号文章",
  "payload": {
    "accountName": "深夜怪东西研究所",
    "title": "凌晨三点，月亮为什么偷偷给猫发消息",
    "summary": "一篇看起来很认真、其实很奇怪的公众号文章。",
    "coverUrl": null,
    "articleUrl": "mock://official-account/article/strange-moon-cat",
    "clickable": false
  }
}
```

第一期说明：

- 公众号文章转发只是消息样式，不需要点开详情页。
- `articleUrl` 只作为展示用 mock 字段，不做跳转。
- 角色可以主动给用户转发“奇奇怪怪的公众号链接”，用于增强生活感和人设表达。

### 6.5 消息 AgentEvent

| 用户行为 | AgentEvent.type | taskType | 是否写记忆 |
| --- | --- | --- | --- |
| 用户发文本 | `message.user_sent` | `chat.reply` | 是 |
| 用户发图片 | `message.image_user_sent` | `chat.reply` / `memory.extract` | 可选 |
| 用户发语音 | `message.voice_user_sent` | `chat.reply` / `memory.extract` | 是，基于 transcript |
| 用户发定位 | `message.location_user_sent` | `chat.reply` / `memory.extract` | 可选 |
| 用户发红包 | `message.red_packet_user_sent` | `relationship.advance` | 可选 |
| 用户收红包 | `message.red_packet_user_claimed` | `relationship.advance` | 可选 |
| 角色转发公众号文章 | `message.official_account_article_character_sent` | `agent.plan` | 可选 |

要求：

- 每个消息事件必须有 `idempotencyKey`。
- 语音第一期是 Mock，进入 Agent 前必须有 transcript，不接真实音频能力。
- 图片短期只做 UI，不强制视觉理解。
- 定位可作为结构化 payload，不直接调用地图，但前端必须渲染为位置卡片。
- 红包 / 转账必须走 Policy。
- 公众号文章转发第一期只做样式和 Agent 行为记录，不做真实网页打开。

### 6.6 消息 AgentAction

建议新增：

```ts
type WechatMessageAgentAction =
  | {
      type: "wechat.send_official_account_article";
      conversationId: string;
      characterId: string;
      accountName: string;
      title: string;
      summary: string;
      coverUrl?: string | null;
      articleUrl?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "wechat.send_mock_voice";
      conversationId: string;
      characterId: string;
      transcript: string;
      durationSec: number;
      metadata?: Record<string, unknown>;
    };
```

要求：

- `wechat.send_mock_voice` 只生成 Mock 语音消息，不生成真实 `audioUrl`。
- `wechat.send_official_account_article` 用于角色主动转发奇怪、有趣、安慰型或人设相关的公众号文章。
- 所有消息 Action 必须校验会话归属，避免角色向不属于当前用户的会话写消息。
- 公众号文章标题和摘要不能伪装成真实新闻、医疗建议、金融建议或违法内容。

## 7. 朋友圈 Tab

### 7.1 朋友圈目标

朋友圈是微信 App 的社交信息流，也是角色 Agent 观察用户生活、表达自己生活感的重要入口。

支持：

- 用户发朋友圈。
- 角色发朋友圈。
- 用户点赞角色朋友圈。
- 角色点赞用户朋友圈。
- 用户评论角色朋友圈。
- 角色评论用户朋友圈。
- 评论回复。
- 定位。
- 照片。
- 提到某人。
- 可见范围。
- 内容进入 AgentEvent。
- 长期有价值内容进入 AgentMemory。

### 7.2 朋友圈基础功能

发朋友圈：

- 文字内容。
- 0-9 张照片。
- 定位文本。
- 提到某人。
- 可见范围，第一期只支持公开和仅自己可见。
- 暂不做屏蔽某人。

点赞：

- 用户可点赞角色动态。
- 角色可点赞用户动态。
- 同一主体对同一动态只能点赞一次。
- 再次点击取消点赞。

评论：

- 用户可评论角色动态。
- 角色可评论用户动态。
- 支持回复某条评论。
- 评论可删除，第一期可只允许删除自己的评论。

列表：

- 按时间倒序。
- 用户和所有角色动态混排，不按当前角色过滤。
- 显示作者头像、昵称、发布时间、内容、图片、定位、点赞和评论。

### 7.3 朋友圈可见范围

建议枚举：

```ts
type MomentVisibility = "public" | "private" | "partial";
```

含义：

- `public`：用户和所有角色可见。
- `private`：仅自己可见，不触发角色互动。
- `partial`：预留给后续指定可见 / 不可见能力，第一期不实现。

预留规则：

```ts
type MomentVisibilityRule = {
  postId: string;
  blockedCharacterIds: string[];
  mentionedCharacterIds: string[];
};
```

第一期可以简化：

- 支持公开。
- 支持仅自己。
- 不做屏蔽某个角色。
- 提到某人只做展示和 AgentEvent，不做复杂通知。

### 7.4 朋友圈数据模型

建议新增：

```prisma
model WechatProfile {
  id                     String   @id @default(uuid())
  userId                 String   @unique
  displayName            String   @db.VarChar(40)
  avatarUrl              String?
  wechatId               String?  @db.VarChar(40)
  bio                    String?
  region                 String?  @db.VarChar(80)
  walletBalanceCents     Int      @default(0)
  defaultMomentVisibility String  @db.VarChar(20)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

```prisma
model MomentPost {
  id             String   @id @default(uuid())
  userId         String
  authorType     String   @db.VarChar(20)
  authorUserId   String?
  authorCharacterId String?
  content        String?
  locationName   String?
  locationAddress String?
  visibility     String   @db.VarChar(20)
  payload        Json?
  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId, createdAt])
  @@index([authorCharacterId, createdAt])
}
```

```prisma
model MomentMedia {
  id        String   @id @default(uuid())
  postId    String
  type      String   @db.VarChar(20)
  url       String
  width     Int?
  height    Int?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  @@index([postId])
}
```

```prisma
model MomentLike {
  id                String   @id @default(uuid())
  postId            String
  userId            String
  actorType         String   @db.VarChar(20)
  actorUserId       String?
  actorCharacterId  String?
  createdAt         DateTime @default(now())

  @@unique([postId, actorType, actorUserId, actorCharacterId])
  @@index([postId])
}
```

```prisma
model MomentComment {
  id                String   @id @default(uuid())
  postId            String
  userId            String
  actorType         String   @db.VarChar(20)
  actorUserId       String?
  actorCharacterId  String?
  replyToCommentId  String?
  content           String
  deletedAt         DateTime?
  createdAt         DateTime @default(now())

  @@index([postId, createdAt])
  @@index([replyToCommentId])
}
```

```prisma
model MomentVisibilityRule {
  id          String   @id @default(uuid())
  postId      String
  type        String   @db.VarChar(20)
  characterId String
  createdAt   DateTime @default(now())

  @@index([postId])
  @@index([characterId])
}
```

说明：

- `authorType` / `actorType` 支持 `user` 和 `character`。
- `userId` 是资源归属字段，所有查询必须带 `userId`。
- 第一阶段图片使用 URL 字段和预览能力，暂不做上传对象存储的完整链路。
- 数据结构预留对象存储 URL，后续可以迁移到真实对象存储。

### 7.5 朋友圈 AgentEvent

| 行为 | AgentEvent.type | source | visibility | taskType |
| --- | --- | --- | --- | --- |
| 用户发朋友圈 | `moments.post.user_created` | user | public/private | `memory.extract` / `agent.plan` |
| 用户删除朋友圈 | `moments.post.user_deleted` | user | system | `none` |
| 用户点赞角色动态 | `moments.like.user_created` | user | public | `relationship.advance` |
| 用户评论角色动态 | `moments.comment.user_created` | user | public | `chat.reply` / `memory.extract` |
| 角色发朋友圈 | `moments.post.character_created` | character | public/private | `agent.plan` |
| 角色点赞用户动态 | `moments.like.character_created` | character | public | `relationship.advance` |
| 角色评论用户动态 | `moments.comment.character_created` | character | public | `chat.reply` |

示例：

```json
{
  "app": "wechat",
  "type": "moments.post.user_created",
  "visibility": "public",
  "source": "user",
  "content": "今天好想喝奶茶",
  "payload": {
    "postId": "post_xxx",
    "mediaCount": 1,
    "locationName": "公司楼下",
    "mentionedCharacterIds": ["char_xxx"],
    "blockedCharacterIds": []
  },
  "idempotencyKey": "wechat:moments:post:post_xxx"
}
```

### 7.6 朋友圈 AgentAction

建议新增：

```ts
type WechatMomentAgentAction =
  | {
      type: "wechat.moments.like";
      postId: string;
      characterId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "wechat.moments.comment";
      postId: string;
      characterId: string;
      content: string;
      replyToCommentId?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "wechat.moments.create_post";
      characterId: string;
      content: string;
      mediaIds?: string[];
      locationName?: string;
      visibility: "public" | "private" | "partial";
      metadata?: Record<string, unknown>;
    };
```

要求：

- 所有 Action 必须由 `AgentActionExecutorService` 执行。
- 执行前校验 `userId`、`characterId`、`postId` 归属。
- 写入后记录 `AgentRun.actions`。
- 角色评论必须经过 `AgentPolicyService.sanitizeOutput()`。
- 角色发朋友圈必须经过公开场景 visibility 检查。

### 7.7 朋友圈进入记忆的规则

不是所有朋友圈都写入长期记忆。

一定记录 AgentEvent：

- 发动态。
- 点赞。
- 评论。
- 回复。
- 删除。

可写入 AgentMemory：

| 内容 | Memory 类型 | 示例 |
| --- | --- | --- |
| 明确偏好 | `user_preference` | 用户喜欢奶茶、草莓、雨天 |
| 明确边界 | `boundary` | 不喜欢某种称呼 |
| 共同经历 | `shared_event` | 一起约定看电影 |
| 情绪规律 | `emotion_pattern` | 工作日晚上容易累 |
| 承诺待办 | `promise` | 明天提醒喝水 |
| 关系节点 | `relationship_moment` | 用户主动公开提到角色 |

不建议写入长期记忆：

- 没有长期价值的日常随拍。
- 含敏感身份信息的内容。
- 用户明显是在玩梗或反讽但无法判断真实性的内容。
- 被用户设置为仅自己可见的内容。

公开场景限制：

- 朋友圈是半公开场景。
- 角色评论用户朋友圈时，不能引用微信私聊里的私密暧昧内容。
- 角色发朋友圈时，不能暴露用户私密聊天、敏感偏好、成年内容。

## 8. 我 Tab

### 8.1 功能目标

“我”是用户在虚拟微信里的个人身份页，不是系统账号页。

支持：

- 微信头像。
- 微信名称。
- 微信号。
- 个性签名。
- 地区。
- 钱包余额。
- 朋友圈默认可见范围。
- 未来红包 / 转账 / 钱包账单入口。

### 8.2 页面结构

```text
我
  - 顶部个人卡片
    - 头像
    - 微信名称
    - 微信号
    - 个性签名

  - 钱包卡片
    - 余额
    - 红包记录，后续
    - 转账记录，后续

  - 朋友圈设置
    - 默认可见范围
    - 屏蔽角色管理，暂不做

  - 编辑资料入口
```

### 8.3 钱包余额

第一期：

- 只展示虚拟余额。
- 初始余额为 `0`。
- 不接真实支付。
- 不允许提现。

第二期：

- 红包扣减虚拟余额。
- 收红包增加虚拟余额。
- 转账扣减 / 增加虚拟余额。
- 红包 / 转账支持用户和角色互相发送。
- 钱包流水记录。

高风险边界：

- 即使是虚拟余额，Agent 也不能无确认自动发红包或转账。
- 钱包相关行为必须写入审计记录。
- UI 上要避免让用户误解为真实资产。

## 9. Agent 接入设计

### 9.1 App 场景定义

微信整体是私密 App，但内部有不同 visibility：

| Surface | visibility | 说明 |
| --- | --- | --- |
| 单聊 | private | 私密亲密聊天 |
| 朋友圈公开动态 | public | 半公开社交场景 |
| 朋友圈仅自己 | private | 不触发角色互动 |
| 我页面 | private/system | 用户资料配置 |
| 钱包 | private/system | 高敏感虚拟资产 |

### 9.2 Context 边界

单聊可读取：

- 当前角色身份。
- 当前角色私密记忆。
- 当前会话最近消息。
- 用户偏好和边界。
- 朋友圈里可被当前角色看到的相关事件。

朋友圈角色评论可读取：

- 当前动态内容。
- 当前动态可见范围。
- 当前角色身份和公开表达风格。
- 与动态相关的公开 / 可引用记忆。
- 不可读取或不可输出私密聊天细节。

角色发朋友圈可读取：

- 角色身份和状态。
- 角色近期互动摘要。
- 可公开表达的 shared_event。
- 不可读取高敏感记忆。
- 不可输出用户私密信息。

钱包红包可读取：

- 当前虚拟余额。
- 红包/转账动作上下文。
- 关系阶段。
- 必须经过 Tool / Policy 风险确认。

### 9.3 Prompt 模板建议

新增模板：

```text
apps/api/src/agents/prompts/
  wechat-chat-reply.prompt.ts           已有 chat.reply.wechat 可复用或迁移
  wechat-moments-comment.prompt.ts      角色评论朋友圈
  wechat-moments-post.prompt.ts         角色发朋友圈
  wechat-moments-memory.prompt.ts       朋友圈记忆抽取
  wechat-red-packet-plan.prompt.ts      红包/转账动作规划
```

命名建议：

```text
chat.reply.wechat
moments.comment.wechat
moments.post.wechat
memory.extract.wechat_moments
tool.plan.wechat_wallet
```

要求：

- 每个 prompt 必须有 `name` 和 `version`。
- AgentRun 必须记录 prompt 版本。
- 朋友圈公开输出必须明确禁止引用私密聊天细节。
- 钱包红包相关 prompt 只能生成建议或待用户确认 action，不能直接执行高风险动作。

### 9.4 Memory 写入规则

朋友圈来源记忆：

```ts
{
  sourceApp: "wechat",
  sourceEventId: "agent_event_id",
  type: "user_preference",
  content: "用户最近想喝奶茶",
  scope: "character_private",
  visibility: "private" | "public",
  confidence: 80,
  weight: 70
}
```

规则：

- 单聊来源默认 `private`。
- 朋友圈公开动态可根据内容写 `public` 或 `private`。
- 朋友圈仅自己可见默认不写入角色记忆。
- 第一阶段不做屏蔽某人；公开动态默认可被所有角色用于 Agent 判断，但写入记忆仍需按价值和敏感度过滤。
- 第一阶段只写角色私有记忆 `character_private`，不写用户全局画像 `user_global`。
- 用户全局画像留作后续能力，避免不同角色过早共享用户隐私导致串戏。
- `boundary` 权重高于普通偏好。
- 敏感信息默认不写入。

### 9.5 Policy 规则

必须覆盖：

- 输入安全。
- 输出安全。
- 公开场景上下文安全。
- 记忆写入安全。
- 工具 / 钱包动作安全。

重点规则：

- 朋友圈公开输出不能暴露私聊内容。
- 角色不能在朋友圈暗示真实人类身份。
- 角色不能利用红包诱导依赖。
- 红包、转账必须用户确认。
- 定位内容不能被 Agent 用于现实跟踪或威胁。
- 语音 transcript 进入记忆前必须过滤敏感内容。

### 9.6 Observability

每个朋友圈 Agent 行为必须能查：

- 触发的 MomentPost / MomentComment / MomentLike。
- 对应 AgentEvent。
- 对应 AgentRun。
- promptName / promptVersion。
- contextSnapshot。
- memoryHits / memoryWrites。
- actions。
- failureHints。

验收：

```text
给一个角色评论，能通过 runId 查到：
为什么评论这句话
用了哪些公开记忆
没有使用哪些私密记忆
是否写入了新记忆
```

## 10. 分期开发计划

### Step 9.0：微信 App Shell

目标：

- 微信从单会话列表升级为三 Tab App。
- 现有会话列表迁移到“微信”Tab。
- 新增“朋友圈”Tab 空态。
- 新增“我”Tab 基础展示。

前端任务：

- 新增 `WechatShell`。
- 新增底部 Tab：微信、朋友圈、我。
- 迁移 `ConversationList` 到微信 Tab。
- 单聊详情保持原路由和体验。
- 新增朋友圈空态页面。
- 新增我页面基础卡片。

后端任务：

- 暂不新增复杂表。
- 可先新增 `WechatProfile`，或前端先用用户信息 fallback。

Agent 任务：

- 暂不新增 prompt。
- 不改变现有聊天 Agent 链路。

验收：

- 桌面点击微信进入三 Tab。
- 微信 Tab 展示现有会话列表。
- 朋友圈 Tab 有符合设计风格的空态。
- 我 Tab 展示头像、昵称、钱包余额占位。
- 单聊仍可正常发送消息。

### Step 9.1：微信个人资料与钱包基础

目标：

- 建立用户虚拟微信身份。
- 支持编辑微信头像、名称、签名。
- 展示虚拟钱包余额。

后端任务：

- 新增 `WechatProfile` 表。
- 新增接口：

```http
GET   /api/wechat/profile
PATCH /api/wechat/profile
```

- 初始化默认 `displayName`。
- 初始化默认 `walletBalanceCents=0`。

前端任务：

- 我 Tab 展示资料。
- 编辑资料页。
- 钱包余额展示。
- 头像字段使用 URL，上传能力预留；第一期可先支持手填 / mock URL。

Agent 任务：

- 暂不需要 AgentRun。
- 如果用户修改昵称、签名，可选记录 `AgentEvent: wechat.profile.user_updated`。

验收：

- 用户可以修改微信昵称和头像。
- 修改后我页面立即展示。
- 钱包余额展示正确。
- 登录账号信息和微信个人资料不混淆。

### Step 9.2：朋友圈基础数据模型

目标：

- 用户可以发布朋友圈。
- 用户可以点赞和评论朋友圈。
- 信息流可展示动态、图片、定位、点赞、评论。

后端任务：

- 新增 `MomentPost`。
- 新增 `MomentMedia`。
- 新增 `MomentLike`。
- 新增 `MomentComment`。
- 新增 `MomentVisibilityRule`，可先简化。
- 新增接口：

```http
GET    /api/wechat/moments
POST   /api/wechat/moments
DELETE /api/wechat/moments/:id
POST   /api/wechat/moments/:id/likes
DELETE /api/wechat/moments/:id/likes
POST   /api/wechat/moments/:id/comments
DELETE /api/wechat/moments/:id/comments/:commentId
```

前端任务：

- 朋友圈列表。
- 发布朋友圈页。
- 图片选择 / 预览。
- 定位文本输入。
- 点赞 UI。
- 评论 UI。
- 可见范围简化选择。

Agent 任务：

- 用户发朋友圈时记录 AgentEvent。
- 暂不要求角色自动评论。
- 可先只做 memory.extract 的事件记录和后续预留。

验收：

- 用户能发文字朋友圈。
- 用户能带图片占位和定位。
- 用户能点赞 / 取消点赞。
- 用户能评论 / 删除自己的评论。
- 朋友圈行为有 AgentEvent 记录。

### Step 9.3：朋友圈接 Agent 记忆

目标：

- 用户朋友圈内容进入 Agent 记录。
- 长期有价值信息写入 AgentMemory。
- 朋友圈记忆能被微信聊天自然引用。

后端任务：

- `moments.post.user_created` 接入 Harness。
- `moments.comment.user_created` 接入 Harness。
- 调用 `AgentMemoryService` 抽取和合并记忆。
- 记录 sourceApp / sourceEventId。

Agent 任务：

- 新增 `memory.extract.wechat_moments` prompt。
- 扩展 Context System，允许聊天读取相关朋友圈记忆。
- 按 visibility 过滤。
- 朋友圈为所有角色混排视图；公开动态可被所有角色 Agent 感知。

Policy 任务：

- 私密 / 仅自己可见朋友圈不写入角色记忆。
- 第一阶段不做屏蔽角色过滤。
- 敏感信息不写入普通记忆。

验收：

- 用户发“今天想喝奶茶”后，写入偏好或近期情绪记忆。
- 用户后续聊天时，角色能自然引用“奶茶”。
- 仅自己可见动态不会触发角色记忆。
- 公开动态可以进入相关角色的可见上下文。
- AgentRun trace 可查到记忆来源。

### Step 9.4：角色点赞 / 评论用户朋友圈

目标：

- 角色可以对用户朋友圈点赞。
- 角色可以对用户朋友圈评论。
- 角色行为符合人设、关系阶段和公开场景边界。

后端任务：

- 新增 AgentAction：

```ts
wechat.moments.like
wechat.moments.comment
```

- `AgentActionExecutorService` 支持执行点赞 / 评论。
- 写入 `MomentLike` / `MomentComment`。
- 记录 AgentToolCall 或 AgentAction 审计。

Agent 任务：

- 新增 `moments.comment.wechat` prompt。
- Agent 根据动态内容、角色人设、关系阶段决定是否点赞 / 评论。
- 用户发布朋友圈后自动触发角色 Agent 判断。
- Agent 自己决定是否点赞 / 评论，不是每条动态都必须互动。
- 自动触发必须有幂等控制，避免重复点赞或重复评论。

Policy 任务：

- 角色评论公开动态前必须 sanitize。
- 禁止引用私聊敏感内容。
- 禁止过度亲密、控制、胁迫表达。

前端任务：

- 动态发布后展示“TA 刚刚看到了”或轻量等待态，表示角色正在判断是否互动。
- 角色点赞 / 评论实时或刷新后展示。

验收：

- 用户发朋友圈后，角色可自然点赞或评论。
- 角色点赞 / 评论由发布后自动触发。
- 评论内容符合角色卡。
- 公开评论不泄露私聊信息。
- AgentRun 可查 prompt、context、actions。

### Step 9.5：角色发朋友圈

目标：

- 角色可以发布自己的朋友圈。
- 用户可以点赞 / 评论角色朋友圈。
- 角色可以回复用户评论。

后端任务：

- 支持 `authorType=character` 的 MomentPost。
- 新增 AgentAction：

```ts
wechat.moments.create_post
```

- 支持角色动态生成和落库。
- 新增后台调度任务，每小时触发一次角色发朋友圈判断。
- 调度任务要记录最近触发时间、最近发圈时间和跳过原因。
- 调度执行失败不能影响主聊天链路。

Agent 任务：

- 新增 `moments.post.wechat` prompt。
- 角色根据近期关系、天气、记忆、故事背景生成朋友圈。
- 后台每小时触发一次角色发朋友圈计划任务。
- 每次触发时，Agent 自己判断要不要发，不是每小时必发。
- 需要幂等与频控，避免同一角色短时间连续刷屏。
- 不再依赖用户进入朋友圈或点击刷新触发角色发圈。

前端任务：

- 朋友圈列表展示角色动态。
- 用户可点赞角色动态。
- 用户可评论角色动态。
- 角色可回复评论。

Policy 任务：

- 角色朋友圈不能暴露用户隐私。
- 角色不能声称自己是真实自然人。
- 角色不能发布高风险内容。

验收：

- 角色能发符合人设的朋友圈。
- 角色发朋友圈由后台每小时调度触发，Agent 可选择不发。
- 用户能点赞 / 评论。
- 角色能回复评论。
- 角色发朋友圈有 AgentRun trace。

### Step 9.6：消息类型组件化

目标：

- 聊天消息从纯文本升级为多类型组件骨架。
- 先做 UI 和 payload，不急着接真实外部服务。

前端任务：

- 抽象 `MessageBubble`。
- 新增：
  - `TextMessage`
  - `ImageMessage`
  - `VoiceMessage`
  - `LocationMessage`
  - `RedPacketMessage`
  - `TransferMessage`
  - `SystemMessage`
  - `MomentShareMessage`
  - `OfficialAccountArticleMessage`
- 输入栏新增加号面板。
- 加号面板展示图片、位置、红包、转账入口。
- 语音消息第一期只做 Mock 样式：语音条 + 时长 + 语音转文字，不接真实录音和播放。
- 位置、红包、转账必须按卡片组件设计，不允许退化成纯文本消息。
- 公众号文章转发必须按文章卡片设计，不需要可点击打开。

后端任务：

- 扩展 `Message.type` 约束。
- 扩展 send message schema。
- 不同类型 payload 做 Zod 校验。
- 会话列表预览支持多类型消息。
- 支持 `official_account_article` payload 校验。
- 角色主动转发公众号文章时，写入 `Message` 并保留 traceId / agentRunId。

Agent 任务：

- 文本继续走 `chat.reply`。
- 语音基于 mock `transcript` 走 `chat.reply`。
- 定位、红包、转账走独立事件。
- 角色可通过 `AgentAction` 生成公众号文章转发消息，用来表达人设、调侃、安慰或制造生活感。
- 公众号文章标题、摘要、公众号名由 prompt 生成，但必须经过 Policy 过滤。

验收：

- 旧文本聊天不受影响。
- 不同消息类型可正确渲染。
- 会话列表预览正确。
- 错误 payload 会被后端拒绝。
- 语音消息展示语音条和语音转文字，且不会触发真实音频请求。
- 位置消息展示地图卡片视觉。
- 红包 / 转账展示专属卡片视觉。
- 公众号文章转发展示文章卡片，点击不跳转。

### Step 9.7：虚拟红包与转账

目标：

- 支持虚拟红包和虚拟转账。
- 钱包余额可扣减和增加。
- 红包 / 转账行为进入 Agent 记录。

后端任务：

- 新增 `WechatWalletTransaction`，可选。
- 红包和转账消息写入 `Message`。
- 更新 `WechatProfile.walletBalanceCents`。
- 保证事务一致性。
- 防重复领取。
- 支持用户发给角色，也支持角色发给用户。

前端任务：

- 红包卡片，不能只是文本；建议使用暖橙 / 红色封面、祝福语、状态标识和领取按钮。
- 转账卡片，不能只是文本；建议使用浅黄 / 钱包感卡片、金额大字、备注和待收款 / 已收款状态。
- 领取红包弹层。
- 钱包余额更新。
- 钱包流水入口可选。

Agent 任务：

- 红包 / 转账产生 AgentEvent。
- 关系进度可受影响。
- Agent 可建议发红包，但不能自动执行。

Policy 任务：

- Agent 不能无确认发送红包或转账。
- 即使是虚拟资产，也必须有用户确认。
- 明确 UI 文案：虚拟余额，仅用于产品体验。

验收：

- 用户可以发虚拟红包。
- 角色可以给用户发虚拟红包或转账，但必须经过用户确认。
- 角色可以领取或回应红包。
- 余额正确扣减。
- 重复领取被拦截。
- AgentRun / ToolCall / Action 可审计。
- 红包和转账在聊天流里有明显的微信式卡片视觉，不是普通文本气泡。

### Step 9.8：定位与照片深化

目标：

- 定位和照片成为微信和朋友圈的通用内容能力。

定位：

- 第一阶段只支持手填地点名称和地址。
- 第二阶段接地图 MCP 或位置服务。
- 位置类工具属于 medium / high 风险，不允许用于现实跟踪。
- 聊天和朋友圈都必须渲染位置卡片，卡片包含地点名、地址、定位 pin 和浅色地图纹理。
- 第一阶段不需要真实地图截图，不需要路线规划，不需要点击打开地图。

照片：

- 第一阶段使用 URL 和本地预览，不做完整上传链路。
- 数据结构预留对象存储 URL，后续再接对象存储。
- 第三阶段可接视觉理解，但必须做隐私和安全过滤。

Agent：

- 定位可作为上下文，角色可自然回应。
- 照片短期不做内容理解，除非用户提供文字描述。
- 视觉理解上线前，不能让角色假装看懂图片细节。

验收：

- 位置卡片可展示。
- 朋友圈可展示多图。
- Agent 不会编造图片内容。
- 位置消息不是纯文本，至少有独立卡片、pin 图标和地图感背景。

## 11. 权限与安全

### 11.1 资源归属

所有接口必须校验：

- `userId`
- `postId`
- `commentId`
- `conversationId`
- `characterId`

禁止：

- 跨用户读写朋友圈。
- 第一阶段不做屏蔽功能，不允许出现“已屏蔽但仍可读”的半成品状态。
- 用其他用户的 profile 发红包。
- 用不属于当前用户的 conversationId 写消息。

### 11.2 公开与私密边界

规则：

- 单聊是 private。
- 朋友圈 public 动态是半公开。
- 仅自己可见不触发角色互动。
- 第一阶段不做屏蔽某人，公开动态默认对所有角色可见。
- 角色公开评论不能引用私聊细节。

### 11.3 高风险动作

高风险：

- 红包。
- 转账。
- 真实定位工具。
- 真实购物。
- 真实外部消息。
- 真实日历创建。

要求：

- 必须用户确认。
- 必须写审计。
- 必须可失败降级。
- 必须禁止 Agent 自动执行。

## 12. 测试验收清单

### 12.1 微信 Shell

- 三 Tab 正常切换。
- 单聊详情不展示底部 Tab，且聊天体验不受影响。
- 微信 Shell、朋友圈、我页面底部 Tab 固定。
- 返回逻辑正确。

### 12.2 朋友圈

- 用户可发布文字动态。
- 用户可发布带图片动态。
- 用户可添加定位。
- 用户可点赞 / 取消点赞。
- 用户可评论 / 删除评论。
- 可见范围生效。
- 朋友圈展示用户和所有角色动态混排。
- 屏蔽功能暂不出现入口。

### 12.3 角色互动

- 角色可点赞用户动态。
- 角色可评论用户动态。
- 角色可发朋友圈。
- 用户可评论角色动态。
- 角色可回复用户评论。
- 角色输出符合人设。
- 用户发朋友圈后，角色点赞 / 评论自动触发判断。
- 后台每小时触发角色发朋友圈判断，角色可选择不发。

### 12.4 消息组件

- 语音消息展示语音条、时长和语音转文字，不触发真实音频请求。
- 位置消息展示独立地图卡片，不是纯文本。
- 红包消息展示红包卡片、祝福语和领取状态，不是纯文本。
- 转账消息展示金额卡片、备注和收款状态，不是纯文本。
- 公众号文章转发展示文章卡片，不支持点击打开。
- 角色可主动转发公众号文章，且消息记录可追溯到 AgentRun。

### 12.5 Agent / Memory

- 朋友圈行为生成 AgentEvent。
- 角色互动生成 AgentRun。
- promptName / promptVersion 正确记录。
- contextSnapshot 正确记录。
- 有价值朋友圈内容写入 AgentMemory。
- 私密内容不进入公开上下文。
- 记忆可在后续聊天中被自然引用。

### 12.6 Policy

- 提示词攻击被拦截。
- 高风险输出被改写或拒绝。
- 红包 / 转账必须确认。
- 公开评论不泄露私聊。
- 敏感定位不被滥用。

### 12.7 Observability

- 可按 runId 查 trace。
- 可按 traceId 查完整链路。
- 可看到 MomentPost / MomentComment 关联。
- 可看到 memoryHits / memoryWrites。
- 可看到 actions。
- 可解释 why-this-reply。

### 12.8 回归

- 注册登录正常。
- 联系人创建正常。
- 自动创建微信会话正常。
- 文本聊天正常。
- 桌面未读红点正常。
- 设置模型 API Key 正常。
- `pnpm check` 通过。

## 13. 接口草案

### 13.1 微信 Profile

```http
GET   /api/wechat/profile
PATCH /api/wechat/profile
```

### 13.2 朋友圈

```http
GET    /api/wechat/moments
POST   /api/wechat/moments
GET    /api/wechat/moments/:id
DELETE /api/wechat/moments/:id
```

### 13.3 朋友圈互动

```http
POST   /api/wechat/moments/:id/likes
DELETE /api/wechat/moments/:id/likes
POST   /api/wechat/moments/:id/comments
DELETE /api/wechat/moments/:id/comments/:commentId
```

### 13.4 钱包

```http
GET  /api/wechat/wallet
GET  /api/wechat/wallet/transactions
POST /api/wechat/red-packets
POST /api/wechat/red-packets/:id/claim
POST /api/wechat/transfers
POST /api/wechat/transfers/:id/accept
```

第一期不一定全部实现，按 Step 逐步接。

## 14. 前端组件草案

建议目录：

```text
apps/web/src/pages/wechat/
  WechatShell.tsx
  WechatChatTab.tsx
  WechatMomentsTab.tsx
  WechatMeTab.tsx
  MomentComposer.tsx
  MomentDetail.tsx
  WechatProfileEdit.tsx

apps/web/src/components/wechat/
  WechatBottomTabs.tsx
  MomentPostCard.tsx
  MomentComposerSheet.tsx
  MomentCommentList.tsx
  MessageBubble.tsx
  TextMessage.tsx
  ImageMessage.tsx
  VoiceMessage.tsx
  LocationMessage.tsx
  RedPacketMessage.tsx
  TransferMessage.tsx
  SystemMessage.tsx
  MomentShareMessage.tsx
  OfficialAccountArticleMessage.tsx
  WechatWalletCard.tsx
```

## 15. 后端模块草案

建议目录：

```text
apps/api/src/wechat/
  wechat.module.ts
  wechat-profile.controller.ts
  wechat-profile.service.ts
  moments.controller.ts
  moments.service.ts
  moments-scheduler.service.ts
  wallet.controller.ts
  wallet.service.ts
  wechat.schemas.ts
  wechat-mapper.ts
```

Agent 相关扩展：

```text
apps/api/src/agents/
  agent-context.service.ts
  agent-prompt.service.ts
  agent-action-executor.service.ts
  agent-tool-registry.service.ts
  prompts/
    wechat-moments-comment.prompt.ts
    wechat-moments-post.prompt.ts
    wechat-moments-memory.prompt.ts
    wechat-wallet-plan.prompt.ts
    wechat-official-account-share.prompt.ts
```

共享类型：

```text
packages/shared/src/index.ts
  WechatProfileView
  MomentPostView
  MomentCommentView
  MomentLikeView
  WechatMessageType
  WechatMessagePayload
  WechatWalletView
```

## 16. 推荐执行顺序

建议不要一次性做完整微信，而是按以下节奏：

```text
Step 9.0 微信 App Shell
  -> Step 9.1 微信个人资料与钱包基础
  -> Step 9.2 朋友圈基础数据模型
  -> Step 9.3 朋友圈接 Agent 记忆
  -> Step 9.4 角色点赞 / 评论用户朋友圈
  -> Step 9.5 角色发朋友圈
  -> Step 9.6 消息类型组件化
  -> Step 9.7 虚拟红包与转账
  -> Step 9.8 定位与照片深化
```

每一步都必须满足：

- 有产品闭环。
- 有后端数据闭环。
- 有 AgentEvent / AgentRun 闭环。
- 有 Memory / Policy 规则。
- 有 Observability 可排障。
- 不破坏现有微信文本聊天。

## 17. 最终口径

微信不是一个单独聊天页面，而是角色生活的私密社交容器。

后续微信建设要坚持：

- 聊天是即时互动。
- 朋友圈是生活记录和半公开表达。
- 我是用户虚拟微信身份。
- 钱包是虚拟亲密互动资产。
- 消息组件是社交表达能力，位置、红包、转账、公众号文章都必须有专属卡片视觉。
- 语音第一期只是 Mock 表达，不是真实音频能力。
- Agent 是角色的大脑。
- Memory 是跨场景长期关系。
- Policy 是公开 / 私密 / 高风险边界。
- Observability 是排查“为什么这么说 / 为什么这么做”的黑盒。
