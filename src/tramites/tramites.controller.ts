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
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { Estadisticas, Role } from 'src/entities';
import { HistorialPaso } from 'src/entities/historial-paso.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { FilterTramiteDto } from './dto/filter-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { TramitesService } from './tramites.service';

@Controller('tramites')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.REPRESENTANTE, Role.MANAGER)
@UseGuards(JwtAuthGuard)
export class TramitesController {
  constructor(private readonly tramitesService: TramitesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('documentos'))
  create(
    @Body() createTramiteDto: CreateTramiteDto,
    @UploadedFiles() documentos: Express.Multer.File[],
    @Req() request: RequestWithUser,
  ) {
    return this.tramitesService.create(
      createTramiteDto,
      documentos,
      request.user,
    );
  }

  @Patch(':id/documento/:documentoTramiteId')
  @UseInterceptors(FilesInterceptor('documento', 1))
  addDocumentoTramite(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoTramiteId', ParseIntPipe) documentoTramiteId: number,
    @UploadedFiles() documentos: Express.Multer.File[],
  ) {
    const documento = documentos?.[0];
    if (!documento) {
      throw new Error('No se proporcionó ningún archivo');
    }
    return this.tramitesService.addDocumento(id, documentoTramiteId, documento);
  }

  @Get('delays')
  getTramitesWithDelays() {
    return this.tramitesService.getTramitesWithDelays();
  }

  @Get('estadisticas')
  getEstadisticas(
    @Query() query: FilterTramiteDto = {},
  ): Promise<ApiResponseDto<Estadisticas>> {
    console.log('query');
    return this.tramitesService.getEstadisticas(query);
  }

  @Get()
  findAll(@Query() filterDto: FilterTramiteDto) {
    console.log('filterDto', filterDto);
    return this.tramitesService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tramitesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTramiteDto: UpdateTramiteDto,
  ) {
    return this.tramitesService.update(id, updateTramiteDto);
  }

  @Get(':id/advance-steps')
  getAdvanceSteps(@Param('id', ParseIntPipe) id: number) {
    return this.tramitesService.getAdvanceSteps(id);
  }

  @Get(':id/previous-steps')
  getPreviousSteps(@Param('id', ParseIntPipe) id: number) {
    return this.tramitesService.getPreviousSteps(id);
  }

  @Post(':id/advance')
  advanceStep(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { pasoId: number },
  ) {
    return this.tramitesService.advanceStep(id, body.pasoId, request.user);
  }

  @Post(':id/contact')
  updateLastContact(@Param('id', ParseIntPipe) id: number) {
    return this.tramitesService.updateLastContact(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tramitesService.remove(id);
  }

  @Get(':id/documentos')
  getDocumentos(@Param('id', ParseIntPipe) id: number) {
    return this.tramitesService.getDocumentos(id);
  }

  @Get('documentos/:documentoTramiteId')
  getDocumento(
    @Param('documentoTramiteId', ParseIntPipe) documentoTramiteId: number,
  ) {
    return this.tramitesService.getDocumento(documentoTramiteId);
  }

  @Get('documento/:documentoTramiteId/file')
  async getDocumentoFile(
    @Param('documentoTramiteId', ParseIntPipe) documentoTramiteId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, mimeType, filename } =
      await this.tramitesService.getDocumentoFile(documentoTramiteId);

    // Configurar headers para la respuesta
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return file;
  }

  @Get(':id/historial')
  getHistorial(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<HistorialPaso[]>> {
    return this.tramitesService.getHistorial(id);
  }
}
