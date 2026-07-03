import { Module } from '@nestjs/common';

import { EligibilityController } from './eligibility.controller';

@Module({
  controllers: [EligibilityController],
})
export class EligibilityModule {}
