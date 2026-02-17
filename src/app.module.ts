import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { databaseConfig } from './config/database.config';
import { DocumentosModule } from './documentos/documentos.module';
import { EtlModule } from './etl/etl.module';
import { FlujosModule } from './flujos/flujos.module';
import { FuerzasModule } from './fuerzas/fuerzas.module';
import { ProvinciasModule } from './localidades/provincias.module';
import { RepresentantesModule } from './representantes/representantes.module';
import { TramitesModule } from './tramites/tramites.module';
import { UploadsModule } from './uploads/uploads.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRoot(databaseConfig),
    AuthModule,
    ProvinciasModule,
    ClientesModule,
    FlujosModule,
    DocumentosModule,
    TramitesModule,
    FuerzasModule,
    RepresentantesModule,
    UploadsModule,
    EtlModule,
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
