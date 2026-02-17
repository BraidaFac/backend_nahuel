import { IsOptional, IsString } from 'class-validator';

export class AdvanceStateDto {
  @IsString()
  @IsOptional()
  observaciones?: string;
}
