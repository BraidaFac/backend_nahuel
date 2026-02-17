import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { PasoTramite } from './paso-tramite.entity';

@Entity()
export class ReglaTransicion extends BaseEntity {
  @ManyToOne(() => PasoTramite)
  pasoOrigen!: PasoTramite;

  @ManyToOne(() => PasoTramite)
  pasoDestino!: PasoTramite;

  @Property({ default: false })
  esAutomatico: boolean = false;

  @Property({ type: 'json', nullable: true })
  condicionDocumentos?: any; // JSON con condiciones para transición automática

  @Property({ nullable: true })
  descripcion?: string;
}
