import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JarvisChatInput } from './ai.types';

@ApiTags('AI / Jarvis')
@Controller('ai')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @RequirePermissions('ai.use')
  async chat(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: JarvisChatInput,
  ) {
    return this.aiService.chat(orgId, userId, body);
  }

  @Get('conversations')
  @RequirePermissions('ai.use')
  async listConversations(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.listConversations(orgId, userId);
  }

  @Get('conversations/:id/messages')
  @RequirePermissions('ai.use')
  async getMessages(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.aiService.getMessages(orgId, userId, conversationId);
  }
}
