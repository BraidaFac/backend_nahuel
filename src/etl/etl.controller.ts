import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ColumnMapping } from 'src/entities/column-mapping.entity';
import { ImportTemplate } from 'src/entities/import-template.entity';
import { ApiResponseDto } from '../common/dto/api-response.dto';

import { entities } from './datos';
import {
  CreateColumnMappingDto,
  UpdateColumnMappingDto,
} from './dto/create-column-mapping.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/create-template.dto';
import { ValidateFileDto } from './dto/import-clientes.dto';
import { EntityProperty, EntityType } from './interfaces/etl.interfaces';
import { FileParserFactory } from './parsers/file-parser.factory';
import {
  BulkInsertResult,
  EtlOrchestratorService,
  MappingConfigService,
} from './services';

// Configuración de Multer para archivos
const fileUploadOptions = {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = file.originalname
      .toLowerCase()
      .slice(file.originalname.lastIndexOf('.'));

    if (
      allowedMimes.includes(file.mimetype) ||
      allowedExtensions.includes(ext)
    ) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          'Formato de archivo no soportado. Use CSV o XLSX.',
        ),
        false,
      );
    }
  },
};

@Controller('etl')
export class EtlController {
  constructor(
    private readonly etlOrchestrator: EtlOrchestratorService,
    private readonly mappingConfigService: MappingConfigService,
    private readonly fileParserFactory: FileParserFactory,
  ) {}

  // ==================== IMPORTACIÓN ====================

  /**
   * Importa clientes desde un archivo CSV/XLSX.
   */
  /*  @Post('import-clientes')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', fileUploadOptions))
  async importClientes(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportClientesDto,
  ): Promise<ApiResponseDto<ImportResult>> {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    const options = {
      templateId: dto.templateId,
      autoDetectTemplate: dto.autoDetectTemplate ?? true,
      dryRun: dto.dryRun ?? false,
      batchSize: dto.batchSize,
      provinciaId: dto.provinciaId,
      fuerzaId: dto.fuerzaId,
    };

    let result: ImportResult;

    if (dto.useStreaming) {
      result = await this.etlOrchestrator.importClientesStreaming(
        file,
        options,
      );
    } else {
      result = await this.etlOrchestrator.importClientes(file, options);
    }

    const message =
      result.errorCount > 0
        ? `Importación completada con ${result.errorCount} errores`
        : `Importación completada exitosamente`;

    return ApiResponseDto.success(result, message);
  }
 */
  /**
   * Valida un archivo sin importar (preview).
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', fileUploadOptions))
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ValidateFileDto,
  ): Promise<ApiResponseDto<BulkInsertResult>> {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    const result = await this.etlOrchestrator.importFile(file, dto.templateId);

    return ApiResponseDto.success(
      result.data,
      'Archivo importado exitosamente',
    );
  }

  // ==================== TEMPLATES ====================

  /**
   * Lista todos los templates de importación.
   */
  @Get('templates')
  async getTemplates(): Promise<ApiResponseDto<ImportTemplate[]>> {
    const templates = await this.mappingConfigService.findAllTemplates();
    console.log(templates);
    return ApiResponseDto.success(templates);
  }

  /**
   * Obtiene un template por ID.
   */
  @Get('templates/:id')
  async getTemplate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<ImportTemplate>> {
    const template = await this.mappingConfigService.findTemplateById(id);

    console.log(template);
    return ApiResponseDto.success(template);
  }

  /**
   * Crea un nuevo template.
   */
  @Post('templates')
  async createTemplate(
    @Body() dto: CreateTemplateDto,
  ): Promise<ApiResponseDto<ImportTemplate>> {
    const template = await this.mappingConfigService.createTemplate(dto);
    return ApiResponseDto.success(template, 'Template creado exitosamente');
  }

  /**
   * Actualiza un template.
   */
  @Put('templates/:id')
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ): Promise<ApiResponseDto<ImportTemplate>> {
    console.log(dto);
    const template = await this.mappingConfigService.updateTemplate(id, dto);
    return ApiResponseDto.success(
      template,
      'Template actualizado exitosamente',
    );
  }

  /**
   * Elimina (desactiva) un template.
   */
  @Delete('templates/:id')
  async deleteTemplate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<null>> {
    await this.mappingConfigService.deleteTemplate(id);
    return ApiResponseDto.success(null, 'Template eliminado exitosamente');
  }

  // ==================== COLUMN MAPPINGS ====================

  /**
   * Agrega un mapeo de columna a un template.
   */
  @Post('templates/:templateId/mappings')
  async addColumnMapping(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() dto: CreateColumnMappingDto,
  ): Promise<ApiResponseDto<ColumnMapping>> {
    const mapping = await this.mappingConfigService.addColumnMapping(
      templateId,
      dto,
    );
    return ApiResponseDto.success(mapping, 'Mapeo creado exitosamente');
  }

  /**
   * Actualiza un mapeo de columna.
   */
  @Put('mappings/:id')
  async updateColumnMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColumnMappingDto,
  ): Promise<ApiResponseDto<ColumnMapping>> {
    const mapping = await this.mappingConfigService.updateColumnMapping(
      id,
      dto,
    );
    return ApiResponseDto.success(mapping, 'Mapeo actualizado exitosamente');
  }

  /**
   * Elimina un mapeo de columna.
   */
  @Delete('mappings/:id')
  async deleteColumnMapping(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<null>> {
    await this.mappingConfigService.deleteColumnMapping(id);
    return ApiResponseDto.success(null, 'Mapeo eliminado exitosamente');
  }

  /**
   * Obtiene las propiedades válidas para una entidad específica.
   * Usado por el frontend para configurar mapeos dinámicamente.
   */
  @Get('entities/:entityType/properties')
  getEntityProperties(
    @Param('entityType') entityType: string,
  ): ApiResponseDto<EntityProperty[]> {
    const properties =
      this.mappingConfigService.getEntityProperties(entityType);
    return ApiResponseDto.success(properties);
  }

  /**
   * Obtiene los tipos de entidad disponibles.
   */
  @Get('entities')
  getAvailableEntityTypes(): ApiResponseDto<EntityType[]> {
    return ApiResponseDto.success(entities);
  }
}
