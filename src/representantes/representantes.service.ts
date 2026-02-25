import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from 'src/entities/user.entity';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { Representante } from '../entities/representante.entity';
import { CreateRepresentanteDto } from './dto/create-representante.dto';
import { FilterRepresentanteDto } from './dto/filter-representante.dto';
import { UpdateRepresentanteDto } from './dto/update-representante.dto';

export class RepresentantesService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Representante)
    private representanteRepository: EntityRepository<Representante>,
  ) {}

  async create(
    createRepresentanteDto: CreateRepresentanteDto,
  ): Promise<ApiResponseDto<Representante>> {
    const where: FilterQuery<Representante> = {
      $or: [
        { email: createRepresentanteDto.email },
        { user: { username: createRepresentanteDto.username } },
      ],
    };
    const existingRepresentante = await this.representanteRepository.findOne(
      where,
      { populate: ['user'] },
    );

    if (existingRepresentante) {
      throw new ConflictException(
        'Ya existe un representante con ese email o username',
      );
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(
      createRepresentanteDto.password,
      saltRounds,
    );

    // Crear usuario
    const user = new User();
    user.username = createRepresentanteDto.username;
    user.email = createRepresentanteDto.email;
    user.passwordHash = passwordHash;
    user.role = Role.REPRESENTANTE;
    user.representante = new Representante();
    user.representante.fullName = createRepresentanteDto.fullName;
    user.representante.email = createRepresentanteDto.email;
    user.representante.telefono = createRepresentanteDto.telefono;

    await this.em.persistAndFlush(user);

    return ApiResponseDto.success(user.representante);
  }

  async findAllPaginated(
    filterDto: FilterRepresentanteDto,
  ): Promise<ApiResponseDto<PaginatedResult<Representante>>> {
    const { page = 1, limit = 10, fullName, email, search } = filterDto;
    const offset = (page - 1) * limit;

    const where: FilterQuery<Representante> = {};
    if (fullName) {
      where.fullName = { $ilike: `%${fullName.toLowerCase()}%` };
    }

    if (email) {
      where.email = { $ilike: `%${email.toLowerCase()}%` };
    }

    if (search) {
      const searchLower = search.toLowerCase();
      where.$or = [
        { fullName: { $ilike: `%${searchLower}%` } },
        { email: { $ilike: `%${searchLower}%` } },
        { telefono: { $ilike: `%${searchLower}%` } },
      ];
    }

    // Excluir admins y managers
    where.user = { role: { $nin: [Role.ADMIN, Role.MANAGER] } };
    const [representantes, total] =
      await this.representanteRepository.findAndCount(where, {
        populate: ['user'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      });

    const result: PaginatedResult<Representante> = {
      data: representantes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return ApiResponseDto.success(result);
  }

  async findAll(): Promise<ApiResponseDto<Representante[]>> {
    const representantes = await this.representanteRepository.findAll({
      where: {
        user: {
          role: { $nin: [Role.ADMIN, Role.MANAGER] },
        },
      },
      populate: ['user'],
      orderBy: { createdAt: 'DESC' },
    });

    const result: Representante[] = representantes;

    return ApiResponseDto.success(result);
  }
  async findOne(id: number): Promise<ApiResponseDto<Representante>> {
    const representante = await this.representanteRepository.findOne(
      { id },
      { populate: ['user', 'clientes'] },
    );

    if (!representante) {
      throw new NotFoundException('Representante no encontrado');
    }

    return ApiResponseDto.success(representante);
  }

  async update(
    id: number,
    updateRepresentanteDto: UpdateRepresentanteDto,
  ): Promise<ApiResponseDto<Representante>> {
    const representante = await this.representanteRepository.findOne({ id });
    if (!representante) {
      throw new NotFoundException('Representante no encontrado');
    }

    // Verificar si el email ya existe en otro representante

    if (updateRepresentanteDto.password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(
        updateRepresentanteDto.password,
        saltRounds,
      );
      representante.user.passwordHash = passwordHash;
    }

    this.em.assign(representante.user, updateRepresentanteDto);

    await this.em.persistAndFlush(representante.user);

    // Cargar relaciones para la respuesta
    await this.representanteRepository.populate(representante, ['user']);

    return ApiResponseDto.success(
      representante,
      'Representante actualizado exitosamente',
    );
  }

  async remove(id: number): Promise<ApiResponseDto> {
    const representante = await this.representanteRepository.findOne(
      { id },
      { populate: ['clientes'] },
    );

    if (!representante) {
      throw new NotFoundException('Representante no encontrado');
    }

    await this.em.removeAndFlush(representante);
    return ApiResponseDto.success(null, 'Representante eliminado exitosamente');
  }
}
