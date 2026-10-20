import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActiveOrganizationContext } from '@loboflow/shared';

export const CurrentOrg = createParamDecorator(
  (data: keyof ActiveOrganizationContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const org = request.organizationContext as ActiveOrganizationContext | undefined;
    if (!org) return null;
    return data ? org[data] : org;
  },
);
