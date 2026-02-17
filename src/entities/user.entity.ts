import {
  Cascade,
  Entity,
  Enum,
  OneToOne,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Representante } from './representante.entity';

export enum Role {
  ADMIN = 'ADMIN',
  REPRESENTANTE = 'REPRESENTANTE',
  MANAGER = 'MANAGER',
}

@Entity()
export class User extends BaseEntity {
  @Property()
  @Unique()
  username!: string;

  @Property()
  @Unique()
  email!: string;

  @Property({})
  passwordHash!: string;

  @Enum(() => Role)
  role: Role = Role.REPRESENTANTE;

  @OneToOne(() => Representante, (representante) => representante.user, {
    mappedBy: 'user',
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  representante: Representante;
}
