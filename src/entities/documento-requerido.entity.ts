import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Documento } from './documento.entity';
import { FlujoTramite } from './flujo-tramite.entity';

@Entity()
@Unique({ properties: ['flujo', 'documento'] })
export class DocumentoRequerido extends BaseEntity {
  @ManyToOne(() => FlujoTramite)
  flujo!: FlujoTramite;

  @ManyToOne(() => Documento)
  documento!: Documento;

  @Property({ default: true })
  obligatorio: boolean = true;

  @Property({ default: false })
  noNecesarioSiEsSocio: boolean = false;

  @Property({ default: true })
  activo: boolean = true;
}
