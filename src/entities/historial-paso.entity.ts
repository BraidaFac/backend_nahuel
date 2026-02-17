import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { PasoTramite } from './paso-tramite.entity';
import { Tramite } from './tramite.entity';

@Entity()
export class HistorialPaso extends BaseEntity {
  @ManyToOne(() => Tramite)
  tramite!: Tramite;

  @ManyToOne(() => PasoTramite)
  paso!: PasoTramite;

  @Property()
  fechaInicio!: Date;

  @Property({ nullable: true })
  fechaFin?: Date;

  @Property({ type: 'text', nullable: true })
  observaciones?: string;

  @Property({ nullable: true })
  usuarioResponsable?: string; // Usuario que realizó el cambio manual
}
