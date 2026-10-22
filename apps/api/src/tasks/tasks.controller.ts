import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  checklistItemSchema,
  commentSchema,
  createTaskSchema,
  moveTaskSchema,
  taskListQuery,
  updateChecklistItemSchema,
  updateTaskSchema,
} from '@loboflow/validation';
import { ActiveOrganizationContext } from '@loboflow/shared';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions('tasks.view')
  async list(
    @CurrentOrg() orgContext: ActiveOrganizationContext,
    @CurrentUser('id') userId: string,
    @Query() query: unknown,
  ) {
    const parsedQuery = taskListQuery.parse(query);
    return this.tasksService.list(orgContext, parsedQuery, userId);
  }

  @Get('statuses')
  @RequirePermissions('tasks.view')
  async listStatuses(@CurrentOrg('id') orgId: string) {
    return this.tasksService.listStatuses(orgId);
  }

  @Post('statuses')
  @RequirePermissions('tasks.edit')
  async createStatus(
    @CurrentOrg('id') orgId: string,
    @Body() body: { name: string; color?: string; category?: any },
  ) {
    return this.tasksService.createStatus(orgId, body);
  }

  @Patch('statuses/:id')
  @RequirePermissions('tasks.edit')
  async updateStatus(
    @CurrentOrg('id') orgId: string,
    @Param('id') statusId: string,
    @Body() body: { name?: string; color?: string; category?: any },
  ) {
    return this.tasksService.updateStatus(orgId, statusId, body);
  }

  @Delete('statuses/:id')
  @RequirePermissions('tasks.edit')
  async deleteStatus(
    @CurrentOrg('id') orgId: string,
    @Param('id') statusId: string,
  ) {
    return this.tasksService.deleteStatus(orgId, statusId);
  }

  @Get(':id')
  @RequirePermissions('tasks.view')
  async getOne(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.getOne(orgId, id);
  }

  @Post()
  @RequirePermissions('tasks.create')
  async create(
    @CurrentOrg() orgContext: ActiveOrganizationContext,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = createTaskSchema.parse(body);
    return this.tasksService.create(orgContext, userId, input);
  }

  @Patch(':id')
  @RequirePermissions('tasks.edit')
  async update(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateTaskSchema.parse(body);
    return this.tasksService.update(orgId, id, userId, input);
  }

  @Post(':id/move')
  @RequirePermissions('tasks.change_status')
  async move(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = moveTaskSchema.parse(body);
    return this.tasksService.move(orgId, id, userId, input.statusId, input.position);
  }

  @Post(':id/comments')
  @RequirePermissions('tasks.view')
  async addComment(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = commentSchema.parse(body);
    return this.tasksService.addComment(orgId, id, userId, input);
  }

  @Patch(':id/comments/:commentId')
  @RequirePermissions('tasks.view')
  async updateComment(
    @CurrentOrg('id') orgId: string,
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = commentSchema.parse(body);
    return this.tasksService.updateComment(orgId, taskId, commentId, userId, input.body);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermissions('tasks.view')
  async deleteComment(
    @CurrentOrg('id') orgId: string,
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteComment(orgId, taskId, commentId, user.id, user.isSuperAdmin);
  }

  @Post(':id/checklist')
  @RequirePermissions('tasks.edit')
  async addChecklistItem(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = checklistItemSchema.parse(body);
    return this.tasksService.addChecklistItem(orgId, id, userId, input);
  }

  @Patch(':id/checklist/:itemId')
  @RequirePermissions('tasks.edit')
  async updateChecklistItem(
    @CurrentOrg('id') orgId: string,
    @Param('id') taskId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateChecklistItemSchema.parse(body);
    return this.tasksService.updateChecklistItem(
      orgId,
      taskId,
      itemId,
      userId,
      input.title,
      input.done,
    );
  }

  @Delete(':id/checklist/:itemId')
  @RequirePermissions('tasks.edit')
  async deleteChecklistItem(
    @CurrentOrg('id') orgId: string,
    @Param('id') taskId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.deleteChecklistItem(orgId, taskId, itemId, userId);
  }

  @Get(':id/activities')
  @RequirePermissions('tasks.view')
  async getActivities(
    @CurrentOrg('id') orgId: string,
    @Param('id') taskId: string,
  ) {
    return this.tasksService.getActivities(orgId, taskId);
  }

  @Post(':id/archive')
  @RequirePermissions('tasks.delete')
  async archive(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.archive(orgId, id, userId);
  }
}
