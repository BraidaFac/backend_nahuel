import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as requestWithUserInterface from 'src/auth/interfaces/request-with-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../entities/user.entity';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { FilterClienteDto } from './dto/filter-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

/**
 * Clientes Controller
 *
 * Frontend consume:
 * - GET /clientes?nombre=&localidadId=&representanteId=&search=&page=&limit= -> listar clientes con filtros
 * - GET /clientes/:id -> obtener cliente por ID con relaciones
 * - POST /clientes { nombre, apellido?, email?, telefono?, localidadId?, representanteId?, observaciones? } -> crear cliente
 * - PUT /clientes/:id -> actualizar cliente
 * - DELETE /clientes/:id -> eliminar cliente (solo admin)
 */
@Controller('clientes')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.REPRESENTANTE, Role.MANAGER)
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  create(
    @Req() request: requestWithUserInterface.RequestWithUser,
    @Body() createClienteDto: CreateClienteDto,
  ) {
    return this.clientesService.create(createClienteDto, request.user);
  }

  @Post('lead/:leadId')
  createLead(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Req() request: requestWithUserInterface.RequestWithUser,
    @Body() createClienteDto: CreateClienteDto,
  ) {
    return this.clientesService.create(createClienteDto, request.user, leadId);
  }

  @Get()
  findAll(@Query() filterDto: FilterClienteDto) {
    return this.clientesService.findAllPaginated(filterDto);
  }

  @Get('all')
  findAllWithOutPaginated(@Query() filterDto: FilterClienteDto) {
    return this.clientesService.findAllWithOutPaginated(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }
}
