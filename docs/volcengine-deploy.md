# 火山引擎内测部署清单

本文档用于 Step 7 内测上线准备，目标是从本机 Docker Compose 平滑迁移到字节系火山引擎。

## 推荐拓扑

- 前端：TOS + CDN，或 ECS / VKE 中 Nginx 静态资源服务。
- 后端：ECS + Docker Compose 起步；稳定后迁移 VKE。
- 数据库：RDS PostgreSQL 16。
- 缓存：托管 Redis。
- 入口：CLB + HTTPS 证书。
- 日志：容器标准输出接入 TLS / 日志服务。

## 必填环境变量

参考根目录 `.env.production.example`：

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `API_KEY_ENCRYPTION_SECRET`
- `CORS_ORIGIN`
- `VITE_API_BASE_URL`
- `LLM_MOCK_ENABLED=false`

生产启动保护：

- 如果 `NODE_ENV=production` 且 `LLM_MOCK_ENABLED=true`，API 会拒绝启动。
- 如果生产密钥仍是 `replace_with_` 前缀或长度过短，API 会拒绝启动。

## 上线前检查

- 执行 `pnpm check`，确认前后端类型检查通过。
- 执行 `pnpm --filter api prisma:generate`，确认 Prisma Client 可生成。
- 在目标数据库执行迁移脚本并确认表结构。
- 确认 `GET /api/health` 返回 `database=ok` 和 `redis=ok`。
- 使用真实模型 Key 测试 DeepSeek / GLM / Kimi 连接。
- 确认日志中不输出明文 API Key、Access Token、Refresh Token。
- 确认 CORS 只允许正式前端域名。
- 确认隐私政策和用户协议入口可访问。

## 回滚建议

- 保留上一版 API / Web 镜像标签。
- 数据库迁移前先备份 RDS。
- 首批内测期间避免破坏性 schema 迁移。
- 出现模型调用大面积失败时，优先关闭外部入口或回滚 API，而不是开启 Mock。
