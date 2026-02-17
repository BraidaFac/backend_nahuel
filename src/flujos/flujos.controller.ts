import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { TipoPrestamo } from '../entities/tramite.entity';
import { Role } from '../entities/user.entity';
import { CreateFlujoDto } from './dto/create-flujo.dto';
import { UpdateFlujoDto } from './dto/update-flujo.dto';
import { FlujosService } from './flujos.service';

@Controller('flujos')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.REPRESENTANTE, Role.MANAGER)
@UseGuards(JwtAuthGuard)
export class FlujosController {
  constructor(private readonly flujosService: FlujosService) {}

  @Post()
  create(@Body() createFlujoDto: CreateFlujoDto) {
    return this.flujosService.createFlujo(createFlujoDto);
  }

  @Get()
  findAll() {
    return this.flujosService.findAll();
  }

  @Get('by-fuerza/:fuerzaId')
  findByFuerza(
    @Param('fuerzaId') fuerzaId: string,
    @Query('tipoPrestamo') tipoPrestamo?: TipoPrestamo,
  ) {
    return this.flujosService.findFlujoByFuerza(+fuerzaId, tipoPrestamo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flujosService.findOneFlujo(+id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.flujosService.findById(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFlujoDto: UpdateFlujoDto) {
    return this.flujosService.updateFlujo(+id, updateFlujoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flujosService.removeFlujo(+id);
  }

  @Get(':flujoId/pasos')
  getPasos(@Param('flujoId') flujoId: string) {
    return this.flujosService.getPasosByFlujo(+flujoId);
  }

  @Get(':flujoId/documentos')
  getDocumentos(@Param('flujoId') flujoId: string) {
    return this.flujosService.getDocumentosRequeridos(+flujoId);
  }
}
