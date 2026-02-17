import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Fuerza } from 'src/entities/fuerza.entity';
import { Lead } from 'src/entities/lead.entity';
import { Provincia } from 'src/entities/provincia.entity';
import { Representante } from 'src/entities/representante.entity';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Lead, Provincia, Representante, Fuerza]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
