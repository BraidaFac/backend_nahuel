import {
  Collection,
  Entity,
  Index,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Cliente } from './cliente.entity';

@Entity()
@Index({
  name: 'idx_provincia_default_unique',
  properties: ['esDefault'],
  options: {
    unique: true,
    where: 'es_default = true',
  },
})
export class Provincia extends BaseEntity {
  @Property()
  nombre!: string;

  @OneToMany(() => Cliente, (cliente) => cliente.provincia)
  clientes = new Collection<Cliente>(this);

  @Property({ default: false })
  esDefault: boolean = false;
}
