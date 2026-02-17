import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Representante } from '../entities/representante.entity';
import { RepresentantesController } from './representantes.controller';
import { RepresentantesService } from './representantes.service';

@Module({
  imports: [MikroOrmModule.forFeature([Representante])],
  controllers: [RepresentantesController],
  providers: [RepresentantesService],
  exports: [RepresentantesService],
})
export class RepresentantesModule {}
