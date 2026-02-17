import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { FilterClienteDto } from 'src/clientes/dto/filter-cliente.dto';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { Representante, Role, User } from 'src/entities';
import { EstadoLead, Lead } from 'src/entities/lead.entity';
import { AsignarLeadsDto } from './DTOs/asignar.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: EntityRepository<Lead>,
  ) {}

  async findAllPaginated(
    user: User,
    filterDto: FilterClienteDto,
  ): Promise<ApiResponseDto<PaginatedResult<Lead>>> {
    const {
      page = 1,
      limit = 10,
      fullName,
      provinciaId,
      representanteId,
      fuerzaId,
      estado,
      search,
    } = filterDto;
    const offset = (page - 1) * limit;

    // Construir filtros
    const where: FilterQuery<Lead> = {};

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

    if (estado) {
      where.estado = estado;
    }

    if (search) {
      const searchLower = search.toLowerCase();
      where.$or = [
        { fullName: { $ilike: `%${searchLower}%` } },
        { email: { $ilike: `%${searchLower}%` } },
        { telefono: { $ilike: `%${searchLower}%` } },
      ];
    }

    if (user.role === Role.REPRESENTANTE) {
      where.representante = { id: user.representante.id };
    }

    const [leads, total] = await this.leadRepository.findAndCount(where, {
      populate: ['provincia', 'representante', 'fuerza'],
      orderBy: { estado: 'ASC', fullName: 'ASC' },
      limit,
      offset,
    });

    const result: PaginatedResult<Lead> = {
      data: leads,
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
    user: User,
    filterDto: FilterClienteDto,
  ): Promise<ApiResponseDto<Lead[]>> {
    const { fullName, provinciaId, representanteId, fuerzaId, search } =
      filterDto;

    // Construir filtros
    const where: FilterQuery<Lead> = {};

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

    if (user.role === Role.REPRESENTANTE) {
      where.representante = { id: user.representante.id };
    }

    const leads = await this.leadRepository.findAll({
      where: where,
      populate: ['provincia', 'representante', 'fuerza'],
      orderBy: { createdAt: 'DESC' },
    });

    const result: Lead[] = leads;

    return ApiResponseDto.success(result);
  }

  async cambiarEstado(
    id: number,
    estado: EstadoLead,
  ): Promise<ApiResponseDto<Lead>> {
    const lead = await this.leadRepository.findOne({ id });
    if (!lead) {
      return ApiResponseDto.error('Lead no encontrado');
    }
    lead.estado = estado;
    await this.leadRepository.getEntityManager().persistAndFlush(lead);
    return ApiResponseDto.success(lead);
  }

  async asignarLeads(
    asignarLeadsDto: AsignarLeadsDto,
  ): Promise<ApiResponseDto<Lead[]>> {
    const { leadIds, representanteId } = asignarLeadsDto;
    const leads = await this.leadRepository.findAll({
      where: { id: { $in: leadIds } },
    });
    if (!leads) {
      return ApiResponseDto.error('Leads no encontrados');
    }
    leads.forEach((lead) => {
      lead.representante = { id: representanteId } as Representante;
    });
    await this.leadRepository.getEntityManager().persistAndFlush(leads);
    return ApiResponseDto.success(leads);
  }
}
