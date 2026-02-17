import { Injectable, Logger } from '@nestjs/common';
import {
  FileParserOptions,
  IFileParser,
  ParsedFileResult,
  RawFileRow,
} from '../interfaces/etl.interfaces';

// Tipos propios para PapaParse (evitar problemas con @types/papaparse)
interface PapaParseConfig {
  delimiter?: string;
  skipEmptyLines?: boolean;
  complete?: (results: { data: string[][] }) => void;
  step?: (
    results: { data: string[] },
    parser: { pause: () => void; resume: () => void; abort: () => void },
  ) => void;
  error?: (error: Error) => void;
}

/**
 * Parser para archivos CSV usando PapaParse.
 *
 * ¿Qué hace este servicio?
 * ------------------------
 * 1. Lee archivos CSV (texto separado por comas/delimitadores)
 * 2. Convierte cada fila del CSV en un objeto JavaScript
 * 3. Soporta dos modos:
 *    - parse(): Carga todo el archivo en memoria (archivos pequeños)
 *    - parseStream(): Procesa en chunks (archivos grandes, evita quedarse sin memoria)
 */
@Injectable()
export class CsvParser implements IFileParser {
  private readonly logger = new Logger(CsvParser.name);

  /**
   * MÉTODO 1: Parseo completo en memoria
   * ------------------------------------
   * Uso: Archivos pequeños/medianos (< 50MB)
   *
   * Flujo:
   * 1. Recibe el archivo como Buffer (bytes)
   * 2. Lo convierte a texto (string)
   * 3. PapaParse lo procesa y devuelve un array de arrays
   * 4. Convertimos cada array en un objeto con claves = headers
   *
   * Ejemplo de transformación:
   *   CSV:
   *     NOMBRE,DNI,EMAIL
   *     Juan,12345678,juan@email.com
   *
   *   Resultado:
   *     [{ NOMBRE: "Juan", DNI: "12345678", EMAIL: "juan@email.com", __col_0: "Juan", ... }]
   */
  async parse(
    buffer: Buffer,
    options: FileParserOptions,
  ): Promise<ParsedFileResult> {
    // Importar papaparse dinámicamente para evitar problemas de tipos

    const Papa = await import('papaparse');

    const startTime = Date.now();

    // Opciones de configuración (con valores por defecto)
    const encoding = options.encoding || 'utf-8';
    const delimiter = options.delimiter || ',';
    const headerRow = (options.headerRow || 1) - 1; // Usuario dice "fila 1", internamente es índice 0
    const dataStartRow = (options.dataStartRow || 2) - 1; // Los datos empiezan en fila 2 por defecto

    // Convertir bytes a texto legible
    const content = buffer.toString(encoding);

    return new Promise((resolve, reject) => {
      const config: PapaParseConfig = {
        delimiter,
        skipEmptyLines: true,
        complete: (results: { data: string[][] }) => {
          try {
            const allRows = results.data;

            // Si el archivo está vacío, retornar resultado vacío
            if (allRows.length === 0) {
              resolve({
                headers: [],
                rows: [],
                totalRows: 0,
                parseTimeMs: Date.now() - startTime,
              });
              return;
            }

            // PASO 1: Extraer los headers (nombres de columnas)
            const headerRowData = allRows[headerRow] || [];
            const headers = headerRowData.map((h: string) =>
              this.normalizeHeader(h),
            );

            // PASO 2: Extraer las filas de datos (todo después del header)
            const dataRows = allRows.slice(dataStartRow);
            const rows: RawFileRow[] = [];

            // PASO 3: Convertir cada fila (array) a objeto
            for (const row of dataRows) {
              // Ignorar filas completamente vacías
              const isEmpty = row.every(
                (cell: string) => !cell || cell.trim() === '',
              );
              if (isEmpty) {
                continue;
              }

              // Crear objeto: { NOMBRE: "Juan", DNI: "12345678", ... }
              const rowObject: RawFileRow = {};
              for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                const value = row[i] as string | undefined;
                if (header) {
                  rowObject[header] = value?.trim() ?? '';
                  rowObject[`__col_${i}`] = value?.trim() ?? '';
                }
              }
              rows.push(rowObject);
            }

            resolve({
              headers,
              rows,
              totalRows: rows.length,
              parseTimeMs: Date.now() - startTime,
            });
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.logger.error(`Error parsing CSV: ${error.message}`);
            reject(error);
          }
        },
        error: (err: Error) => {
          this.logger.error(`Error parsing CSV: ${err.message}`);
          reject(err);
        },
      };

      // Ejecutar el parser

      Papa.default.parse(content, config);
    });
  }

  /**
   * MÉTODO 2: Parseo en streaming (chunks)
   * --------------------------------------
   * Uso: Archivos grandes (> 50MB)
   *
   * ¿Por qué streaming?
   * Si un archivo tiene 1 millón de filas y lo cargas todo en memoria,
   * podrías quedarte sin RAM. Con streaming procesamos de a 1000 filas
   * (o el chunkSize que quieras), las insertamos en la BD, y liberamos memoria.
   *
   * Flujo:
   * 1. PapaParse lee el archivo fila por fila (step callback)
   * 2. Acumulamos filas en un "chunk" (buffer temporal)
   * 3. Cuando el chunk llega al tamaño deseado, lo procesamos
   * 4. Vaciamos el chunk y continuamos
   */
  async parseStream(
    buffer: Buffer,
    options: FileParserOptions,
    onChunk: (rows: RawFileRow[], chunkIndex: number) => Promise<void>,
    chunkSize: number = 1000,
  ): Promise<{ totalRows: number; parseTimeMs: number }> {
    const Papa = await import('papaparse');

    const startTime = Date.now();

    const encoding = options.encoding || 'utf-8';
    const delimiter = options.delimiter || ',';
    const headerRow = (options.headerRow || 1) - 1;
    const dataStartRow = (options.dataStartRow || 2) - 1;

    const content = buffer.toString(encoding);

    // Estado del streaming
    let headers: string[] = [];
    let currentChunk: RawFileRow[] = [];
    let chunkIndex = 0;
    let totalRows = 0;
    let currentRowIndex = 0;
    let processingChunk = false;

    return new Promise((resolve, reject) => {
      const config: PapaParseConfig = {
        delimiter,
        skipEmptyLines: true,

        // step: Se llama POR CADA FILA del CSV
        step: (
          results: { data: string[] },
          parser: { pause: () => void; resume: () => void; abort: () => void },
        ) => {
          try {
            const row = results.data;

            // Primera pasada: capturar los headers
            if (currentRowIndex === headerRow) {
              headers = row.map((h: string) => this.normalizeHeader(h));
              currentRowIndex++;
              return;
            }

            // Ignorar filas antes del inicio de datos
            if (currentRowIndex < dataStartRow) {
              currentRowIndex++;
              return;
            }

            // Ignorar filas vacías
            const isEmpty = row.every(
              (cell: string) => !cell || cell.trim() === '',
            );
            if (isEmpty) {
              currentRowIndex++;
              return;
            }

            // Construir objeto de fila
            const rowObject: RawFileRow = {};
            for (let i = 0; i < headers.length; i++) {
              const header = headers[i];
              const value = row[i];
              if (header) {
                rowObject[header] = value?.trim() ?? '';
                rowObject[`__col_${i}`] = value?.trim() ?? '';
              }
            }

            currentChunk.push(rowObject);
            totalRows++;
            currentRowIndex++;

            // ¿El chunk está lleno? → Procesarlo
            if (currentChunk.length >= chunkSize && !processingChunk) {
              processingChunk = true;
              parser.pause();

              const chunkToProcess = [...currentChunk];
              const currentChunkIndex = chunkIndex;
              currentChunk = [];
              chunkIndex++;

              onChunk(chunkToProcess, currentChunkIndex)
                .then(() => {
                  processingChunk = false;
                  parser.resume();
                })
                .catch((err: unknown) => {
                  parser.abort();
                  reject(err instanceof Error ? err : new Error(String(err)));
                });
            }
          } catch (err) {
            parser.abort();
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        },

        // complete: Se llama cuando termina de leer todo el archivo
        complete: () => {
          // Procesar el chunk restante (si quedaron filas)
          if (currentChunk.length > 0) {
            onChunk(currentChunk, chunkIndex)
              .then(() => {
                resolve({
                  totalRows,
                  parseTimeMs: Date.now() - startTime,
                });
              })
              .catch((err: unknown) => {
                reject(err instanceof Error ? err : new Error(String(err)));
              });
          } else {
            resolve({
              totalRows,
              parseTimeMs: Date.now() - startTime,
            });
          }
        },

        // error: Se llama si hay un error de parsing
        error: (err: Error) => {
          this.logger.error(`Error in CSV stream parsing: ${err.message}`);
          reject(err);
        },
      };

      Papa.default.parse(content, config);
    });
  }

  /**
   * Normaliza un header para comparación consistente.
   *
   * ¿Por qué normalizar?
   * Los archivos pueden tener headers como:
   *   "Nombre Completo", "NOMBRE COMPLETO", "nombre_completo", "Nombre  Completo"
   *
   * Todos se convierten a: "NOMBRE_COMPLETO"
   *
   * Esto permite que el mapeo de columnas funcione sin importar
   * cómo esté escrito el header en el archivo original.
   */
  private normalizeHeader(header: string): string {
    if (!header) return '';
    return header
      .trim() // Quitar espacios al inicio/final
      .toUpperCase() // Todo a mayúsculas
      .replace(/\s+/g, '_') // Espacios → guión bajo
      .replace(/[^A-Z0-9_]/g, ''); // Quitar caracteres especiales
  }
}
