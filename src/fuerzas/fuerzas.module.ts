import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Fuerza } from '../entities/fuerza.entity';
import { FuerzasController } from './fuerzas.controller';
import { FuerzasService } from './fuerzas.service';

@Module({
  imports: [MikroOrmModule.forFeature([Fuerza])],
  controllers: [FuerzasController],
  providers: [FuerzasService],
  exports: [FuerzasService],
})
export class FuerzasModule {}
