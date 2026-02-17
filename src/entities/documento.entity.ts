import { Collection, Entity, OneToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { DocumentoRequerido } from './documento-requerido.entity';
import { TramiteDocumento } from './tramite-documento.entity';

@Entity()
export class Documento extends BaseEntity {
  @Property()
  nombre!: string;

  @Property({ nullable: true })
  descripcion?: string;

  @OneToMany(() => DocumentoRequerido, (docReq) => docReq.documento)
  documentosRequeridos = new Collection<DocumentoRequerido>(this);

  @OneToMany(() => TramiteDocumento, (tramiteDoc) => tramiteDoc.documento)
  tramiteDocumentos = new Collection<TramiteDocumento>(this);
}
