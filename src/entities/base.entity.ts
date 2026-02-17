import { PrimaryKey, Property } from '@mikro-orm/core';

export abstract class BaseEntity {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({
    onCreate: () => new Date(),
    defaultRaw: 'NOW()',
    nullable: false,
  })
  createdAt?: Date;

  @Property({ onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date;
}
