import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { EntityType } from 'src/etl/interfaces/etl.interfaces';
import { BaseEntity } from './base.entity';
import { ColumnMapping } from './column-mapping.entity';
import { Provincia } from './provincia.entity';

export enum FileType {
  CSV = 'csv',
  XLSX = 'xlsx',
}

@Entity()
@Unique({ properties: ['nombre'] })
export class ImportTemplate extends BaseEntity {
  @Property({ length: 255 })
  nombre!: string;

  @Property({ type: 'text', nullable: true })
  descripcion?: string;

  @Enum(() => FileType)
  fileType!: FileType;

  @Property()
  entityType: string;

  entity?: EntityType;

  /**
   * Provincia asociada a este template (opcional).
   * Permite filtrar templates por provincia.
   */
  @ManyToOne(() => Provincia, { nullable: true })
  provincia?: Provincia;

  /**
   * Delimitador para archivos CSV.
   * Default: ',' (coma)
   */
  @Property({ length: 10, nullable: true, default: ',' })
  delimiter?: string;

  /**
   * Nombre de la hoja para archivos XLSX.
   * Si no se especifica, se usa la primera hoja.
   */
  @Property({ length: 255, nullable: true })
  sheetName?: string;

  /**
   * Número de fila donde están los headers (1-indexed).
   * Default: 1 (primera fila)
   */
  @Property({ default: 1 })
  headerRow: number = 1;

  /**
   * Número de fila donde empiezan los datos (1-indexed).
   * Default: 2 (segunda fila, después del header)
   */
  @Property({ default: 2 })
  dataStartRow: number = 2;

  /**
   * Encoding del archivo CSV.
   * Default: 'utf-8'
   */
  @Property({ length: 50, nullable: true, default: 'utf-8' })
  encoding?: string;

  /**
   * Si el template está activo y disponible para uso.
   */
  @Property({ default: true })
  isActive: boolean = true;

  @OneToMany(() => ColumnMapping, (mapping) => mapping.template, {
    orphanRemoval: true,
  })
  columnMappings = new Collection<ColumnMapping>(this);
}
