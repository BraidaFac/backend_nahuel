import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { ImportTemplate } from './import-template.entity';
import { User } from './user.entity';

/**
 * Estados posibles de un batch de importación.
 */
export enum ImportBatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
}

/**
 * Entidad para registrar el historial de importaciones.
 * Permite auditoría y trazabilidad de cada proceso ETL.
 */
@Entity()
export class ImportBatch extends BaseEntity {
  /**
   * Identificador único del batch (UUID).
   */
  @Property({ length: 36, unique: true })
  batchId!: string;

  /**
   * Nombre original del archivo importado.
   */
  @Property({ length: 255 })
  fileName!: string;

  /**
   * Tamaño del archivo en bytes.
   */
  @Property()
  fileSizeBytes!: number;

  /**
   * Template utilizado para la importación (si aplica).
   */
  @ManyToOne(() => ImportTemplate, { nullable: true })
  template?: ImportTemplate;

  /**
   * Usuario que ejecutó la importación (si hay autenticación).
   */
  @ManyToOne(() => User, { nullable: true })
  executedBy?: User;

  /**
   * Estado actual del batch.
   */
  @Enum(() => ImportBatchStatus)
  status: ImportBatchStatus = ImportBatchStatus.PENDING;

  /**
   * Total de filas en el archivo (sin contar header).
   */
  @Property({ default: 0 })
  totalRows: number = 0;

  /**
   * Cantidad de registros insertados exitosamente.
   */
  @Property({ default: 0 })
  successCount: number = 0;

  /**
   * Cantidad de duplicados omitidos (internos + DB).
   */
  @Property({ default: 0 })
  skippedDuplicates: number = 0;

  /**
   * Cantidad de registros con errores de validación.
   */
  @Property({ default: 0 })
  errorCount: number = 0;

  /**
   * Detalle de errores en formato JSON.
   */
  @Property({ type: 'json', nullable: true })
  errors?: ImportError[];

  /**
   * Detalle de registros omitidos por duplicación.
   */
  @Property({ type: 'json', nullable: true })
  skippedDetails?: SkippedRecord[];

  /**
   * Tiempo de procesamiento en milisegundos.
   */
  @Property({ nullable: true })
  processingTimeMs?: number;

  /**
   * Fecha/hora de inicio del procesamiento.
   */
  @Property({ nullable: true })
  startedAt?: Date;

  /**
   * Fecha/hora de finalización del procesamiento.
   */
  @Property({ nullable: true })
  completedAt?: Date;

  /**
   * Notas o mensaje adicional sobre la importación.
   */
  @Property({ type: 'text', nullable: true })
  notes?: string;
}

/**
 * Estructura para detallar un error de importación.
 */
export interface ImportError {
  rowNumber: number;
  field?: string;
  value?: unknown;
  message: string;
  code: string;
}

/**
 * Estructura para detallar un registro omitido.
 */
export interface SkippedRecord {
  rowNumber: number;
  reason: 'INTERNAL_DUPLICATE' | 'DATABASE_DUPLICATE';
  originalData?: Record<string, unknown>;
}
