import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProvinciaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsBoolean()
  @IsOptional()
  esDefault?: boolean;
}
