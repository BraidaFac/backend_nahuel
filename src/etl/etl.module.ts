import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ColumnMapping } from 'src/entities/column-mapping.entity';
import { ImportBatch } from 'src/entities/import-batch.entity';
import { ImportTemplate } from 'src/entities/import-template.entity';
import { Cliente } from '../entities/cliente.entity';
import { Fuerza } from '../entities/fuerza.entity';
import { Provincia } from '../entities/provincia.entity';
import { Representante } from '../entities/representante.entity';
import { EtlController } from './etl.controller';
import { CsvParser } from './parsers/csv.parser';
import { FileParserFactory } from './parsers/file-parser.factory';
import { XlsxParser } from './parsers/xlsx.parser';
import {
  BulkPersistenceService,
  EtlOrchestratorService,
  LookupService,
  MappingConfigService,
} from './services';
import { TransformationService } from './transformers/transformation.service';

@Module({
  imports: [
    // Registrar entidades del módulo ETL
    MikroOrmModule.forFeature([
      ImportTemplate,
      ColumnMapping,
      ImportBatch,
      // Entidades existentes necesarias para relaciones y lookups
      Cliente,
      Provincia,
      Fuerza,
      Representante,
    ]),
    /**
     * Configuración de Multer para ETL
     * --------------------------------
     * Usamos memoryStorage() en lugar de diskStorage():
     * - El archivo se carga en RAM (buffer)
     * - Se procesa inmediatamente
     * - Se descarta automáticamente al terminar la request
     * - NO se guarda en disco
     *
     * Ideal para ETL donde solo necesitamos leer los datos una vez.
     */
    MulterModule.register({
      storage: multer.memoryStorage(),
      fileFilter: (_req, file, cb) => {
        // Solo permitir CSV y Excel
        const allowedMimeTypes = [
          'text/csv',
          'text/plain', // Algunos sistemas envían CSV como text/plain
          'application/csv',
          'application/vnd.ms-excel', // .xls
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        ];

        // También validar por extensión como fallback
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const ext = file.originalname.toLowerCase().slice(-5);
        const hasValidExt = allowedExtensions.some((e) => ext.endsWith(e));

        if (allowedMimeTypes.includes(file.mimetype) || hasValidExt) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Tipo de archivo no permitido. Solo se aceptan: CSV, XLS, XLSX',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB - archivos ETL pueden ser grandes
      },
    }),
  ],
  controllers: [EtlController],
  providers: [
    // Parsers
    CsvParser,
    XlsxParser,
    FileParserFactory,
    // Transformers
    TransformationService,
    // Services
    LookupService,
    BulkPersistenceService,
    MappingConfigService,
    EtlOrchestratorService,
  ],
  exports: [
    // Exportar servicios que puedan usarse desde otros módulos
    EtlOrchestratorService,
    MappingConfigService,
    LookupService,
  ],
})
export class EtlModule {}
