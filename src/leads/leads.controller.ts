import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { FilterClienteDto } from 'src/clientes/dto/filter-cliente.dto';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { Lead } from 'src/entities/lead.entity';
import { Role } from 'src/entities/user.entity';
import { AsignarLeadsDto } from './DTOs/asignar.dto';
import { LeadDto } from './DTOs/lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.REPRESENTANTE, Role.MANAGER)
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(
    @Req() request: RequestWithUser,
    @Query() filterDto: FilterClienteDto,
  ) {
    return this.leadsService.findAllPaginated(request.user, filterDto);
  }

  @Get('all')
  findAllWithOutPaginated(
    @Req() request: RequestWithUser,
    @Query() filterDto: FilterClienteDto,
  ) {
    return this.leadsService.findAllWithOutPaginated(request.user, filterDto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() leadoDto: LeadDto,
  ): Promise<ApiResponseDto<Lead>> {
    return this.leadsService.cambiarEstado(id, leadoDto.estado);
  }

  @Patch('asignacion')
  asignarLeads(
    @Body() asignarLeadsDto: AsignarLeadsDto,
  ): Promise<ApiResponseDto<Lead[]>> {
    return this.leadsService.asignarLeads(asignarLeadsDto);
  }
}
