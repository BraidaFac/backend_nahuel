import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import {
  RelationProperty,
  TargetProperty,
} from 'src/etl/interfaces/etl.interfaces';
import { BaseEntity } from './base.entity';
import { ImportTemplate } from './import-template.entity';

@Entity()
export class ColumnMapping extends BaseEntity {
  @Property({ type: 'string', nullable: true })
  sourceColumn?: string;

  @Property({ type: 'string', nullable: true })
  defaultValue?: string;

  @ManyToOne(() => ImportTemplate)
  template!: ImportTemplate;

  @Property({
    type: 'string',
  })
  targetProperty: TargetProperty;

  @Property({
    nullable: true,
    default: null,
  })
  relationProperty?: RelationProperty;
}
