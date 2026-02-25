import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateRepresentanteDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  password: string;

  @IsString()
  username: string;
}
