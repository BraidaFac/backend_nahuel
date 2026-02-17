import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  tipo?: string;

  @IsString()
  @IsOptional()
  archivoUrl?: string;

  @IsString()
  @IsOptional()
  archivoNombre?: string;

  @IsString()
  @IsOptional()
  archivoTipo?: string;
}
