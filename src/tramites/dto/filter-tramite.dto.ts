/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoPaso } from 'src/entities/paso-tramite.entity';
import { TipoPrestamo } from 'src/entities';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterTramiteDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  fuerzaId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  estadoId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  clienteId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  provinciaId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  representanteId?: number;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  fechaDesde?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  fechaHasta?: Date = new Date();

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TipoPrestamo)
  tipoPrestamo?: TipoPrestamo;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  pasoId?: number;

  @IsOptional()
  @IsEnum(TipoPaso)
  tipoPaso?: TipoPaso;
}
