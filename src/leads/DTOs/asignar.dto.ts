import { IsArray, IsNumber } from 'class-validator';

export class AsignarLeadsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  leadIds: number[];

  @IsNumber()
  representanteId: number;
}
