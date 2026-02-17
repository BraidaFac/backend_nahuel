/**
 * Fila cruda extraída del archivo CSV/XLSX.
 * Las claves son los nombres de columna, los valores son strings sin procesar.
 */
export interface RawFileRow {
  [columnName: string]: unknown;
}

/**
 * Opciones para el parser de archivos.
 */
export interface FileParserOptions {
  delimiter?: string;
  encoding?: BufferEncoding;
  headerRow?: number;
  dataStartRow?: number;
  sheetName?: string;
}

/**
 * Resultado del parsing de un archivo.
 */
export interface ParsedFileResult {
  headers: string[];
  rows: RawFileRow[];
  totalRows: number;
  parseTimeMs: number;
}

/**
 * Estado de procesamiento de una fila.
 */
export enum RowProcessingStatus {
  SUCCESS = 'SUCCESS',
  SKIPPED_INTERNAL_DUPLICATE = 'SKIPPED_INTERNAL_DUPLICATE',
  SKIPPED_DB_DUPLICATE = 'SKIPPED_DB_DUPLICATE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TRANSFORMATION_ERROR = 'TRANSFORMATION_ERROR',
}

/**
 * Resultado del procesamiento de una fila individual.
 */
export interface RowProcessingResult {
  rowNumber: number;
  status: RowProcessingStatus;
  originalData: RawFileRow;
  transformedData?: Record<string, string | number | boolean>;
  error?: {
    code: string;
    message: string;
    field?: string;
    value?: unknown;
  };
}

/**
 * Resultado completo de una importación.
 */
export interface ImportResult {
  batchId: string;
  fileName: string;
  totalProcessed: number;
  successCount: number;
  skippedDuplicates: number;
  errorCount: number;
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
  skipped: Array<{
    rowNumber: number;
    reason: string;
  }>;
  processingTimeMs: number;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Contexto de lookup para transformaciones que requieren búsqueda en BD.
 */
export interface LookupContext {
  provincias: Map<string, number>; // nombre normalizado → id
  fuerzas: Map<string, number>;
  representantes: Map<string, number>;
  defaultProvincia: number;
  defaultFuerza: number;
}

/**
 * Estadísticas de procesamiento por chunk.
 */
export interface ChunkStats {
  chunkNumber: number;
  rowsProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  processingTimeMs: number;
}

/**
 * Interface para los parsers de archivos.
 */
export interface IFileParser {
  parse(buffer: Buffer, options: FileParserOptions): Promise<ParsedFileResult>;
}

/**
 * Información sobre una propiedad destino del modelo Cliente.
 */
export interface TargetPropertyInfo {
  property: EntityProperty;
}

export interface EntityType {
  name: string;
  displayName: string;
  entityProperties: EntityProperty[];
}
export interface EntityProperty {
  name: string;
  displayName: string;
  type: string;
  isRequired: boolean;
  options?: { value: string; label: string }[];
}

/**
 * Información sobre un tipo de transformación.
 */
export interface TransformationInfo {
  name: string;
  displayName: string;
  description: string;
}

export enum RelationProperty {
  PROVINCIA = 'PROVINCIA',
  FUERZA = 'FUERZA',
  REPRESENTANTE = 'REPRESENTANTE',
}

export enum TargetProperty {
  PROVINCIA = 'provincia',
  FUERZA = 'fuerza',
  REPRESENTANTE = 'representante',
  FULL_NAME = 'fullName',
  EMAIL = 'email',
  TELEFONO = 'telefono',
  ESTADO = 'estado',
}
