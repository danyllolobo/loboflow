import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeDealStageInput,
  CreateDealInput,
  DealInteractionInput,
  UpdateDealInput,
} from '@loboflow/validation';
import { DealStage, InteractionType } from '@prisma/client';

export interface DealQuery {
  stage?: DealStage;
  ownerId?: string;
  clientId?: string;
  q?: string;
}

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, query: DealQuery = {}) {
    const where: any = {
      organizationId: orgId,
    };

    if (query.stage) where.stage = query.stage;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.clientId) where.clientId = query.clientId;

    if (query.q) {
      where.OR = [
        { prospectName: { contains: query.q, mode: 'insensitive' } },
        { segment: { contains: query.q, mode: 'insensitive' } },
        { scope: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.deal.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, segment: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { interactions: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getPipelineSummary(orgId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        stage: true,
        valueCents: true,
      },
    });

    const stages: DealStage[] = [
      DealStage.NEW,
      DealStage.CONTACTED,
      DealStage.PROPOSAL,
      DealStage.NEGOTIATION,
      DealStage.WON,
      DealStage.LOST,
    ];

    const summary: Record<string, { count: number; totalCents: number }> = {};
    for (const s of stages) {
      summary[s] = { count: 0, totalCents: 0 };
    }

    for (const d of deals) {
      const entry = summary[d.stage];
      if (entry) {
        entry.count += 1;
        entry.totalCents += d.valueCents || 0;
      }
    }

    return summary;
  }

  async getOne(orgId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
        interactions: {
          orderBy: { occurredAt: 'desc' },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Negociação não encontrada nesta organização');
    }

    return deal;
  }

  async create(orgId: string, actorId: string, input: CreateDealInput) {
    return this.prisma.deal.create({
      data: {
        organizationId: orgId,
        prospectName: input.prospectName,
        clientId: input.clientId,
        segment: input.segment,
        source: input.source,
        scope: input.scope,
        valueCents: input.valueCents,
        proposalDate: input.proposalDate ? new Date(input.proposalDate) : null,
        ownerId: input.ownerId,
        stage: (input.stage as DealStage) || DealStage.NEW,
        nextContactAt: input.nextContactAt ? new Date(input.nextContactAt) : null,
        notes: input.notes,
        createdById: actorId,
      },
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(orgId: string, id: string, input: UpdateDealInput) {
    const existing = await this.getOne(orgId, id);

    return this.prisma.deal.update({
      where: { id: existing.id },
      data: {
        prospectName: input.prospectName,
        clientId: input.clientId,
        segment: input.segment,
        source: input.source,
        scope: input.scope,
        valueCents: input.valueCents,
        proposalDate: input.proposalDate ? new Date(input.proposalDate) : undefined,
        ownerId: input.ownerId,
        nextContactAt: input.nextContactAt ? new Date(input.nextContactAt) : undefined,
        notes: input.notes,
      },
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async changeStage(orgId: string, id: string, actorId: string, input: ChangeDealStageInput) {
    const existing = await this.getOne(orgId, id);

    const isClosed = input.stage === DealStage.WON || input.stage === DealStage.LOST;
    const closedAt = isClosed ? new Date() : null;

    if (input.stage === DealStage.LOST && !input.lostReasonCode) {
      throw new BadRequestException('Informe o código do motivo da perda');
    }

    return this.prisma.$transaction(async (tx) => {
      // Se ganhou e solicitou criar cliente automaticamente
      let clientId = existing.clientId;
      if (input.stage === DealStage.WON && input.createClient && !existing.clientId) {
        const client = await tx.client.create({
          data: {
            organizationId: orgId,
            name: existing.prospectName,
            segment: existing.segment,
            notes: existing.notes,
            clientSince: new Date(),
          },
        });
        clientId = client.id;
      }

      return tx.deal.update({
        where: { id: existing.id },
        data: {
          stage: input.stage as DealStage,
          wonReason: input.wonReason,
          lostReasonCode: input.lostReasonCode,
          lostReasonDetail: input.lostReasonDetail,
          nextContactAt: input.nextContactAt ? new Date(input.nextContactAt) : undefined,
          closedAt,
          clientId,
        },
        include: {
          client: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  async addInteraction(orgId: string, dealId: string, actorId: string, input: DealInteractionInput) {
    const deal = await this.getOne(orgId, dealId);

    return this.prisma.dealInteraction.create({
      data: {
        dealId: deal.id,
        type: input.type as InteractionType,
        summary: input.summary,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        authorId: actorId,
      },
    });
  }

  async delete(orgId: string, dealId: string) {
    const deal = await this.getOne(orgId, dealId);
    await this.prisma.deal.delete({
      where: { id: deal.id },
    });
    return { success: true, message: 'Oportunidade excluída com sucesso.' };
  }
}
