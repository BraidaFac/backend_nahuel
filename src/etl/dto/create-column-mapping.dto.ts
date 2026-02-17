import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RelationProperty, TargetProperty } from '..';

export class CreateColumnMappingDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  id?: number;

  @IsString()
  sourceColumn!: string;
  @IsString()
  @IsOptional()
  defaultValue?: string;
  @IsEnum(TargetProperty)
  @IsNotEmpty()
  targetProperty: TargetProperty;
  @IsEnum(RelationProperty)
  @IsOptional()
  relationProperty?: RelationProperty;
}

export class UpdateColumnMappingDto extends PartialType(
  CreateColumnMappingDto,
) {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  id!: number;
}
