import {
  Collection,
  Entity,
  OneToMany,
  OneToOne,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Cliente } from './cliente.entity';
import { User } from './user.entity';

@Entity()
export class Representante extends BaseEntity {
  @Property()
  fullName: string;

  @Property()
  email!: string;

  @Property({ nullable: true })
  telefono?: string;

  @OneToMany(() => Cliente, (cliente) => cliente.representante, {
    orphanRemoval: true,
  })
  clientes = new Collection<Cliente>(this);

  @OneToOne(() => User, (user) => user.representante, {
    owner: true,
  })
  user: User;
}
