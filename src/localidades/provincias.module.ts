import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Provincia } from '../entities/provincia.entity';
import { ProvinciasController } from './provincias.controller';
import { ProvinciasService } from './provincias.service';

@Module({
  imports: [MikroOrmModule.forFeature([Provincia])],
  controllers: [ProvinciasController],
  providers: [ProvinciasService],
  exports: [ProvinciasService],
})
export class ProvinciasModule {}
