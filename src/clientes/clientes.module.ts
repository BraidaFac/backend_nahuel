import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Fuerza, Lead } from 'src/entities';
import { Cliente } from '../entities/cliente.entity';
import { Provincia } from '../entities/provincia.entity';
import { Representante } from '../entities/representante.entity';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Cliente,
      Provincia,
      Representante,
      Fuerza,
      Lead,
    ]),
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
