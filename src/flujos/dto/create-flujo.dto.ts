import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoPaso } from '../../entities/paso-tramite.entity';
import { TipoPrestamo } from '../../entities/tramite.entity';

export class CreateFlujoDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  descripcion?: string;

  @IsObject()
  fuerza: { id: number };

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? null : (value as TipoPrestamo),
  )
  @IsEnum(TipoPrestamo)
  tipoPrestamo?: TipoPrestamo;

  @IsBoolean()
  activo: boolean = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoRequeridoDto)
  documentosRequeridos: DocumentoRequeridoDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PasoTramiteDto)
  pasos: PasoTramiteDto[];
}

class PasoTramiteDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  descripcion?: string;

  @IsNumber()
  orden!: number;

  @IsNumber()
  @IsOptional()
  diasMaximoSinAvance?: number;

  @IsString()
  color!: string;

  @IsEnum(TipoPaso)
  @IsOptional()
  tipoPaso?: TipoPaso;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReglaTransicionDto)
  transicionesOrigen?: ReglaTransicionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReglaTransicionDto)
  transicionesDestino?: ReglaTransicionDto[];
}

class ReglaTransicionDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsObject()
  pasoOrigen!: PasoTramiteDto;

  @IsOptional()
  @IsObject()
  pasoDestino!: PasoTramiteDto;

  @IsBoolean()
  @IsOptional()
  esAutomatico: boolean = false;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  condicionDocumentos?: any;
}

class DocumentoRequeridoDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  documento: { id: number };

  @IsBoolean()
  obligatorio: boolean = true;

  @IsBoolean()
  noNecesarioSiEsSocio: boolean = false;

  @IsBoolean()
  activo: boolean = true;
}
