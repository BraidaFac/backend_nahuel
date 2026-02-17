import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  fullName: string;

  @IsNumber()
  @Type(() => Number)
  dni: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  matricula?: string;

  @IsString()
  telefono: string;

  @IsNumber()
  @Type(() => Number)
  provinciaId: number;

  @IsNumber()
  @Type(() => Number)
  fuerzaId: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  representanteId?: number;

  @IsBoolean()
  @IsOptional()
  esSocio?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
