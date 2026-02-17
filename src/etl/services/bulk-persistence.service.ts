import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { ImportTemplate } from 'src/entities/import-template.entity';
import { EstadoLead, Lead } from 'src/entities/lead.entity';
import { Fuerza } from '../../entities/fuerza.entity';
import { Provincia } from '../../entities/provincia.entity';
import { Representante } from '../../entities/representante.entity';
import {
  RowProcessingResult,
  RowProcessingStatus,
} from '../interfaces/etl.interfaces';

/**
 * Resultado de una operación de bulk insert.
 */
export interface BulkInsertResult {
  insertedCount: number;
  failedCount: number;
  failures: Array<{
    rowNumber: number;
    error: string;
  }>;
  insertTimeMs: number;
}

/**
 * Servicio para inserción masiva optimizada de loads.
 * Utiliza batches y manejo de errores parciales.
 */
@Injectable()
export class BulkPersistenceService {
  private readonly logger = new Logger(BulkPersistenceService.name);

  // Tamaño de batch para inserciones
  private readonly DEFAULT_BATCH_SIZE = 100;

  constructor(private readonly em: EntityManager) {}

  /**
   * Inserta múltiples leads en batches.
   * Maneja errores parciales sin abortar todo el proceso.
   */
  async bulkInsertLeads(
    rows: RowProcessingResult[],
    template: ImportTemplate,
    batchSize: number = this.DEFAULT_BATCH_SIZE,
  ): Promise<BulkInsertResult> {
    const startTime = Date.now();
    let insertedCount = 0;
    const failures: BulkInsertResult['failures'] = [];

    // Filtrar solo filas exitosas con datos transformados
    const validRows = rows.filter(
      (r) => r.status === RowProcessingStatus.SUCCESS && r.transformedData,
    );

    if (validRows.length === 0) {
      return {
        insertedCount: 0,
        failedCount: 0,
        failures: [],
        insertTimeMs: Date.now() - startTime,
      };
    }

    // Procesar en batches
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      try {
        await this.insertBatch(batch, template);
      } catch {
        for (const row of batch) {
          try {
            await this.em.persistAndFlush(row);
            insertedCount++;
          } catch (error) {
            failures.push({
              rowNumber: row.rowNumber,
              error: this.parseDbError(
                error instanceof Error ? error.message : 'Error desconocido',
              ),
            });
          }
        }
      }
    }

    return {
      insertedCount,
      failedCount: failures.length,
      failures,
      insertTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Inserta un batch de loads.
   * Intenta inserción en grupo, si falla hace fallback a inserción individual.
   */
  private async insertBatch(
    rows: RowProcessingResult[],
    template: ImportTemplate,
  ): Promise<void> {
    // Intentar inserción en grupo usando un EntityManager separado
    const forkedEm = this.em.fork();

    const leads = rows.map((row) =>
      this.createLeadEntity(forkedEm, row, template),
    );
    await forkedEm.persistAndFlush(leads);
  }

  private async insertIndividually(leads: Lead[]): Promise<{
    inserted: number;
    failures: BulkInsertResult['failures'];
  }> {
    let inserted = 0;
    const failures: BulkInsertResult['failures'] = [];
    for (const lead of leads) {
      try {
        await this.em.persistAndFlush(lead);
        inserted++;
      } catch (error) {
        failures.push({
          rowNumber: leads.indexOf(lead) + 1,
          error: this.parseDbError(
            error instanceof Error ? error.message : 'Error desconocido',
          ),
        });
      }
    }
    return { inserted: inserted, failures: failures };
  }

  /**
   * Crea una entidad Cliente desde los datos transformados.
   */
  private createLeadEntity(
    em: EntityManager,
    row: RowProcessingResult,
    template: ImportTemplate,
  ): Lead {
    const lead = new Lead();
    const data = row.transformedData!;

    lead.fullName = row.transformedData!.fullName as string;
    lead.email = data.email as string;
    lead.telefono = data.telefono as string;
    lead.estado = data.estado as EstadoLead;

    if (data.fuerza) {
      lead.fuerza = em.getReference(Fuerza, Number(data.fuerza));
    }

    if (data.provincia) {
      lead.provincia = em.getReference(Provincia, Number(data.provincia));
    } else {
      lead.provincia = template.provincia;
    }

    if (data.representante) {
      lead.representante = em.getReference(
        Representante,
        Number(data.representante),
      );
    }

    return lead;
  }

  /**
   * Parsea errores de base de datos a mensajes amigables.
   */
  private parseDbError(errorMessage: string): string {
    // Duplicate entry para campos únicos
    if (errorMessage.includes('Duplicate entry')) {
      if (errorMessage.includes('telefono')) {
        return 'Teléfono duplicado en base de datos';
      }
      if (errorMessage.includes('dni')) {
        return 'DNI duplicado en base de datos';
      }
      if (errorMessage.includes('matricula')) {
        return 'Matrícula+Fuerza duplicada en base de datos';
      }
      return 'Registro duplicado en base de datos';
    }

    // Foreign key violations
    if (errorMessage.includes('foreign key constraint')) {
      if (errorMessage.includes('fuerza')) {
        return 'Fuerza no existe';
      }
      if (errorMessage.includes('provincia')) {
        return 'Provincia no existe';
      }
      if (errorMessage.includes('representante')) {
        return 'Representante no existe';
      }
      return 'Referencia a entidad inexistente';
    }

    // Constraint violations
    if (errorMessage.includes('cannot be null')) {
      return 'Campo requerido está vacío';
    }

    return errorMessage;
  }
}
