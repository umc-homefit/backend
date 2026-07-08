import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: bigint;
}

/**
 * JwtAuthGuard가 먼저 통과되어 req.user가 채워진 상태에서만 사용 가능하다.
 * 사용 예: getBasicInfo(@CurrentUser() user: CurrentUserPayload)
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);