import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientInput, UpdateClientInput } from '@loboflow/validation';
import { ClientStatus } from '@prisma/client';
import { AuditService } from '../common/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(orgId: string, status?: ClientStatus, search?: string) {
    return this.prisma.client.findMany({
      where: {
        organizationId: orgId,
        archivedAt: null,
        status: status || undefined,
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      include: {
        owners: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { projects: true, tasks: true, contracts: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(orgId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId: orgId },
      include: {
        owners: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        contacts: true,
        projects: {
          where: { archivedAt: null },
          select: { id: true, name: true, status: true, priority: true },
        },
        tasks: {
          where: { archivedAt: null },
          select: { id: true, number: true, title: true, status: true, priority: true, dueDate: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        contracts: {
          orderBy: { startDate: 'desc' },
        },
        documents: {
          where: { deletedAt: null },
        },
      },
    });

    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async create(orgId: string, actorId: string, input: CreateClientInput) {
    const client = await this.prisma.client.create({
      data: {
        organizationId: orgId,
        name: input.name,
        displayName: input.displayName,
        segment: input.segment,
        email: input.email || null,
        phone: input.phone,
        website: input.website,
        status: (input.status as ClientStatus) || ClientStatus.ACTIVE,
        notes: input.notes,
        profile: input.profile as any,
        owners: input.ownerIds?.length
          ? {
              create: input.ownerIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Client',
      entityId: client.id,
      actorId,
      action: 'client.created',
      changes: { name: client.name },
    });

    return client;
  }

  async update(
    orgId: string,
    id: string,
    actorId: string,
    input: UpdateClientInput,
  ) {
    const existing = await this.prisma.client.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.ownerIds) {
        await tx.clientOwner.deleteMany({ where: { clientId: id } });
        if (input.ownerIds.length > 0) {
          await tx.clientOwner.createMany({
            data: input.ownerIds.map((userId) => ({ clientId: id, userId })),
          });
        }
      }

      return tx.client.update({
        where: { id },
        data: {
          name: input.name,
          displayName: input.displayName,
          segment: input.segment,
          email: input.email !== undefined ? (input.email || null) : undefined,
          phone: input.phone,
          website: input.website,
          status: input.status ? (input.status as ClientStatus) : undefined,
          notes: input.notes,
          profile: input.profile ? (input.profile as any) : undefined,
        },
        include: {
          owners: { include: { user: true } },
        },
      });
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Client',
      entityId: id,
      actorId,
      action: 'client.updated',
      changes: input as any,
    });

    return updated;
  }

  async archive(orgId: string, id: string, actorId: string) {
    const existing = await this.prisma.client.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado');

    const updated = await this.prisma.client.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Client',
      entityId: id,
      actorId,
      action: 'client.archived',
    });

    return updated;
  }
}
