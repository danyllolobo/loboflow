import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScriptInput, UpdateScriptInput } from '@loboflow/validation';
import { ScriptStatus } from '@prisma/client';

export interface ScriptQuery {
  clientId?: string;
  format?: string;
  status?: ScriptStatus;
  referenceMonth?: string;
  q?: string;
}

@Injectable()
export class ContentScriptsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, query: ScriptQuery = {}) {
    const where: any = {
      organizationId: orgId,
      archivedAt: null,
    };

    if (query.clientId) where.clientId = query.clientId;
    if (query.format) where.format = query.format;
    if (query.status) where.status = query.status;
    if (query.referenceMonth) where.referenceMonth = query.referenceMonth;

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
        { campaign: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.script.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, segment: true },
        },
        _count: {
          select: { versions: true, comments: true },
        },
      },
      orderBy: [{ referenceMonth: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(orgId: string, id: string) {
    const script = await this.prisma.script.findFirst({
      where: { id, organizationId: orgId, archivedAt: null },
      include: {
        client: true,
        versions: {
          orderBy: { version: 'desc' },
        },
        comments: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!script) {
      throw new NotFoundException('Roteiro não encontrado nesta organização');
    }

    return script;
  }

  async create(orgId: string, actorId: string, input: CreateScriptInput) {
    return this.prisma.$transaction(async (tx) => {
      const script = await tx.script.create({
        data: {
          organizationId: orgId,
          clientId: input.clientId,
          title: input.title,
          format: input.format,
          campaign: input.campaign,
          referenceMonth: input.referenceMonth,
          status: (input.status as ScriptStatus) || ScriptStatus.DRAFT,
          content: input.content || '',
          currentVersion: 1,
          createdById: actorId,
          versions: {
            create: {
              version: 1,
              title: input.title,
              content: input.content || '',
              note: 'Versão inicial',
              createdById: actorId,
            },
          },
        },
        include: {
          client: true,
          versions: true,
        },
      });

      return script;
    });
  }

  async update(orgId: string, id: string, actorId: string, input: UpdateScriptInput) {
    const existing = await this.getOne(orgId, id);

    return this.prisma.$transaction(async (tx) => {
      const contentChanged = input.content !== undefined && input.content !== existing.content;
      const shouldBumpVersion = contentChanged || !!input.versionNote;
      const nextVersion = shouldBumpVersion ? existing.currentVersion + 1 : existing.currentVersion;

      if (shouldBumpVersion) {
        await tx.scriptVersion.create({
          data: {
            scriptId: existing.id,
            version: nextVersion,
            title: input.title || existing.title,
            content: input.content !== undefined ? input.content : existing.content,
            note: input.versionNote || 'Atualização de conteúdo',
            createdById: actorId,
          },
        });
      }

      return tx.script.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          format: input.format,
          campaign: input.campaign,
          referenceMonth: input.referenceMonth,
          status: input.status as ScriptStatus,
          content: input.content,
          currentVersion: nextVersion,
        },
        include: {
          client: true,
          versions: {
            orderBy: { version: 'desc' },
          },
        },
      });
    });
  }

  async changeStatus(orgId: string, id: string, status: ScriptStatus) {
    const existing = await this.getOne(orgId, id);

    return this.prisma.script.update({
      where: { id: existing.id },
      data: { status },
      include: { client: true },
    });
  }

  async archive(orgId: string, id: string) {
    const existing = await this.getOne(orgId, id);
    return this.prisma.script.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
    });
  }
}
