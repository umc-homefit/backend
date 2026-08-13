import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // AWS ALB/Railway 리버스 프록시 뒤에서 도는 구조라, 신뢰할 hop을 1개로 제한해
  // X-Forwarded-For의 실제 클라이언트 IP를 req.ip로 사용하도록 한다.
  // 이게 없으면 ThrottlerGuard가 프록시 IP 하나로 모든 사용자를 묶어서 카운트한다.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  setupSwagger(app);

  const port = Number(process.env.PORT ?? 3000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
