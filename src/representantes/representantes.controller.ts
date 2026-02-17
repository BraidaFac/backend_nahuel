import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../entities/user.entity';
import { FilterRepresentanteDto } from './dto/filter-representante.dto';
import { UpdateRepresentanteDto } from './dto/update-representante.dto';
import { RepresentantesService } from './representantes.service';

/**
 * Representantes Controller
 *
 * Frontend consume:
 * - GET /representantes?fullName=&email=&search=&page=&limit= -> listar representantes con filtros
 * - GET /representantes/:id -> obtener representante por ID con relaciones
 * - POST /representantes { fullName, email, telefono? } -> crear representante
 * - PATCH /representantes/:id -> actualizar representante
 * - DELETE /representantes/:id -> eliminar representante (solo admin)
 */
@Controller('representantes')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.REPRESENTANTE)
@UseGuards(JwtAuthGuard)
export class RepresentantesController {
  constructor(private readonly representantesService: RepresentantesService) {}

  /*   @Post()
  create(@Body() createRepresentanteDto: CreateRepresentanteDto) {
    return this.representantesService.create(createRepresentanteDto);
  } */

  @Get()
  findAllPaginated(@Query() filterDto: FilterRepresentanteDto) {
    return this.representantesService.findAllPaginated(filterDto);
  }

  @Get('all')
  findAll() {
    return this.representantesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.representantesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRepresentanteDto: UpdateRepresentanteDto,
  ) {
    return this.representantesService.update(id, updateRepresentanteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.representantesService.remove(id);
  }
}
