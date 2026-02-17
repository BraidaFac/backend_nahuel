import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * DTO para importar clientes desde archivo.
 */
export class ImportClientesDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  templateId?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  autoDetectTemplate?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  dryRun?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(5000)
  @Type(() => Number)
  batchSize?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  provinciaId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fuerzaId?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  useStreaming?: boolean;
}

/**
 * DTO para validar archivo sin importar.
 */
export class ValidateFileDto {
  @IsNumber()
  @Type(() => Number)
  templateId: number;
}
