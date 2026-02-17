import { PartialType } from '@nestjs/mapped-types';
import { CreateRepresentanteDto } from './create-representante.dto';

export class UpdateRepresentanteDto extends PartialType(
  CreateRepresentanteDto,
) {}
