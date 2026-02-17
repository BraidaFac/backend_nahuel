import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoLead } from 'src/entities/lead.entity';

export class LeadDto {
  @IsEnum(EstadoLead)
  @IsOptional()
  estado: EstadoLead;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
