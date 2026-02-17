import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Provincia } from '../entities/provincia.entity';
import { CreateProvinciaDto } from './dto/create-provincia.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';

@Injectable()
export class ProvinciasService {
  constructor(
    @InjectRepository(Provincia)
    private provinciaRepository: EntityRepository<Provincia>,
  ) {}

  async create(
    createProvinciaDto: CreateProvinciaDto,
  ): Promise<ApiResponseDto<Provincia>> {
    const em = this.provinciaRepository.getEntityManager();

    const existingDefaultProvincia = await this.provinciaRepository.findOne({
      esDefault: true,
    });
    if (createProvinciaDto.esDefault && existingDefaultProvincia) {
      throw new BadRequestException('Ya existe una provincia default');
    }

    const provincia = this.provinciaRepository.create({
      nombre: createProvinciaDto.nombre,
      esDefault: createProvinciaDto.esDefault ?? false,
    });

    await em.persistAndFlush(provincia);
    return ApiResponseDto.success(provincia, 'Provincia creada exitosamente');
  }

  async findAll(): Promise<ApiResponseDto<Provincia[]>> {
    const provincias = await this.provinciaRepository.findAll({
      orderBy: { nombre: 'ASC' },
    });
    return ApiResponseDto.success(provincias);
  }

  async findOne(id: number): Promise<ApiResponseDto<Provincia>> {
    const provincia = await this.provinciaRepository.findOne({ id });
    if (!provincia) {
      throw new NotFoundException('Provincia no encontrada');
    }
    return ApiResponseDto.success(provincia);
  }

  async update(
    id: number,
    updateProvinciaDto: UpdateProvinciaDto,
  ): Promise<ApiResponseDto<Provincia>> {
    const em = this.provinciaRepository.getEntityManager();
    const provincia = await this.provinciaRepository.findOne({ id });

    if (!provincia) {
      throw new NotFoundException('Provincia no encontrada');
    }

    const existingDefaultProvincia = await this.provinciaRepository.findOne({
      esDefault: true,
    });
    //necesito que si ya existe una provincia default, no se pueda actualizar como default otra
    if (
      updateProvinciaDto.esDefault &&
      !provincia.esDefault &&
      existingDefaultProvincia
    ) {
      throw new BadRequestException('Ya existe una provincia default');
    }

    Object.assign(provincia, updateProvinciaDto);
    await em.flush();

    return ApiResponseDto.success(
      provincia,
      'Provincia actualizada exitosamente',
    );
  }

  async remove(id: number): Promise<ApiResponseDto> {
    const provincia = await this.provinciaRepository.findOne({ id });
    if (!provincia) {
      throw new NotFoundException('Provincia no encontrada');
    }

    await this.provinciaRepository.getEntityManager().removeAndFlush(provincia);
    return ApiResponseDto.success(null, 'Provincia eliminada exitosamente');
  }
}
