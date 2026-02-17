import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { FileParserFactory } from '../parsers/file-parser.factory';
import { TransformationService } from '../transformers/transformation.service';
import {
  BulkInsertResult,
  BulkPersistenceService,
} from './bulk-persistence.service';
import { LookupService } from './lookup.service';
import { MappingConfigService } from './mapping-config.service';

/**
 * Servicio orquestador que coordina todo el flujo ETL.
 * Es el punto de entrada principal para las importaciones.
 */
@Injectable()
export class EtlOrchestratorService {
  private readonly logger = new Logger(EtlOrchestratorService.name);

  // Configuración por defecto
  private readonly DEFAULT_BATCH_SIZE = 1000;
  private readonly DEFAULT_CHUNK_SIZE = 1000;

  constructor(
    private readonly em: EntityManager,
    private readonly fileParserFactory: FileParserFactory,
    private readonly transformationService: TransformationService,
    private readonly mappingConfigService: MappingConfigService,
    private readonly lookupService: LookupService,
    private readonly bulkPersistenceService: BulkPersistenceService,
  ) {}

  /**
   * Ejecuta el proceso ETL completo para importar clientes.
   */
  /*  async importClientes(
    file: Express.Multer.File,
    options: ImportOptions,
  ): Promise<ImportResult> {
    const batchId = randomUUID();
    const startedAt = new Date();
    this.logger.log(
      `Starting import batch ${batchId} for file ${file.originalname}`,
    );

    // Crear registro de batch
   // const importBatch = await this.createImportBatch(batchId, file, options);

    try {
      // 1. Resolver configuración
      const processOptions = await this.resolveProcessOptions(file, options);

      // 2. Cargar contexto de lookups
      const lookupContext = await this.lookupService.getLookupContext(true);

      // 3. Detectar tipo y obtener parser
      const fileType = this.fileParserFactory.detectFileType(
        file.originalname,
        file.buffer,
      );
      const parser = this.fileParserFactory.getParser(fileType);

      // 4. Parsear archivo
      const parserOptions = processOptions.template
        ? this.mappingConfigService.getParserOptions(processOptions.template)
        : { headerRow: 1, dataStartRow: 2 };

      const parseResult = await parser.parse(file.buffer, parserOptions);
      this.logger.debug(
        `Parsed ${parseResult.totalRows} rows in ${parseResult.parseTimeMs}ms`,
      );

      // 5. Transformar filas
      const transformedRows = this.transformationService.transformRows(
        parseResult.rows,
        parserOptions.dataStartRow || 2,
        processOptions.mappings,
        lookupContext,
      );

      // Aplicar overrides de provincia/fuerza si se especificaron
      this.applyOverrides(transformedRows, processOptions);

      // 6. Deduplicar
      const dedupeResult =
        await this.deduplicationService.deduplicate(transformedRows);

      // 7. Verificar constraints únicos adicionales (DNI, teléfono)
      const uniqueCheckResult =
        await this.deduplicationService.checkUniqueConstraints(
          dedupeResult.uniqueRows,
        );

      // Deduplicar internamente por DNI y teléfono
      const finalDedupeResult =
        this.deduplicationService.deduplicateByUniqueFields(
          uniqueCheckResult.valid,
        );

      // 8. Insertar (si no es dry run)
      let insertResult = {
        insertedCount: 0,
        failedCount: 0,
        failures: [] as Array<{
          rowNumber: number;
          error: string;
          data: unknown;
        }>,
        insertTimeMs: 0,
      };

      if (!processOptions.dryRun) {
        insertResult = await this.bulkPersistenceService.bulkInsertClientes(
          finalDedupeResult.unique,
          processOptions.batchSize,
        );
      }

      // 9. Construir resultado
      const completedAt = new Date();
      const result = this.buildImportResult(
        batchId,
        file.originalname,
        parseResult.totalRows,
        dedupeResult,
        uniqueCheckResult,
        finalDedupeResult,
        insertResult,
        transformedRows,
        startedAt,
        completedAt,
      );

      // 10. Actualizar registro de batch
      await this.updateImportBatch(importBatch, result);

      this.logger.log(
        `Import batch ${batchId} completed: ` +
          `${result.successCount} inserted, ` +
          `${result.skippedDuplicates.internal + result.skippedDuplicates.database} skipped, ` +
          `${result.errorCount} errors`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Import batch ${batchId} failed: ${error}`);
      await this.failImportBatch(importBatch, error);
      throw error;
    }
  }
 */
  /**
   * Valida un archivo sin insertar datos (preview).
   */
  async importFile(
    file: Express.Multer.File,
    templateId: number,
  ): Promise<ApiResponseDto<BulkInsertResult>> {
    this.logger.debug(`Importing file ${file.originalname}`);

    const template =
      await this.mappingConfigService.findTemplateById(templateId);

    if (!template) {
      throw new NotFoundException(
        `Template con ID ${templateId} no encontrado`,
      );
    }

    // Cargar contexto de lookups
    const lookupContext = await this.lookupService.getLookupContext();

    // Detectar tipo y parsear
    const fileType = this.fileParserFactory.detectFileType(file.originalname);
    if (!fileType) {
      throw new BadRequestException('Tipo de archivo no soportado');
    }
    const parser = this.fileParserFactory.getParser(fileType);

    const parserOptions = this.mappingConfigService.getParserOptions(template);

    const parseResult = await parser.parse(file.buffer, parserOptions);

    parseResult.rows = parseResult.rows.slice(parserOptions.dataStartRow || 1);

    // Transformar
    const transformedRows = this.transformationService.transformRows(
      parseResult.rows,
      parserOptions.dataStartRow || 2,
      template.columnMappings.getItems(),
      lookupContext,
    );

    console.log('transformedRows', transformedRows);

    return new ApiResponseDto<BulkInsertResult>(
      true,
      await this.bulkPersistenceService.bulkInsertLeads(
        transformedRows,
        template,
      ),
      'Importación completada correctamente',
    );
  }
}
