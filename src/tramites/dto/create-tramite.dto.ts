import { Type } from 'class-transformer';
import {
  IsEnum,
  IsJSON,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoPrestamo } from '../../entities/tramite.entity';

export class CreateTramiteDto {
  @IsNumberString()
  clienteId!: number;

  @IsString()
  @IsOptional()
  clienteName?: string;

  @IsEnum(TipoPrestamo)
  tipoPrestamo: TipoPrestamo;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  montoSolicitado?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsJSON()
  @IsOptional()
  documentosData?: string;

  @Type(() => Number)
  @IsNumber()
  flujoId: number;
}
