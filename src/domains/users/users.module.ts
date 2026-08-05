import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PrismaModule } from '../../prisma/prisma.module'; // PrismaService 사용을 위해

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository], // 추가 완료
  exports: [UsersService], // 추가 — AuthModule 등 다른 모듈이 UsersService를 주입받을 수 있게
})
export class UsersModule {}