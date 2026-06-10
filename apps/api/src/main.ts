import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { AppModule } from "./modules/app.module";
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  app.use(require("express").json({ limit: "20mb" }));
  app.use(require("express").urlencoded({ limit: "20mb", extended: true }));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix("api");
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:5173"];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use(
    (
      _req: unknown,
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TimeoutInterceptor());

  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
  console.log(`KEBO API listening on http://localhost:${port}/api`);
}

bootstrap();
