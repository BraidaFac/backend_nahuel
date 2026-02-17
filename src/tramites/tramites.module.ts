import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { UploadsModule } from 'src/uploads/uploads.module';
import { Cliente } from '../entities/cliente.entity';
import { DocumentoRequerido } from '../entities/documento-requerido.entity';
import { FlujoTramite } from '../entities/flujo-tramite.entity';
import { HistorialPaso } from '../entities/historial-paso.entity';
import { PasoTramite } from '../entities/paso-tramite.entity';
import { TramiteDocumento } from '../entities/tramite-documento.entity';
import { Tramite } from '../entities/tramite.entity';
import { FlujosModule } from '../flujos/flujos.module';
import { TramitesController } from './tramites.controller';
import { TramitesService } from './tramites.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Tramite,
      Cliente,
      FlujoTramite,
      PasoTramite,
      DocumentoRequerido,
      TramiteDocumento,
      HistorialPaso,
    ]),
    FlujosModule,
    UploadsModule,
  ],
  controllers: [TramitesController],
  providers: [TramitesService],
  exports: [TramitesService],
})
export class TramitesModule {}
