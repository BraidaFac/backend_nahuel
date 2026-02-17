import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Fuerza } from './fuerza.entity';
import { Provincia } from './provincia.entity';
import { Representante } from './representante.entity';

@Entity()
@Unique({ properties: ['telefono'] })
export class Lead extends BaseEntity {
  @Property()
  fullName!: string;

  @Property({ nullable: true })
  email?: string;

  @Property({ nullable: false })
  @Unique()
  telefono: string;

  @ManyToOne(() => Provincia, { nullable: true })
  provincia?: Provincia;

  @ManyToOne(() => Representante, { nullable: true })
  representante?: Representante;

  @ManyToOne(() => Fuerza, { nullable: true })
  fuerza?: Fuerza;

  @Enum(() => EstadoLead)
  @Property({ nullable: true })
  estado: EstadoLead = EstadoLead.PENDIENTE;
}

export enum EstadoLead {
  PENDIENTE = 'PENDIENTE',
  CONTACTADO = 'CONTACTADO',
  NO_CONTACTADO = 'NO_CONTACTADO',
  CALIFICADO = 'CALIFICADO',
  NO_CALIFICADO = 'NO_CALIFICADO',
}
