FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install

COPY . .

RUN DATABASE_URL="postgresql://myphone:myphone_local@postgres:5432/myphone?schema=public" \
  pnpm --filter api exec prisma generate --schema prisma/schema.prisma

EXPOSE 3000

CMD ["pnpm", "--filter", "api", "dev"]
