import {
  Cascade,
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { FlujoTramite } from './flujo-tramite.entity';
import { HistorialPaso } from './historial-paso.entity';
import { ReglaTransicion } from './regla-transicion.entity';
import { Tramite } from './tramite.entity';

export enum TipoPaso {
  INICIAL = 'inicial',
  INTERMEDIO = 'intermedio',
  FINAL_EXITOSO = 'final_exitoso',
  FINAL_RECHAZADO = 'final_rechazado',
}

@Entity()
export class PasoTramite extends BaseEntity {
  @Property()
  nombre!: string;

  @Property({ nullable: true })
  descripcion?: string;

  @ManyToOne(() => FlujoTramite)
  flujo!: FlujoTramite;

  @Property({ nullable: true })
  diasMaximoSinAvance?: number;

  @Property()
  orden!: number;

  @Property()
  color!: string;

  @Enum(() => TipoPaso)
  @Property({ default: TipoPaso.INTERMEDIO })
  tipoPaso: TipoPaso = TipoPaso.INTERMEDIO;

  @OneToMany(() => ReglaTransicion, (regla) => regla.pasoOrigen, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
    eager: true,
  })
  transicionesOrigen = new Collection<ReglaTransicion>(this);

  @OneToMany(() => ReglaTransicion, (regla) => regla.pasoDestino, {
    eager: true,
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  transicionesDestino = new Collection<ReglaTransicion>(this);

  @OneToMany(() => HistorialPaso, (historial) => historial.paso)
  historialPasos = new Collection<HistorialPaso>(this);

  @OneToMany(() => Tramite, (tramite) => tramite.pasoActual)
  tramites = new Collection<Tramite>(this);

  esInicial(): boolean {
    return this.tipoPaso === TipoPaso.INICIAL;
  }

  esFinal(): boolean {
    return (
      this.tipoPaso === TipoPaso.FINAL_EXITOSO ||
      this.tipoPaso === TipoPaso.FINAL_RECHAZADO
    );
  }

  esExitoso(): boolean {
    return this.tipoPaso === TipoPaso.FINAL_EXITOSO;
  }

  esRechazo(): boolean {
    return this.tipoPaso === TipoPaso.FINAL_RECHAZADO;
  }

  esIntermedio(): boolean {
    return this.tipoPaso === TipoPaso.INTERMEDIO;
  }
}
