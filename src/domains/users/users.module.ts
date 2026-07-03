import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController, NotificationsController],
})
export class UsersModule {}
