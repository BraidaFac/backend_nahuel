import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { DocumentoRequerido } from '../entities/documento-requerido.entity';
import { Documento } from '../entities/documento.entity';
import { FlujoTramite } from '../entities/flujo-tramite.entity';
import { Fuerza } from '../entities/fuerza.entity';
import { PasoTramite } from '../entities/paso-tramite.entity';
import { ReglaTransicion } from '../entities/regla-transicion.entity';
import { FlujosController } from './flujos.controller';
import { FlujosService } from './flujos.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      FlujoTramite,
      PasoTramite,
      ReglaTransicion,
      DocumentoRequerido,
      Fuerza,
      Documento,
    ]),
  ],
  controllers: [FlujosController],
  providers: [FlujosService],
  exports: [FlujosService],
})
export class FlujosModule {}
