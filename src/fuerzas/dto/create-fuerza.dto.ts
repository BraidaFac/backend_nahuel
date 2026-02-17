import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFuerzaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  esDefault?: boolean;
}
