import { Injectable, Logger } from '@nestjs/common';
import {
  FileParserOptions,
  IFileParser,
  ParsedFileResult,
  RawFileRow,
} from '../interfaces/etl.interfaces';

/**
 * Parser para archivos XLSX usando ExcelJS.
 *
 * ¿Qué hace este servicio?
 * ------------------------
 * 1. Lee archivos Excel (.xlsx, .xls)
 * 2. Extrae los datos de una hoja específica (o la primera por defecto)
 * 3. Convierte cada fila en un objeto JavaScript
 * 4. Maneja diferentes tipos de celdas (texto, números, fechas, fórmulas)
 *
 * Notas sobre streaming:
 * - ExcelJS tiene soporte limitado para streaming en lectura
 * - Para archivos muy grandes, se recomienda usar CSV
 * - El método parseStream() procesa en chunks DESPUÉS de cargar el archivo
 */
@Injectable()
export class XlsxParser implements IFileParser {
  private readonly logger = new Logger(XlsxParser.name);

  /**
   * MÉTODO 1: Parseo completo en memoria
   * ------------------------------------
   * Lee todo el archivo Excel y lo convierte en objetos.
   *
   * Flujo:
   * 1. Cargar el buffer en ExcelJS
   * 2. Seleccionar la hoja (por nombre o la primera)
   * 3. Extraer los headers de la fila indicada
   * 4. Convertir cada fila de datos en un objeto
   */
  async parse(
    buffer: Buffer,
    options: FileParserOptions,
  ): Promise<ParsedFileResult> {
    const startTime = Date.now();

    // Opciones con valores por defecto
    const headerRow = options.headerRow || 1;
    const dataStartRow = options.dataStartRow || 2;

    // Importar ExcelJS dinámicamente para evitar problemas de tipos

    const ExcelJS = await import('exceljs');

    const workbook = new ExcelJS.default.Workbook();

    // Cargar el archivo desde el buffer

    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    // Seleccionar la hoja de trabajo

    const worksheet = workbook.worksheets[0];

    // Si no hay ninguna hoja, retornar vacío
    if (!worksheet) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        parseTimeMs: Date.now() - startTime,
      };
    }

    // PASO 1: Extraer los headers

    const headerRowData = worksheet.getRow(headerRow);
    const headers: string[] = [];

    headerRowData.eachCell(
      { includeEmpty: true },
      (cell: unknown, colNumber: number) => {
        headers[colNumber - 1] = this.getCellValueFromAny(cell);
      },
    );

    // Eliminar headers vacíos al final del array
    while (headers.length > 0 && !headers[headers.length - 1]) {
      headers.pop();
    }

    // PASO 2: Extraer las filas de datos
    const rows: RawFileRow[] = [];

    const lastRowNum: number = worksheet.lastRow?.number || 0;

    for (let rowNum = dataStartRow; rowNum <= lastRowNum; rowNum++) {
      const row = worksheet.getRow(rowNum);

      let isEmpty = true;
      const rowObject: RawFileRow = {};

      row.eachCell(
        { includeEmpty: true },
        (cell: unknown, colNumber: number) => {
          const colIndex = colNumber - 1;
          if (colIndex < headers.length) {
            const value = this.getCellValueFromAny(cell);
            if (value) {
              isEmpty = false;
            }
            const header = headers[colIndex];
            if (header) {
              rowObject[header] = value;
            }
          }
        },
      );

      // Solo agregar filas que no estén completamente vacías
      if (!isEmpty) {
        rows.push(rowObject);
      }
    }

    return {
      headers: headers.filter(Boolean),
      rows,
      totalRows: rows.length,
      parseTimeMs: Date.now() - startTime,
    };
  }

  /**

  /**
   * Extrae el valor de una celda y lo convierte a string.
   *
   * ExcelJS puede devolver diferentes tipos de valores:
   * - string: Texto normal
   * - number: Números
   * - Date: Fechas
   * - { richText: [...] }: Texto con formato
   * - { formula: '...', result: ... }: Fórmulas
   * - { hyperlink: '...', text: '...' }: Hipervínculos
   * - { error: '...' }: Errores de Excel (#DIV/0!, etc.)
   */
  private getCellValueFromAny(cell: unknown): string {
    // Tipo para celdas de ExcelJS
    const cellObj = cell as { value?: unknown } | null | undefined;
    const value = cellObj?.value;

    if (value === null || value === undefined) {
      return '';
    }

    // Manejar diferentes tipos de valor
    if (typeof value === 'object' && value !== null) {
      // Fecha: convertir a ISO string
      if (value instanceof Date) {
        return value.toISOString();
      }

      // Castear a Record para acceder a propiedades dinámicamente
      const objValue = value as Record<string, unknown>;

      // Texto enriquecido: concatenar todos los fragmentos
      if ('richText' in objValue && Array.isArray(objValue.richText)) {
        const richTextArray = objValue.richText as Array<{ text?: string }>;
        return richTextArray.map((rt) => rt.text || '').join('');
      }

      // Fórmula: usar el resultado calculado
      if ('result' in objValue) {
        const result = objValue.result;
        if (result === null || result === undefined) return '';
        if (result instanceof Date) return result.toISOString();
        if (typeof result === 'object') {
          try {
            return JSON.stringify(result);
          } catch {
            return '';
          }
        }
        if (typeof result === 'string') return result;
        if (typeof result === 'number' || typeof result === 'boolean') {
          return String(result);
        }
        return '';
      }

      // Hipervínculo: usar el texto visible
      if ('hyperlink' in objValue) {
        const text = objValue.text;
        if (typeof text === 'string') return text;
        return '';
      }

      // Error de Excel: retornar vacío
      if ('error' in objValue) {
        return '';
      }

      // Objeto desconocido: intentar convertir a JSON
      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }

    // Valor primitivo: convertir a string y limpiar
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }
}
