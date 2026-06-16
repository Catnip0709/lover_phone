import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";

async function bootstrap() {
  assertRuntimeSafety();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const port = Number(process.env.PORT ?? 3000);
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

  app.use(json({ limit: "5mb" }));
  app.use(urlencoded({ extended: true, limit: "5mb" }));
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(port, "0.0.0.0");
  console.log(`myphone api listening on http://localhost:${port}/api`);
}

void bootstrap();

function assertRuntimeSafety(): void {
  if (process.env.NODE_ENV === "production" && process.env.LLM_MOCK_ENABLED === "true") {
    throw new Error("LLM_MOCK_ENABLED must be false in production");
  }

  const requiredSecrets = [
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "API_KEY_ENCRYPTION_SECRET",
  ];

  if (process.env.NODE_ENV === "production") {
    for (const name of requiredSecrets) {
      const value = process.env[name];
      if (!value || value.startsWith("replace_with_") || value.length < 24) {
        throw new Error(`${name} must be configured with a strong production secret`);
      }
    }
  }
}
