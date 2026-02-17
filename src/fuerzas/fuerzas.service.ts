import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Fuerza } from '../entities/fuerza.entity';
import { CreateFuerzaDto } from './dto/create-fuerza.dto';
import { UpdateFuerzaDto } from './dto/update-fuerza.dto';

@Injectable()
export class FuerzasService {
  constructor(
    @InjectRepository(Fuerza)
    private fuerzaRepository: EntityRepository<Fuerza>,
  ) {}

  async create(
    createFuerzaDto: CreateFuerzaDto,
  ): Promise<ApiResponseDto<Fuerza>> {
    const em = this.fuerzaRepository.getEntityManager();

    // Verificar si ya existe una fuerza con el mismo nombre
    const existingFuerza = await this.fuerzaRepository.findOne({
      nombre: createFuerzaDto.nombre,
    });
    if (existingFuerza) {
      throw new ConflictException('Ya existe una fuerza con ese nombre');
    }

    // Si se marca como default, desmarcar las demás
    const existingDefaultFuerza = await this.fuerzaRepository.findOne({
      esDefault: true,
    });
    if (createFuerzaDto.esDefault && existingDefaultFuerza) {
      throw new BadRequestException('Ya existe una fuerza default');
    }

    const fuerza = new Fuerza();
    Object.assign(fuerza, {
      ...createFuerzaDto,
      esDefault: createFuerzaDto.esDefault ?? false,
    });
    await em.persistAndFlush(fuerza);

    return ApiResponseDto.success(fuerza, 'Fuerza creada exitosamente');
  }

  async findAll(): Promise<ApiResponseDto<Fuerza[]>> {
    const fuerzas = await this.fuerzaRepository.findAll({
      orderBy: { nombre: 'ASC' },
    });
    return ApiResponseDto.success(fuerzas);
  }

  async findOne(id: number): Promise<ApiResponseDto<Fuerza>> {
    const fuerza = await this.fuerzaRepository.findOne({ id });
    if (!fuerza) {
      throw new NotFoundException('Fuerza no encontrada');
    }
    return ApiResponseDto.success(fuerza);
  }

  async update(
    id: number,
    updateFuerzaDto: UpdateFuerzaDto,
  ): Promise<ApiResponseDto<Fuerza>> {
    const em = this.fuerzaRepository.getEntityManager();
    const fuerza = await this.fuerzaRepository.findOne({ id });

    if (!fuerza) {
      throw new NotFoundException('Fuerza no encontrada');
    }

    // Verificar nombre único si se está actualizando
    if (updateFuerzaDto.nombre && updateFuerzaDto.nombre !== fuerza.nombre) {
      const existingFuerza = await this.fuerzaRepository.findOne({
        nombre: updateFuerzaDto.nombre,
      });
      if (existingFuerza) {
        throw new ConflictException('Ya existe una fuerza con ese nombre');
      }
    }

    const existingDefaultFuerza = await this.fuerzaRepository.findOne({
      esDefault: true,
    });
    if (
      updateFuerzaDto.esDefault &&
      !fuerza.esDefault &&
      existingDefaultFuerza
    ) {
      throw new BadRequestException('Ya existe una fuerza default');
    }

    Object.assign(fuerza, updateFuerzaDto);
    await em.flush();

    return ApiResponseDto.success(fuerza, 'Fuerza actualizada exitosamente');
  }

  async remove(id: number): Promise<ApiResponseDto> {
    const fuerza = await this.fuerzaRepository.findOne({ id });
    if (!fuerza) {
      throw new NotFoundException('Fuerza no encontrada');
    }

    await this.fuerzaRepository.getEntityManager().removeAndFlush(fuerza);
    return ApiResponseDto.success(null, 'Fuerza eliminada exitosamente');
  }
}
