import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActorType, Prisma } from '@prisma/client';

export interface AuditParams {
  organizationId?: string | null;
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  requestId?: string;
}

export interface ActivityParams {
  organizationId: string;
  entityType: string;
  entityId: string;
  actorType?: ActorType;
  actorId?: string | null;
  action: string;
  changes?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAudit(params: AuditParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId ?? undefined,
          actorType: params.actorType,
          actorId: params.actorId ?? undefined,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata ?? Prisma.JsonNull,
          ip: params.ip,
          requestId: params.requestId,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record audit log: ${(err as Error).message}`);
    }
  }

  async logActivity(params: ActivityParams) {
    try {
      return await this.prisma.activity.create({
        data: {
          organizationId: params.organizationId,
          entityType: params.entityType,
          entityId: params.entityId,
          actorType: params.actorType ?? ActorType.USER,
          actorId: params.actorId ?? undefined,
          action: params.action,
          changes: params.changes ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record activity log: ${(err as Error).message}`);
    }
  }
}
