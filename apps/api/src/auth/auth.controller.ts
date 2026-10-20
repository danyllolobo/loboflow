import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard, SESSION_COOKIE_NAME } from '../common/guards/auth.guard';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '@loboflow/validation';
import { SessionUser } from '@loboflow/shared';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = registerSchema.parse(body);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.register(input, ip, userAgent);

    this.setSessionCookie(res, result.token);

    return {
      user: result.user,
      organization: result.organization,
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = loginSchema.parse(body);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(input, ip, userAgent);

    this.setSessionCookie(res, result.token);

    return {
      user: result.user,
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = (req as any).sessionId;
    await this.authService.logout(sessionId);

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: SessionUser) {
    return this.authService.getMe(user.id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const input = changePasswordSchema.parse(body);
    const sessionId = (req as any).sessionId;
    return this.authService.changePassword(userId, input, sessionId);
  }

  private setSessionCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 dias

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
}
