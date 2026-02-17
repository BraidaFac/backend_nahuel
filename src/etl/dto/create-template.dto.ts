import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FileType } from 'src/entities/import-template.entity';
import * as etlInterfaces from '../interfaces/etl.interfaces';
import { CreateColumnMappingDto } from './create-column-mapping.dto';

export class CreateTemplateDto {
  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion!: string;

  @IsEnum(FileType)
  fileType!: FileType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  provinciaId!: number;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsOptional()
  entity?: etlInterfaces.EntityType;

  @IsString()
  @IsOptional()
  delimiter!: string;

  @IsString()
  @IsOptional()
  sheetName!: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  headerRow!: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  dataStartRow!: number;

  @IsString()
  @IsOptional()
  encoding?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateColumnMappingDto)
  columnMappings!: CreateColumnMappingDto[];
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  id!: number;
}
