import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '@loboflow/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as SessionUser | undefined;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
