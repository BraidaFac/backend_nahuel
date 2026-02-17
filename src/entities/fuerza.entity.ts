import {
  Collection,
  Entity,
  Index,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Cliente } from './cliente.entity';
import { FlujoTramite } from './flujo-tramite.entity';

@Entity()
@Index({
  name: 'idx_fuerza_default_unique',
  properties: ['esDefault'],
  options: {
    unique: true,
    where: 'es_default = true',
  },
})
export class Fuerza extends BaseEntity {
  @Property()
  @Unique()
  nombre!: string;

  @Property({ nullable: true })
  descripcion?: string;

  @OneToMany(() => Cliente, (cliente) => cliente.fuerza)
  clientes = new Collection<Cliente>(this);

  @OneToMany(() => FlujoTramite, (flujo) => flujo.fuerza)
  flujos = new Collection<FlujoTramite>(this);

  @Property({ default: false })
  esDefault: boolean = false;
}
