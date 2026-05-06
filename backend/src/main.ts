import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from './infrastructure/logger/logger.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(Logger));
  app.enableCors();
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
