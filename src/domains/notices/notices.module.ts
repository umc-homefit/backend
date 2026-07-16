import { Module } from '@nestjs/common';

import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { SavedNoticesController } from './saved-notices.controller';

@Module({
  controllers: [NoticesController, SavedNoticesController],
  providers: [NoticesService],
})
export class NoticesModule {}
