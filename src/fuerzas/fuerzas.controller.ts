import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../entities/user.entity';
import { CreateFuerzaDto } from './dto/create-fuerza.dto';
import { UpdateFuerzaDto } from './dto/update-fuerza.dto';
import { FuerzasService } from './fuerzas.service';

/**
 * Fuerzas Controller
 *
 * Frontend consume:
 * - GET /fuerzas -> listar todas las fuerzas
 * - GET /fuerzas/:id -> obtener fuerza por ID
 * - POST /fuerzas { nombre, descripcion? } -> crear fuerza (solo admin)
 * - PUT /fuerzas/:id { nombre?, descripcion? } -> actualizar fuerza (solo admin)
 * - DELETE /fuerzas/:id -> eliminar fuerza (solo admin)
 */
@Controller('fuerzas')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.REPRESENTANTE, Role.MANAGER)
@UseGuards(JwtAuthGuard)
export class FuerzasController {
  constructor(private readonly fuerzasService: FuerzasService) {}

  @Post()
  create(@Body() createFuerzaDto: CreateFuerzaDto) {
    return this.fuerzasService.create(createFuerzaDto);
  }

  @Get()
  findAll() {
    return this.fuerzasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fuerzasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFuerzaDto: UpdateFuerzaDto,
  ) {
    return this.fuerzasService.update(id, updateFuerzaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fuerzasService.remove(id);
  }
}
