import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AuthModule } from './domains/auth/auth.module';
import { EligibilityModule } from './domains/eligibility/eligibility.module';
import { FinanceModule } from './domains/finance/finance.module';
import { NoticesModule } from './domains/notices/notices.module';
import { UsersModule } from './domains/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './domains/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    NoticesModule,
    EligibilityModule,
    FinanceModule,
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
