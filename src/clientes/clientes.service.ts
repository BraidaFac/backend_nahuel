import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoLead, Lead, User } from 'src/entities';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { Cliente } from '../entities/cliente.entity';
import { Fuerza } from '../entities/fuerza.entity';
import { Provincia } from '../entities/provincia.entity';
import { Representante } from '../entities/representante.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { FilterClienteDto } from './dto/filter-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Cliente)
    private clienteRepository: EntityRepository<Cliente>,
    @InjectRepository(Provincia)
    private provinciaRepository: EntityRepository<Provincia>,
    @InjectRepository(Representante)
    private representanteRepository: EntityRepository<Representante>,
    @InjectRepository(Fuerza)
    private fuerzaRepository: EntityRepository<Fuerza>,
    @InjectRepository(Lead)
    private leadRepository: EntityRepository<Lead>,
  ) {}

  async create(
    createClienteDto: CreateClienteDto,
    user: User,
    leadId: number | undefined = undefined,
  ): Promise<ApiResponseDto<Cliente>> {
    // Ejecutar todo en una sola transacción
    return await this.em.transactional(async (em) => {
      // 1. Verificar que no exista cliente con mismo DNI o teléfono
      const existingCliente = await em.findOne(Cliente, {
        $or: [
          { dni: createClienteDto.dni },
          { telefono: createClienteDto.telefono },
        ],
      });

      if (existingCliente) {
        throw new ConflictException(
          'Ya existe un cliente con ese DNI o teléfono',
        );
      }

      // 2. Verificar que la provincia existe si se proporciona
      if (createClienteDto.provinciaId) {
        const provincia = await em.findOne(Provincia, {
          id: createClienteDto.provinciaId,
        });
        if (!provincia) {
          throw new NotFoundException('Provincia no encontrada');
        }
      }

      // 3. Verificar que el representante existe si se proporciona
      if (createClienteDto.representanteId) {
        const representante = await em.findOne(Representante, {
          id: createClienteDto.representanteId,
        });
        if (!representante) {
          throw new NotFoundException('Representante no encontrado');
        }
      }

      // 4. Verificar que la fuerza existe si se proporciona
      if (createClienteDto.fuerzaId) {
        const fuerza = await em.findOne(Fuerza, {
          id: createClienteDto.fuerzaId,
        });
        if (!fuerza) {
          throw new NotFoundException('Fuerza no encontrada');
        }
      }

      // 5. Crear el cliente
      const { provinciaId, representanteId, fuerzaId, ...clienteData } =
        createClienteDto;

      const cliente = em.create(Cliente, {
        ...clienteData,
        provincia: { id: provinciaId } as Provincia,
        esSocio: createClienteDto.esSocio ?? false,
        fuerza: { id: fuerzaId } as Fuerza,
        createdAt: new Date(),
        createdBy: user.representante,
      });

      if (representanteId) {
        cliente.representante = { id: representanteId } as Representante;
      }

      // 6. Actualizar el lead si se proporciona
      if (leadId) {
        const lead = await em.findOne(Lead, { id: leadId });
        if (!lead) {
          throw new NotFoundException('Lead no encontrado');
        }
        lead.estado = EstadoLead.CALIFICADO;
        em.persist(lead);
      }

      // 7. Persistir el cliente
      em.persist(cliente);

      // 8. Flush único - todas las operaciones se ejecutan aquí
      await em.flush();

      // 9. Cargar relaciones para la respuesta
      await em.populate(cliente, ['provincia', 'representante', 'fuerza']);

      return ApiResponseDto.success(cliente, 'Cliente creado exitosamente');
    });
  }

  async findAllPaginated(
    filterDto: FilterClienteDto,
  ): Promise<ApiResponseDto<PaginatedResult<Cliente>>> {
    const {
      page = 1,
      limit = 10,
      fullName,
      provinciaId,
      representanteId,
      fuerzaId,
      search,
    } = filterDto;
    const offset = (page - 1) * limit;

    // Construir filtros
    const where: FilterQuery<Cliente> = {};

    if (fullName) {
      where.fullName = { $ilike: `%${fullName.toLowerCase()}%` };
    }

    if (provinciaId) {
      where.provincia = { id: provinciaId };
    }

    if (representanteId) {
      where.representante = { id: representanteId };
    }
    if (fuerzaId) {
      where.fuerza = { id: fuerzaId };
    }

    if (search) {
      const searchLower = search.toLowerCase();
      where.$or = [
        { fullName: { $ilike: `%${searchLower}%` } },
        { email: { $ilike: `%${searchLower}%` } },
        { telefono: { $ilike: `%${searchLower}%` } },
      ];
    }

    const [clientes, total] = await this.clienteRepository.findAndCount(where, {
      populate: ['provincia', 'representante', 'fuerza'],
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    const result: PaginatedResult<Cliente> = {
      data: clientes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return ApiResponseDto.success(result);
  }

  async findAllWithOutPaginated(
    filterDto: FilterClienteDto,
  ): Promise<ApiResponseDto<Cliente[]>> {
    const { fullName, provinciaId, representanteId, fuerzaId, search } =
      filterDto;

    // Construir filtros
    const where: FilterQuery<Cliente> = {};

    if (fullName) {
      where.fullName = { $ilike: `%${fullName.toLowerCase()}%` };
    }

    if (provinciaId) {
      where.provincia = { id: provinciaId };
    }

    if (representanteId) {
      where.representante = { id: representanteId };
    }
    if (fuerzaId) {
      where.fuerza = { id: fuerzaId };
    }

    if (search) {
      const searchLower = search.toLowerCase();
      where.$or = [
        { fullName: { $ilike: `%${searchLower}%` } },
        { email: { $ilike: `%${searchLower}%` } },
        { telefono: { $ilike: `%${searchLower}%` } },
      ];
    }

    const clientes = await this.clienteRepository.findAll({
      where: where,
      populate: ['provincia', 'representante', 'fuerza'],
      orderBy: { createdAt: 'DESC' },
    });

    const result: Cliente[] = clientes;

    return ApiResponseDto.success(result);
  }

  async findOne(id: number): Promise<ApiResponseDto<Cliente>> {
    const cliente = await this.clienteRepository.findOne(
      { id },
      { populate: ['provincia', 'representante', 'fuerza'] },
    );

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return ApiResponseDto.success(cliente);
  }

  async update(
    id: number,
    updateClienteDto: UpdateClienteDto,
  ): Promise<ApiResponseDto<Cliente>> {
    const cliente = await this.clienteRepository.findOne({ id });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const { provinciaId, representanteId, fuerzaId, ...clienteData } =
      updateClienteDto;

    // Construir objeto de actualización solo con campos que vienen en el DTO
    const updateData: Partial<Cliente> = {
      ...clienteData,
    };

    // Solo actualizar relaciones si vienen en el DTO
    if (provinciaId !== undefined) {
      updateData.provincia = { id: provinciaId } as Provincia;
    }

    if (representanteId !== undefined) {
      updateData.representante = { id: representanteId } as Representante;
    }

    if (fuerzaId !== undefined) {
      updateData.fuerza = { id: fuerzaId } as Fuerza;
    }

    this.clienteRepository.assign(cliente, updateData);

    await this.em.persistAndFlush(cliente);

    // Cargar relaciones para la respuesta
    await this.clienteRepository.populate(cliente, [
      'provincia',
      'representante',
      'fuerza',
    ]);

    return ApiResponseDto.success(cliente, 'Cliente actualizado exitosamente');
  }

  async remove(id: number): Promise<ApiResponseDto> {
    const cliente = await this.clienteRepository.findOne({ id });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.em.removeAndFlush(cliente);
    return ApiResponseDto.success(null, 'Cliente eliminado exitosamente');
  }
}
