import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { APP_ENV, AppEnv } from '../config/env';
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '@loboflow/validation';
import {
  DEFAULT_ROLE_TEMPLATES,
  DEFAULT_TASK_STATUSES,
  MeResponse,
  MembershipSummary,
  SessionUser,
} from '@loboflow/shared';
import { ActorType } from '@prisma/client';
import { AuditService } from '../common/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async register(input: RegisterInput, ip?: string, userAgent?: string) {
    if (!this.env.ALLOW_PUBLIC_SIGNUP) {
      const userCount = await this.prisma.user.count();
      if (userCount > 0) {
        throw new BadRequestException('O cadastro público está desativado no momento');
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException('Já existe uma conta cadastrada com este e-mail');
    }

    const passwordHash = await hash(input.password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Gera slug da empresa
    const baseSlug = input.organizationName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'empresa';

    const slug = `${baseSlug}-${randomBytes(3).toString('hex')}`;

    // Criação atômica de Usuário, Organização, Roles, Statuses e Membership
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          emailVerifiedAt: this.env.REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
        },
      });

      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
          enabledModules: [
            'dashboard',
            'tasks',
            'projects',
            'clients',
            'team',
            'documents',
            'scripts',
            'commercial',
            'contracts',
            'reports',
            'automations',
            'integrations',
            'ai',
            'settings',
          ],
        },
      });

      // Cria papéis padrão
      let ownerRoleId = '';
      for (const tpl of DEFAULT_ROLE_TEMPLATES) {
        const role = await tx.role.create({
          data: {
            organizationId: org.id,
            key: tpl.key,
            name: tpl.name,
            description: tpl.description,
            isOwner: !!tpl.isOwner,
            permissions: {
              create: tpl.permissions.map((p) => ({
                permissionKey: p.key,
                scope: p.scope ?? 'ALL',
              })),
            },
          },
        });
        if (tpl.isOwner) ownerRoleId = role.id;
      }

      // Cria status padrão para o fluxo de tarefas
      let pos = 0;
      for (const st of DEFAULT_TASK_STATUSES) {
        await tx.taskStatus.create({
          data: {
            organizationId: org.id,
            name: st.name,
            category: st.category,
            color: st.color,
            position: pos++,
            isDefault: st.category === 'TODO' && pos === 1,
          },
        });
      }

      // Cria o vínculo de membro Proprietário
      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          roleId: ownerRoleId,
        },
      });

      return { user, org };
    });

    const token = await this.createSession(result.user.id, ip, userAgent);

    await this.auditService.logAudit({
      organizationId: result.org.id,
      actorType: ActorType.USER,
      actorId: result.user.id,
      action: 'auth.registered',
      ip,
    });

    return {
      token,
      user: this.toSessionUser(result.user),
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
      },
    };
  }

  async login(input: LoginInput, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    if (user.disabledAt) {
      throw new UnauthorizedException('Esta conta foi desativada');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new UnauthorizedException(
        `Conta bloqueada por excesso de tentativas incorretas. Tente novamente em ${minutes} minuto(s).`,
      );
    }

    const isValid = await verify(user.passwordHash, input.password);

    if (!isValid) {
      const failed = user.failedLoginCount + 1;
      const lockedUntil =
        failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed,
          lockedUntil,
        },
      });

      await this.auditService.logAudit({
        actorType: ActorType.USER,
        actorId: user.id,
        action: 'auth.failed_login',
        ip,
      });

      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    // Sucesso: reseta contadores e atualiza último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const token = await this.createSession(user.id, ip, userAgent);

    await this.auditService.logAudit({
      actorType: ActorType.USER,
      actorId: user.id,
      action: 'auth.logged_in',
      ip,
    });

    return {
      token,
      user: this.toSessionUser(user),
    };
  }

  async createSession(userId: string, ip?: string, userAgent?: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + this.env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        ip,
        userAgent,
        expiresAt,
      },
    });

    return rawToken;
  }

  async logout(sessionId: string) {
    if (!sessionId) return;
    await this.prisma.session
      .update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const memberships: MembershipSummary[] = user.memberships
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => ({
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        organizationStatus: m.organization.status as 'ACTIVE' | 'SUSPENDED',
        roleId: m.role.id,
        roleName: m.role.name,
        isOwner: m.role.isOwner,
      }));

    return {
      user: this.toSessionUser(user),
      memberships,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput, currentSessionId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const isValid = await verify(user.passwordHash, input.currentPassword);
    if (!isValid) {
      throw new BadRequestException('A senha atual fornecida está incorreta');
    }

    const newHash = await hash(input.newPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoga outras sessões ativas por precaução
    if (currentSessionId) {
      await this.prisma.session.updateMany({
        where: {
          userId,
          id: { not: currentSessionId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Senha atualizada com sucesso' };
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    name: string;
    isSuperAdmin: boolean;
    emailVerifiedAt: Date | null;
    theme: string;
    timezone: string | null;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: !!user.emailVerifiedAt,
      theme: user.theme as 'light' | 'dark' | 'system',
      timezone: user.timezone,
    };
  }
}
