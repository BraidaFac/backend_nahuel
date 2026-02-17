import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
/**
 * Auth Controller
 *
 * Frontend consume:
 * - POST /auth/login { username, password } -> { accessToken, user }
 * - POST /auth/register { username, email, password, roles? } -> { user }
 * - GET /auth/me -> { user } (con Bearer token)
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: RequestWithUser,
  ) {
    const { refreshToken, response } = this.authService.login(req.user);

    // Cookie segura con refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax', // Para desarrollo local, cambiar a 'none' en producción con HTTPS
      secure: false, // poner true en prod con HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      path: '/', // Importante: especificar el path
    });

    return response;
  }

  @Post('register')
  //@UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles('admin') // Solo admin puede registrar usuarios
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh-token')
  refresh(@Req() req: express.Request) {
    {
      const token: string = req.cookies['refreshToken'] as string;
      if (!token) throw new UnauthorizedException();

      return this.authService.refreshToken(token);
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: express.Response) {
    // Limpiar la cookie correctamente
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    return { message: 'Logout successful' };
  }

  @Get('me')
  me(@Req() req: express.Request) {
    const token: string = req.cookies['refreshToken'] as string;
    if (!token) throw new UnauthorizedException();
    return this.authService.me(token);
  }
}
