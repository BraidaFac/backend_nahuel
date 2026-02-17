import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Fuerza } from './fuerza.entity';
import { Provincia } from './provincia.entity';
import { Representante } from './representante.entity';
import { Tramite } from './tramite.entity';

@Entity()
@Unique({ properties: ['matricula', 'fuerza'] })
export class Cliente extends BaseEntity {
  @Property()
  fullName!: string;

  @Property({ nullable: false })
  email: string;

  @Property({ nullable: false })
  @Unique()
  telefono: string;

  @Property({ nullable: false })
  @Unique()
  dni: number;

  @Property({ nullable: false })
  esSocio: boolean = false;

  @Property({ nullable: true })
  matricula?: string;

  @ManyToOne(() => Provincia, { nullable: true })
  provincia?: Provincia;

  @ManyToOne(() => Representante, { nullable: true })
  representante?: Representante;

  @ManyToOne(() => Representante)
  createdBy: Representante;

  @ManyToOne(() => Fuerza, { nullable: false })
  fuerza: Fuerza;

  @Property({ type: 'text', nullable: true })
  observaciones?: string;

  @OneToMany(() => Tramite, (tramite) => tramite.cliente)
  tramites = new Collection<Tramite>(this);
}
