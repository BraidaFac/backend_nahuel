import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'src/entities';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProvinciaDto } from './dto/create-provincia.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';
import { ProvinciasService } from './provincias.service';

/**
 * Provincias Controller
 *
 * Frontend consume:
 * - GET /localidades -> listar todas las localidades
 * - GET /localidades/:id -> obtener localidad por ID
 * - POST /localidades { nombre, provincia? } -> crear localidad (solo admin)
 * - PUT /localidades/:id { nombre?, provincia? } -> actualizar localidad (solo admin)
 * - DELETE /localidades/:id -> eliminar localidad (solo admin)
 */
@Controller('provincias')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.REPRESENTANTE)
@UseGuards(JwtAuthGuard)
export class ProvinciasController {
  constructor(private readonly provinciasService: ProvinciasService) {}

  @Post()
  create(@Body() createProvinciaDto: CreateProvinciaDto) {
    return this.provinciasService.create(createProvinciaDto);
  }

  @Get()
  findAll() {
    return this.provinciasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.provinciasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProvinciaDto: UpdateProvinciaDto,
  ) {
    return this.provinciasService.update(id, updateProvinciaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.provinciasService.remove(id);
  }
}
