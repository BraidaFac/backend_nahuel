/* eslint-disable @typescript-eslint/no-unused-vars */
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { Representante } from 'src/entities/representante.entity';
import { Role, User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: EntityRepository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Partial<User> | null> {
    const user = await this.userRepository.findOne(
      { username },
      { populate: ['representante'] },
    );

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Usuario o contraseña incorrectos');
  }

  async validateUserById(userId: number): Promise<Partial<User> | null> {
    const user = await this.userRepository.findOne({ id: userId });
    if (user) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: Partial<User>) {
    const payload: JwtPayload = {
      username: user.username!,
      sub: user.id!,
      roles: [user.role!],
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
      secret: this.configService.get<string>('JWT_SECRET_REFRESH'),
    });

    return {
      response: ApiResponseDto.success(
        {
          accessToken,
          user: {
            id: user.id!,
            username: user.username!,
            email: user.email!,
            role: user.role!,
            representante: user.representante,
          },
        },
        'Login exitoso',
      ),
      refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({
      $or: [{ username: registerDto.username }, { email: registerDto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Usuario o email ya existe');
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Crear usuario
    const user = new User();
    user.username = registerDto.username;
    user.email = registerDto.email;
    user.passwordHash = passwordHash;
    user.role = registerDto.role || Role.REPRESENTANTE;
    user.representante = new Representante();
    user.representante.fullName = registerDto.representanteName;
    user.representante.email = registerDto.email;
    user.representante.telefono = registerDto.telefono;

    await this.userRepository.getEntityManager().persistAndFlush(user);

    // Retornar sin el hash de la contraseña
    const { passwordHash: _, ...userResult } = user;

    return ApiResponseDto.success(
      userResult,
      'Usuario registrado exitosamente',
    );
  }

  refreshToken(token: string): ApiResponseDto<{ accessToken: string }> {
    try {
      const payload: JwtPayload = this.jwtService.verify(token, {
        ignoreExpiration: false,
        secret: this.configService.get<string>('JWT_SECRET_REFRESH'),
      });
      // Podés regenerar payload minimalista
      const newAccessToken = this.jwtService.sign(
        {
          username: payload.username,
          sub: payload.sub,
          roles: payload.roles,
        },
        {
          expiresIn: '15m',
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      );
      return ApiResponseDto.success(
        { accessToken: newAccessToken },
        'Token actualizado exitosamente',
      );
    } catch {
      throw new UnauthorizedException();
    }
  }

  async me(
    token: string,
  ): Promise<ApiResponseDto<{ user: Partial<User>; accessToken: string }>> {
    try {
      const payload: JwtPayload = this.jwtService.verify(token, {
        ignoreExpiration: false,
        secret: this.configService.get<string>('JWT_SECRET_REFRESH'),
      });
      const user = await this.userRepository.findOne({ id: payload.sub });
      if (!user) throw new UnauthorizedException();

      const { passwordHash, ...userResult } = user;

      const accessToken = this.jwtService.sign(
        {
          username: user.username,
          sub: user.id,
          roles: [user.role],
        },
        {
          expiresIn: '15m',
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      );
      return ApiResponseDto.success(
        { user: userResult as Partial<User>, accessToken },
        'Usuario obtenido exitosamente',
      );
    } catch {
      throw new UnauthorizedException();
    }
  }
}
