import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ensureEnvLoaded } from "./env";

async function bootstrap() {
  ensureEnvLoaded();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
}

bootstrap();
