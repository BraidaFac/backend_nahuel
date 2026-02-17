import { Injectable, Logger } from '@nestjs/common';
import { ColumnMapping } from 'src/entities/column-mapping.entity';
import {
  LookupContext,
  RawFileRow,
  RelationProperty,
  RowProcessingResult,
  RowProcessingStatus,
} from '../interfaces/etl.interfaces';

/**
 * Servicio de transformación que aplica mapeos de columnas a las filas crudas.
 */
@Injectable()
export class TransformationService {
  private readonly logger = new Logger(TransformationService.name);

  constructor() {}

  /**
   * Transforma una fila cruda usando los mapeos de columnas.
   */
  transformRow(
    row: RawFileRow,
    rowNumber: number,
    mappings: ColumnMapping[],
    lookupContext?: LookupContext,
  ): RowProcessingResult {
    const errors: any[] = [];
    const transformedData: Record<string, string | number> = {};

    for (const mapping of mappings) {
      // Obtener valor de la columna origen
      const rawValue: string | undefined = this.getSourceValue(row, mapping);
      // Aplicar valor por defecto si está vacío
      // Si el campo está vacío y no es requerido, continuar
      if (this.isEmpty(rawValue)) {
        continue;
      }

      // Aplicar transformación
      const capitalizedValue: string = this.capitalize(rawValue!);

      let transformedValue: number | string | undefined = undefined;
      // Aplicar lookups si es necesario
      if (mapping.relationProperty) {
        transformedValue = this.applyLookup(
          capitalizedValue,
          lookupContext,
          mapping.relationProperty,
        );
        transformedData[mapping.targetProperty] = transformedValue!;
      } else {
        transformedData[mapping.targetProperty] = capitalizedValue;
      }
    }

    // Determinar estado del resultado
    if (errors.length > 0) {
      return {
        rowNumber,
        status: RowProcessingStatus.TRANSFORMATION_ERROR,
        originalData: row,
        error: errors[0] as {
          code: string;
          message: string;
          field?: string;
          value?: unknown;
        }, // Primer error como principal
      };
    }

    // Validar que el objeto transformado tenga los campos mínimos requeridos
    return {
      rowNumber,
      status: RowProcessingStatus.SUCCESS,
      originalData: row,
      transformedData,
    };
  }

  /**
   * Capitaliza el valor de una cadena.
   */
  private capitalize(value: string): string {
    const trimmed = value?.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  /**
   * Transforma múltiples filas.
   */
  transformRows(
    rows: RawFileRow[],
    startRowNumber: number,
    mappings: ColumnMapping[],
    lookupContext?: LookupContext,
  ): RowProcessingResult[] {
    return rows.map((row, index) =>
      this.transformRow(row, startRowNumber + index, mappings, lookupContext),
    );
  }

  /**
   * Normaliza el nombre de columna para matching.
   */
  private normalizeColumnName(name: string): string {
    name = name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    //si el nombre tiene palabras como "activo" o "retirado"
    //remover la palabra
    if (name.includes('ACTIVO')) {
      name = name.replace('ACTIVO', '');
    }
    if (name.includes('RETIRADO')) {
      name = name.replace('RETIRADO', '');
    }

    //si tiene un guion al final quiero quitarlo
    if (
      name.endsWith('-') ||
      name.endsWith('_') ||
      name.endsWith('.') ||
      name.endsWith(' ')
    ) {
      name = name.slice(0, -1);
    }

    return name;
  }

  /**
   * Obtiene el valor de la columna origen.
   */
  private getSourceValue(
    row: RawFileRow,
    mapping: ColumnMapping,
  ): string | undefined {
    const sourceColumn = mapping.sourceColumn;
    console.log('sourceColumn', sourceColumn);
    if (sourceColumn && row[sourceColumn] !== undefined) {
      return row[sourceColumn] as string | undefined;
    }
    return mapping.defaultValue ?? undefined;
  }

  /**
   * Verifica si un valor está vacío.
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  }

  /**
   * Aplica un lookup usando el contexto.
   */
  private applyLookup(
    value: string,
    context?: LookupContext,
    relationProperty?: RelationProperty,
  ): number | string | undefined {
    if (!context) return undefined;

    const normalizedValue = this.normalizeColumnName(value);

    switch (relationProperty) {
      case RelationProperty.PROVINCIA:
        return (
          context.provincias.get(normalizedValue) ?? context.defaultProvincia
        );
      case RelationProperty.FUERZA:
        return context.fuerzas.get(normalizedValue) ?? context.defaultFuerza;
      case RelationProperty.REPRESENTANTE:
        return context.representantes.get(normalizedValue) ?? undefined;
      default:
        return undefined;
    }
  }
}
