import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Documento } from './documento.entity';
import { Tramite } from './tramite.entity';

export enum EstadoDocumento {
  PENDIENTE = 'Pendiente',
  RECIBIDO = 'Recibido',
  RECHAZADO = 'Rechazado',
  ACEPTADO = 'Aceptado',
}

@Entity()
export class TramiteDocumento extends BaseEntity {
  @ManyToOne(() => Tramite)
  tramite!: Tramite;

  @ManyToOne(() => Documento, { eager: true })
  documento!: Documento;

  @Property({ nullable: true })
  fechaSubida?: Date;

  @Enum(() => EstadoDocumento)
  @Property({ default: EstadoDocumento.PENDIENTE })
  estado: EstadoDocumento = EstadoDocumento.PENDIENTE;

  @Property({ nullable: true })
  urlArchivo?: string;

  @Property({ type: 'text', nullable: true })
  observaciones?: string;

  @Property({ type: 'text', nullable: true })
  archivoNombre?: string;

  @Property({ type: 'text', nullable: true })
  @Enum(() => DocumentoTipo)
  archivoTipo?: DocumentoTipo;
}

export enum DocumentoTipo {
  pdf = 'application/pdf',
  jpeg = 'image/jpeg',
  png = 'image/png',
  jpg = 'image/jpg',
}
