import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from './infrastructure/logger/logger.service';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { getCorsOptions } from './presentation/cors/cors.config';
import { configureTrustProxy } from './presentation/proxy/trust-proxy.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  configureTrustProxy(app, configService);

  app.use(cookieParser());

  app.enableCors(getCorsOptions(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3000);
}
bootstrap().catch((err) => {
  console.error('Error during startup', err);
  process.exit(1);
});
