import {
  Cascade,
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { DocumentoRequerido } from './documento-requerido.entity';
import { Fuerza } from './fuerza.entity';
import { PasoTramite } from './paso-tramite.entity';
import { TipoPrestamo, Tramite } from './tramite.entity';

@Entity() //Definicion del tramite
export class FlujoTramite extends BaseEntity {
  @Property()
  nombre!: string;

  @Property({ nullable: true })
  descripcion?: string;

  @ManyToOne(() => Fuerza)
  fuerza!: Fuerza;

  @Property({ nullable: true })
  tipoPrestamo?: TipoPrestamo;

  @Property({ default: true })
  activo: boolean = true;

  @OneToMany(() => PasoTramite, (paso) => paso.flujo, {
    cascade: [Cascade.ALL],
    eager: true,
    orphanRemoval: true,
  })
  pasos = new Collection<PasoTramite>(this);

  @OneToMany(() => DocumentoRequerido, (docReq) => docReq.flujo, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
    eager: true,
  })
  documentosRequeridos = new Collection<DocumentoRequerido>(this);

  @OneToMany(() => Tramite, (tramite) => tramite.flujo)
  tramites = new Collection<Tramite>(this);

  getFirstPaso(): PasoTramite | undefined {
    const pasos = this.pasos.getItems();
    if (pasos.length === 0) {
      return undefined;
    }
    return pasos.sort((a, b) => a.id - b.id)[0];
  }

  getLastPaso(): PasoTramite | undefined {
    const pasos = this.pasos.getItems();
    if (pasos.length === 0) {
      return undefined;
    }
    return pasos.sort((a, b) => b.id - a.id)[0];
  }
}
