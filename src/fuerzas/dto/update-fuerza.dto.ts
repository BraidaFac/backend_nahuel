import { PartialType } from '@nestjs/mapped-types';
import { CreateFuerzaDto } from './create-fuerza.dto';

export class UpdateFuerzaDto extends PartialType(CreateFuerzaDto) {}
