import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContractInput,
  UpdateContractInput,
  EndContractInput,
} from '@loboflow/validation';
import {
  ContractStatus,
  RenewalStatus,
  ReturnIntention,
  ClientStatus,
  ActorType,
} from '@prisma/client';
import { AuditService } from '../common/audit.service';

export interface ContractFilterQuery {
  status?: ContractStatus;
  clientId?: string;
  renewalStatus?: RenewalStatus;
  search?: string;
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(orgId: string, filters: ContractFilterQuery = {}) {
    const where: any = {
      organizationId: orgId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.renewalStatus) {
      where.renewalStatus = filters.renewalStatus;
    }

    if (filters.search) {
      const search = filters.search.trim();
      where.OR = [
        { service: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.contract.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            segment: true,
            status: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }

  async getMetrics(orgId: string) {
    const [
      activeCount,
      activeSum,
      pendingRenewalsCount,
      endedCount,
      reasonsGroup,
    ] = await Promise.all([
      this.prisma.contract.count({
        where: { organizationId: orgId, status: ContractStatus.ACTIVE },
      }),
      this.prisma.contract.aggregate({
        where: { organizationId: orgId, status: ContractStatus.ACTIVE },
        _sum: { monthlyValueCents: true },
      }),
      this.prisma.contract.count({
        where: {
          organizationId: orgId,
          status: ContractStatus.ACTIVE,
          renewalStatus: RenewalStatus.PENDING,
        },
      }),
      this.prisma.contract.count({
        where: { organizationId: orgId, status: ContractStatus.ENDED },
      }),
      this.prisma.contract.groupBy({
        by: ['endReasonCode'],
        where: {
          organizationId: orgId,
          status: ContractStatus.ENDED,
          endReasonCode: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const totalMonthlyValueCents = activeSum._sum.monthlyValueCents || 0;
    const annualRunRateCents = totalMonthlyValueCents * 12;
    const avgTicketMonthlyCents =
      activeCount > 0 ? Math.round(totalMonthlyValueCents / activeCount) : 0;

    const churnReasonsBreakdown: Record<string, number> = {};
    for (const item of reasonsGroup) {
      if (item.endReasonCode) {
        churnReasonsBreakdown[item.endReasonCode] = item._count.id;
      }
    }

    return {
      activeContractsCount: activeCount,
      totalMonthlyValueCents,
      annualRunRateCents,
      avgTicketMonthlyCents,
      pendingRenewalsCount,
      endedContractsCount: endedCount,
      churnReasonsBreakdown,
    };
  }

  async getOne(orgId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId: orgId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            segment: true,
            status: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    return contract;
  }

  async create(orgId: string, userId: string, input: CreateContractInput) {
    // Valida cliente
    const client = await this.prisma.client.findFirst({
      where: { id: input.clientId, organizationId: orgId },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          organizationId: orgId,
          clientId: input.clientId,
          service: input.service,
          startDate: input.startDate ? new Date(input.startDate) : new Date(),
          endDate: input.endDate ? new Date(input.endDate) : null,
          monthlyValueCents: input.monthlyValueCents ?? null,
          renewalStatus: (input.renewalStatus as RenewalStatus) ?? RenewalStatus.PENDING,
          status: ContractStatus.ACTIVE,
          notes: input.notes ?? null,
          createdById: userId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              segment: true,
              status: true,
            },
          },
        },
      });

      // Se o cliente estava como LEAD, passa para ACTIVE
      if (client.status === ClientStatus.LEAD) {
        await tx.client.update({
          where: { id: client.id },
          data: { status: ClientStatus.ACTIVE },
        });
      }

      return created;
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId: userId,
      action: 'contract.created',
      entityType: 'Contract',
      entityId: contract.id,
      metadata: {
        service: contract.service,
        clientId: contract.clientId,
        monthlyValueCents: contract.monthlyValueCents,
      },
    });

    return contract;
  }

  async update(
    orgId: string,
    id: string,
    userId: string,
    input: UpdateContractInput,
  ) {
    const existing = await this.prisma.contract.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    const data: any = {};
    if (input.service !== undefined) data.service = input.service;
    if (input.startDate !== undefined) data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined)
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.monthlyValueCents !== undefined)
      data.monthlyValueCents = input.monthlyValueCents;
    if (input.renewalStatus !== undefined)
      data.renewalStatus = input.renewalStatus as RenewalStatus;
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await this.prisma.contract.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            segment: true,
            status: true,
          },
        },
      },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId: userId,
      action: 'contract.updated',
      entityType: 'Contract',
      entityId: id,
      metadata: { changes: input },
    });

    return updated;
  }

  async endContract(
    orgId: string,
    id: string,
    userId: string,
    input: EndContractInput,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    if (contract.status === ContractStatus.ENDED) {
      throw new BadRequestException('Este contrato já foi encerrado.');
    }

    const ended = await this.prisma.$transaction(async (tx) => {
      const updatedContract = await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.ENDED,
          endedAt: new Date(input.endedAt),
          endedById: userId,
          endReasonCode: input.endReasonCode,
          endReasonDetail: input.endReasonDetail ?? null,
          wantsToReturn: input.wantsToReturn as ReturnIntention,
          futureContactAt: input.futureContactAt
            ? new Date(input.futureContactAt)
            : null,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              segment: true,
              status: true,
            },
          },
        },
      });

      // Se solicitado marca cliente como CHURNED se não houver outros contratos ativos
      if (input.markClientChurned) {
        const remainingActive = await tx.contract.count({
          where: {
            organizationId: orgId,
            clientId: contract.clientId,
            status: ContractStatus.ACTIVE,
            id: { not: id },
          },
        });

        if (remainingActive === 0) {
          await tx.client.update({
            where: { id: contract.clientId },
            data: { status: ClientStatus.CHURNED },
          });
        }
      }

      return updatedContract;
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId: userId,
      action: 'contract.ended',
      entityType: 'Contract',
      entityId: id,
      metadata: {
        endReasonCode: input.endReasonCode,
        wantsToReturn: input.wantsToReturn,
        endedAt: input.endedAt,
      },
    });

    return ended;
  }

  async renewContract(
    orgId: string,
    id: string,
    userId: string,
    newEndDate?: string,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    const data: any = {
      renewalStatus: RenewalStatus.RENEWED,
    };
    if (newEndDate) {
      data.endDate = new Date(newEndDate);
    }

    const renewed = await this.prisma.contract.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            segment: true,
            status: true,
          },
        },
      },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId: userId,
      action: 'contract.renewed',
      entityType: 'Contract',
      entityId: id,
      metadata: { newEndDate },
    });

    return renewed;
  }

  async delete(orgId: string, id: string, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    await this.prisma.contract.delete({
      where: { id },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId: userId,
      action: 'contract.deleted',
      entityType: 'Contract',
      entityId: id,
    });

    return { success: true };
  }
}
