/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { EstadoLead } from 'src/entities/lead.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterClienteDto extends PaginationDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  provinciaId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  representanteId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  fuerzaId?: number;

  @IsOptional()
  estado?: EstadoLead;

  @IsOptional()
  @IsString()
  search?: string;
}
