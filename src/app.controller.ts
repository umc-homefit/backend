import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: '서버 상태 확인' })
  getHealth() {
    return {
      status: 'ok',
    };
  }
}
