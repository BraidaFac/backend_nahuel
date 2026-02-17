import type { EventArgs } from '@mikro-orm/core';
import {
  BeforeCreate,
  Cascade,
  Collection,
  Entity,
  EntityManager,
  Enum,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Cliente } from './cliente.entity';
import { FlujoTramite } from './flujo-tramite.entity';
import { HistorialPaso } from './historial-paso.entity';
import { PasoTramite } from './paso-tramite.entity';
import { TramiteDocumento } from './tramite-documento.entity';

export enum TipoPrestamo {
  EXTRAORDINARIO = 'extraordinario', // Extraordinario +70
  PORCAJA = 'porcaja', // Por caja
  PORHABERES = 'porhaberes', // Por haberes
  PORHABERES_CON_CANCELACION_SMSV = 'porhaberes_con_cancelacion_smsv', // Por haberes con cancelacion smsv
  PORHABERES_CON_CANCELACION_OTROS = 'porhaberes_con_cancelacion_otros', // Por haberes con cancelacion otros
  TARJETA_DE_CREDITO = 'tarjeta_de_credito', // Tarjeta de credito
  OTROS = 'otros', // Otros
}

// Interfaces para estadísticas del dashboard
export interface EstadisticasPorPaso {
  pasoId: number;
  pasoNombre: string;
  pasoColor: string;
  cantidad: number;
  tramites: Tramite[];
}

export interface EstadisticasPorFuerza {
  fuerzaId: number;
  fuerzaNombre: string;
  cantidad: number;
  porPaso: EstadisticasPorPaso[];
}

export interface EstadisticasPorTipoPrestamo {
  tipoPrestamo: TipoPrestamo;
  cantidad: number;
  tramites: Tramite[];
}

export interface Estadisticas {
  totalTramites: number;
  tramitesActivos: number;
  tramitesConRetraso: number;
  tramitesUltimaSemana: number;
  porPaso: EstadisticasPorPaso[];
  porFuerza: EstadisticasPorFuerza[];
  porTipoPrestamo: EstadisticasPorTipoPrestamo[];
  tramitesRecientes: Tramite[];
}

@Entity()
export class Tramite extends BaseEntity {
  @ManyToOne(() => Cliente)
  cliente!: Cliente;

  @Enum(() => TipoPrestamo)
  @Property({ nullable: false })
  tipoPrestamo: TipoPrestamo;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  montoSolicitado?: number;

  @ManyToOne(() => FlujoTramite)
  flujo!: FlujoTramite;

  @Property({ nullable: true })
  fechaPago?: Date; //al final  del tramite debe tener una fecha de pago

  @ManyToOne(() => PasoTramite)
  pasoActual!: PasoTramite;

  @Property({ nullable: true })
  fechaUltimoContacto?: Date;

  @Property({ unique: true })
  numeroTramite?: number;

  @Property({ type: 'text', nullable: true })
  observaciones?: string;

  @OneToMany(() => TramiteDocumento, (tramiteDoc) => tramiteDoc.tramite, {
    eager: true,
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  tramiteDocumentos = new Collection<TramiteDocumento>(this);

  @OneToMany(() => HistorialPaso, (historial) => historial.tramite, {
    eager: true,
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  historialPasos = new Collection<HistorialPaso>(this);

  /**
   * Hook que se ejecuta antes de crear un nuevo trámite
   * Genera automáticamente el número de trámite secuencial
   */
  @BeforeCreate()
  async generateNumeroTramite(args: EventArgs<Tramite>) {
    const em: EntityManager = args.em;

    // Buscar el último número de trámite usando el repositorio
    const tramites = await em.find(
      Tramite,
      {},
      {
        orderBy: { numeroTramite: 'DESC' },
        limit: 1,
        fields: ['numeroTramite'],
      },
    );

    const ultimoTramite = tramites[0];

    // Si existe, incrementar en 1, sino empezar en 1
    this.numeroTramite = ultimoTramite
      ? (ultimoTramite.numeroTramite ?? 0) + 1
      : 1;
  }
}
