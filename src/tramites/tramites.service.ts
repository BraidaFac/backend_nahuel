import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync, renameSync } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { Fuerza } from 'src/entities/fuerza.entity';
import { PasoTramite, TipoPaso } from 'src/entities/paso-tramite.entity';
import { Provincia } from 'src/entities/provincia.entity';
import { User } from 'src/entities/user.entity';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { Cliente } from '../entities/cliente.entity';
import { FlujoTramite } from '../entities/flujo-tramite.entity';
import { HistorialPaso } from '../entities/historial-paso.entity';
import {
  DocumentoTipo,
  EstadoDocumento,
  TramiteDocumento,
} from '../entities/tramite-documento.entity';
import { Estadisticas, Tramite } from '../entities/tramite.entity';
import { FlujosService } from '../flujos/flujos.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { FilterTramiteDto } from './dto/filter-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';

export interface DocumentoData {
  documentoId?: number;
  tipo?: DocumentoTipo;
  fechaSubida?: Date;
  estado: EstadoDocumento;
  file?: Express.Multer.File;
  fileName?: string;
}

@Injectable()
export class TramitesService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Tramite)
    private tramiteRepository: EntityRepository<Tramite>,
    @InjectRepository(TramiteDocumento)
    private tramiteDocumentoRepository: EntityRepository<TramiteDocumento>,
    @InjectRepository(HistorialPaso)
    private historialPasoRepository: EntityRepository<HistorialPaso>,
    private flujosService: FlujosService,
    private uploadsService: UploadsService,
  ) {}

  async create(
    createTramiteDto: CreateTramiteDto,
    documentos: Express.Multer.File[],
    user: User,
  ): Promise<ApiResponseDto<Tramite>> {
    return this.em.transactional(async (em) => {
      const documentosData = JSON.parse(
        createTramiteDto.documentosData || '[]',
      ) as DocumentoData[];

      this.relacionarDocumentos(documentos, documentosData);

      const tramiteDocumentos = this.createTramiteDocumentos(documentosData);
      // Verificar que el cliente existe y cargar su fuerza
      const cliente = await em.findOne(
        Cliente,
        { id: createTramiteDto.clienteId },
        { populate: ['fuerza'] },
      );
      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const flujo = await em.findOne(
        FlujoTramite,
        {
          id: createTramiteDto.flujoId,
        },
        {
          populate: ['pasos'],
          orderBy: {
            pasos: {
              createdAt: 'ASC',
            },
          },
        },
      );

      if (!flujo) {
        throw new NotFoundException('Flujo no encontrado');
      }

      const primerPaso = flujo.getFirstPaso();

      if (!primerPaso) {
        throw new BadRequestException('El flujo no tiene pasos configurados');
      }

      // Crear el trámite
      const newTramite = em.create(Tramite, {
        cliente: { id: createTramiteDto.clienteId } as Cliente,
        flujo,
        tramiteDocumentos,
        pasoActual: primerPaso,
        tipoPrestamo: createTramiteDto.tipoPrestamo,
        montoSolicitado: createTramiteDto.montoSolicitado,
        observaciones: createTramiteDto.observaciones,
        createdAt: new Date(),
        // numeroTramite se genera automáticamente con @BeforeCreate
      });

      // Crear historial inicial
      const historialInicial = em.create(HistorialPaso, {
        tramite: newTramite,
        paso: primerPaso,
        fechaInicio: new Date(),
        observaciones: 'Inicio del trámite',
        createdAt: new Date(),
        usuarioResponsable: user.username,
      });
      newTramite.historialPasos.add(historialInicial);
      await em.persistAndFlush(newTramite);

      return ApiResponseDto.success(newTramite, 'Trámite creado exitosamente');
    });
  }

  relacionarDocumentos(
    documentos: Express.Multer.File[],
    documentosData: DocumentoData[],
  ) {
    documentos.forEach((doc) => {
      const documentoData = documentosData.find(
        (docData) => docData.fileName === doc.originalname,
      );
      if (documentoData) {
        documentoData.file = doc;
      }
    });
  }

  createTramiteDocumentos(documentosData: DocumentoData[]) {
    const tramiteDocumentos = documentosData.map((doc) => {
      const relativePath = path.relative(process.cwd(), doc.file?.path || '');
      return {
        documento: { id: doc.documentoId },
        estado: doc.estado,
        urlArchivo: relativePath,
        fechaSubida: doc.fechaSubida,
        archivoNombre: doc.file?.filename,
        archivoTipo: doc.tipo,
      } as TramiteDocumento;
    });
    return tramiteDocumentos.filter((doc) => doc !== undefined);
  }

  async addDocumento(
    id: number,
    documentoTramiteId: number,
    documento: Express.Multer.File,
  ): Promise<ApiResponseDto<TramiteDocumento>> {
    const tramite = await this.tramiteRepository.findOne(
      { id },
      { populate: ['tramiteDocumentos', 'cliente'] },
    );

    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }

    const tramiteDocumento = tramite.tramiteDocumentos.find(
      (doc) => doc.id === documentoTramiteId,
    );

    if (!tramiteDocumento) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Obtener el nombre del cliente para crear la carpeta correcta
    const clienteName = tramite.cliente.fullName;

    // Crear la carpeta del cliente si no existe
    const clientPath = this.uploadsService.ensureClientDirectory(clienteName);

    // Mover el archivo de la carpeta temporal a la carpeta del cliente
    const oldPath = documento.path;
    const newFilename = documento.filename;
    const newPath = path.join(clientPath, newFilename);

    // Mover el archivo
    if (existsSync(oldPath)) {
      renameSync(oldPath, newPath);
    }

    // Calcular la ruta relativa desde el directorio raíz
    const relativePath = path.relative(process.cwd(), newPath);

    tramiteDocumento.estado = EstadoDocumento.RECIBIDO;
    tramiteDocumento.fechaSubida = new Date();
    tramiteDocumento.urlArchivo = relativePath;
    tramiteDocumento.archivoNombre = documento.filename;
    tramiteDocumento.archivoTipo = documento.mimetype as DocumentoTipo;

    await this.em.flush();
    return ApiResponseDto.success(
      tramiteDocumento,
      'Documento agregado exitosamente',
    );
  }
  async findAll(
    filterDto: FilterTramiteDto,
  ): Promise<ApiResponseDto<PaginatedResult<Tramite>>> {
    const {
      page = 1,
      limit = 10,
      estadoId,
      clienteId,
      search,
      provinciaId,
      representanteId,
      fuerzaId,
      fechaDesde,
      fechaHasta,
      tipoPrestamo,
      tipoPaso,
    } = filterDto;
    const offset = (page - 1) * limit;

    // Construir filtros
    const where: FilterQuery<Tramite> = {};

    if (tipoPrestamo) {
      where.tipoPrestamo = tipoPrestamo;
    }

    if (fuerzaId) {
      where.cliente = { fuerza: { id: fuerzaId } };
    }
    if (estadoId || tipoPaso) {
      where.pasoActual = {
        ...(estadoId && { id: estadoId }),
        ...(tipoPaso && { tipoPaso }),
      };
    }

    if (clienteId) {
      where.cliente = { id: clienteId };
    }

    if (provinciaId) {
      where.cliente = { provincia: { id: provinciaId } };
    }

    if (representanteId) {
      where.cliente = { representante: { id: representanteId } };
    }

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};

      if (fechaDesde) {
        where.createdAt.$gte = fechaDesde;
      }

      if (fechaHasta) {
        where.createdAt.$lte = fechaHasta;
      }
    }

    if (search) {
      where.$or = [
        { cliente: { fullName: { $ilike: `%${search.toLowerCase()}%` } } },
        { cliente: { email: { $ilike: `%${search.toLowerCase()}%` } } },
        { observaciones: { $ilike: `%${search.toLowerCase()}%` } },
      ];
    }

    console.log(where);
    const [tramites, total] = await this.tramiteRepository.findAndCount(where, {
      populate: ['cliente', 'pasoActual', 'flujo'],
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    const result: PaginatedResult<Tramite> = {
      data: tramites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return ApiResponseDto.success(result);
  }

  private getTipoPasoLabel(tipoPaso: TipoPaso): string {
    const labels: Record<TipoPaso, string> = {
      [TipoPaso.INICIAL]: 'Trámites en Inicio',
      [TipoPaso.INTERMEDIO]: 'Trámites en Proceso',
      [TipoPaso.FINAL_EXITOSO]: 'Trámites Entregados',
      [TipoPaso.FINAL_RECHAZADO]: 'Trámites Rechazados',
    };
    return labels[tipoPaso] || tipoPaso;
  }

  async generateReport(
    filterDto: FilterTramiteDto,
    user: User,
    fechaSolicitud: Date,
  ): Promise<Buffer> {
    const { fechaDesde, tipoPaso } = filterDto;

    if (!fechaDesde || !tipoPaso) {
      throw new BadRequestException(
        'Para generar el reporte debe especificar al menos Fecha Desde y Estado del trámite',
      );
    }

    const {
      estadoId,
      clienteId,
      search,
      provinciaId,
      representanteId,
      fuerzaId,
      fechaHasta,
      tipoPrestamo,
    } = filterDto;

    const where: FilterQuery<Tramite> = {};

    if (tipoPrestamo) where.tipoPrestamo = tipoPrestamo;
    if (fuerzaId) where.cliente = { fuerza: { id: fuerzaId } };
    if (estadoId || tipoPaso) {
      where.pasoActual = {
        ...(estadoId && { id: estadoId }),
        ...(tipoPaso && { tipoPaso }),
      };
    }
    if (clienteId) where.cliente = { id: clienteId };
    if (provinciaId) where.cliente = { provincia: { id: provinciaId } };
    if (representanteId)
      where.cliente = { representante: { id: representanteId } };
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.$gte = fechaDesde;
      if (fechaHasta) where.createdAt.$lte = fechaHasta;
    }
    if (search) {
      where.$or = [
        { cliente: { fullName: { $ilike: `%${search.toLowerCase()}%` } } },
        { cliente: { email: { $ilike: `%${search.toLowerCase()}%` } } },
        { observaciones: { $ilike: `%${search.toLowerCase()}%` } },
      ];
    }

    const tramites = await this.tramiteRepository.find(where, {
      populate: ['cliente', 'cliente.fuerza', 'cliente.provincia', 'pasoActual'],
      orderBy: { createdAt: 'ASC' },
    });

    const filtrosTexto: string[] = [];
    filtrosTexto.push(`Fecha Desde: ${fechaDesde.toLocaleDateString('es-AR')}`);
    filtrosTexto.push(`Estado: ${this.getTipoPasoLabel(tipoPaso)}`);
    if (fechaHasta)
      filtrosTexto.push(`Fecha Hasta: ${fechaHasta.toLocaleDateString('es-AR')}`);
    if (tipoPrestamo) filtrosTexto.push(`Tipo Préstamo: ${tipoPrestamo}`);
    if (fuerzaId) {
      const fuerza = await this.em.findOne(Fuerza, { id: fuerzaId });
      if (fuerza) filtrosTexto.push(`Fuerza: ${fuerza.nombre}`);
    }
    if (provinciaId) {
      const provincia = await this.em.findOne(Provincia, { id: provinciaId });
      if (provincia) filtrosTexto.push(`Provincia: ${provincia.nombre}`);
    }
    if (search) filtrosTexto.push(`Búsqueda: ${search}`);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte Trámites', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    const styles = {
      titleBg: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF2E5090' },
      },
      sectionBg: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFD6DCE4' },
      },
      headerBg: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF4472C4' },
      },
      whiteFont: { argb: 'FFFFFFFF' },
    };

    let rowNum = 1;
    const titleCell = sheet.getCell(`A${rowNum}`);
    titleCell.value = 'Reporte de Trámites';
    titleCell.font = { bold: true, size: 18, color: styles.whiteFont };
    titleCell.fill = styles.titleBg;
    titleCell.alignment = { vertical: 'middle' };
    sheet.mergeCells(`A${rowNum}:F${rowNum}`);
    sheet.getRow(rowNum).height = 28;
    rowNum += 2;

    const filtrosLabelCell = sheet.getCell(`A${rowNum}`);
    filtrosLabelCell.value = 'Filtros aplicados:';
    filtrosLabelCell.font = { bold: true, size: 12 };
    filtrosLabelCell.fill = styles.sectionBg;
    rowNum++;
    filtrosTexto.forEach((txt) => {
      sheet.getCell(`A${rowNum}`).value = txt;
      sheet.getCell(`A${rowNum}`).font = { size: 11 };
      rowNum++;
    });
    rowNum++;

    sheet.getCell(`A${rowNum}`).value = `Solicitado por: ${user.username}`;
    sheet.getCell(`A${rowNum}`).font = { bold: true, size: 11 };
    rowNum++;
    sheet.getCell(`A${rowNum}`).value = `Fecha de solicitud: ${fechaSolicitud.toLocaleString('es-AR')}`;
    sheet.getCell(`A${rowNum}`).font = { bold: true, size: 11 };
    rowNum++;
    const countCell = sheet.getCell(`A${rowNum}`);
    countCell.value = `Cantidad de trámites: ${tramites.length}`;
    countCell.font = { bold: true, size: 12 };
    countCell.fill = styles.sectionBg;
    rowNum += 2;

    const headers = [
      'Fecha Creación',
      'Nombre Cliente',
      'Matrícula',
      'Fuerza',
      'Teléfono',
      'Monto Solicitado',
    ];
    sheet.addRow(headers);
    const headerRow = sheet.getRow(rowNum);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: styles.whiteFont };
      cell.fill = styles.headerBg;
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    headerRow.height = 22;
    rowNum++;

    tramites.forEach((t) => {
      const fechaCreacion = t.createdAt
        ? new Date(t.createdAt).toLocaleDateString('es-AR')
        : '';
      const nombreCliente = t.cliente?.fullName || '';
      const matricula = t.cliente?.matricula || '';
      const fuerza = t.cliente?.fuerza?.nombre || '';
      const telefono = t.cliente?.telefono || '';
      const monto =
        t.montoSolicitado != null
          ? Number(t.montoSolicitado).toLocaleString('es-AR')
          : '';
      sheet.addRow([
        fechaCreacion,
        nombreCliente,
        matricula,
        fuerza,
        telefono,
        monto,
      ]);
    });

    sheet.columns = [
      { width: 12 },
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 18 },
      { width: 15 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async findOne(id: number): Promise<ApiResponseDto<Tramite>> {
    const tramite = await this.tramiteRepository.findOne(
      { id },
      {
        populate: [
          'cliente',
          'flujo',
          'flujo.pasos',
          'flujo.pasos.transicionesOrigen.pasoDestino',
          'flujo.pasos.transicionesOrigen.pasoOrigen',
          'flujo.pasos.transicionesDestino.pasoOrigen',
          'flujo.pasos.transicionesDestino.pasoDestino',
          'flujo.documentosRequeridos.documento',
          'pasoActual',
          'pasoActual.transicionesOrigen.pasoDestino',
          'pasoActual.transicionesOrigen.pasoOrigen',
          'pasoActual.transicionesDestino.pasoOrigen',
          'pasoActual.transicionesDestino.pasoDestino',
          'tramiteDocumentos',
          'tramiteDocumentos.documento',
          'historialPasos',
          'historialPasos.paso',
        ],
      },
    );

    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }

    return ApiResponseDto.success(tramite);
  }

  async update(
    id: number,
    updateTramiteDto: UpdateTramiteDto,
  ): Promise<ApiResponseDto<Tramite>> {
    const tramite = await this.tramiteRepository.findOne({ id });
    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }

    const { clienteId, flujoId, ...tramiteData } = updateTramiteDto;

    // Construir objeto de actualización solo con campos que vienen en el DTO
    const updateData: Partial<Tramite> = {
      ...tramiteData,
    };

    // Solo actualizar relaciones si vienen en el DTO
    if (clienteId) {
      updateData.cliente = { id: clienteId } as Cliente;
    }

    if (flujoId) {
      updateData.flujo = { id: flujoId } as FlujoTramite;
    }

    this.em.assign(tramite, updateData);
    await this.em.flush();

    // Cargar relaciones para la respuesta
    await this.tramiteRepository.populate(tramite, ['cliente', 'pasoActual']);

    return ApiResponseDto.success(tramite, 'Trámite actualizado exitosamente');
  }

  async getAdvanceSteps(id: number): Promise<ApiResponseDto<PasoTramite[]>> {
    const tramite = await this.tramiteRepository.findOne(
      { id },
      {
        populate: [
          'pasoActual',
          'pasoActual.transicionesOrigen.pasoDestino',
          'pasoActual.transicionesOrigen.pasoOrigen',
        ],
      },
    );
    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }
    const advanceSteps = tramite.pasoActual.transicionesOrigen
      .getItems()
      .map((t) => t.pasoDestino);
    return ApiResponseDto.success(advanceSteps);
  }

  async getPreviousSteps(id: number): Promise<ApiResponseDto<PasoTramite[]>> {
    const tramite = await this.tramiteRepository.findOne(
      { id },
      {
        populate: [
          'pasoActual',
          'pasoActual.transicionesDestino.pasoOrigen',
          'pasoActual.transicionesDestino.pasoDestino',
        ],
      },
    );
    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }
    const previousSteps = tramite.pasoActual.transicionesDestino
      .getItems()
      .map((t) => t.pasoOrigen);
    return ApiResponseDto.success(previousSteps);
  }

  async advanceStep(
    id: number,
    pasoId: number,
    user: User,
  ): Promise<ApiResponseDto<Tramite>> {
    return this.em.transactional(async (em) => {
      const tramite = await em.findOne(
        Tramite,
        { id },
        { populate: ['pasoActual', 'flujo'] },
      );

      if (!tramite) {
        throw new NotFoundException('Trámite no encontrado');
      }

      // Obtener el siguiente paso
      const siguientePaso = await em.findOne(PasoTramite, {
        id: pasoId,
      });
      if (!siguientePaso) {
        throw new BadRequestException('Paso no encontrado');
      }

      // Cerrar el historial actual
      const historialActual = await em.findOne(HistorialPaso, {
        tramite: { id },
        fechaFin: null,
      });

      if (historialActual) {
        historialActual.fechaFin = new Date();
      }

      // Crear nuevo historial
      const nuevoHistorial = em.create(HistorialPaso, {
        tramite,
        paso: siguientePaso,
        fechaInicio: new Date(),
        observaciones: `Avance  al paso: ${siguientePaso.nombre}`,
        usuarioResponsable: user.username,
        createdAt: new Date(),
      });

      // Actualizar el paso del trámite
      tramite.pasoActual = siguientePaso;
      tramite.historialPasos.add(nuevoHistorial);
      await em.persistAndFlush([tramite]);

      // Cargar relaciones para la respuesta
      await em.populate(tramite, ['cliente', 'pasoActual']);

      return ApiResponseDto.success(
        tramite,
        `Trámite avanzado al paso: ${siguientePaso.nombre}`,
      );
    });
  }

  async updateLastContact(id: number): Promise<ApiResponseDto<Tramite>> {
    const tramite = await this.tramiteRepository.findOne({ id });
    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }

    tramite.fechaUltimoContacto = new Date();
    await this.em.flush();

    return ApiResponseDto.success(
      tramite,
      'Fecha de último contacto actualizada',
    );
  }

  async remove(id: number): Promise<ApiResponseDto> {
    const tramite = await this.tramiteRepository.findOne({ id });
    if (!tramite) {
      throw new NotFoundException('Trámite no encontrado');
    }

    await this.em.removeAndFlush(tramite);
    return ApiResponseDto.success(null, 'Trámite eliminado exitosamente');
  }

  async getTramitesWithDelays(): Promise<ApiResponseDto<Tramite[]>> {
    const tramites = await this.tramiteRepository.find({
      pasoActual: { diasMaximoSinAvance: { $ne: null } },
      historialPasos: { fechaFin: null },
    });

    // Obtener trámites que han superado el tiempo máximo sin avance
    /* const tramites = await this.tramiteRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.cliente', 'c')
      .leftJoinAndSelect('t.pasoActual', 'p')
      .leftJoinAndSelect('t.historialPasos', 'h')
      .where('p.diasMaximoSinAvance IS NOT NULL')
      .andWhere('h.fechaFin IS NULL') // Historial actual (paso actual)
      .andWhere(
        'h.fechaInicio < ?',
        [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)], // Ajustar según días
      )
      .getResultList();

    // Filtrar por días específicos de cada paso
    const tramitesRetrasados = tramites.filter((tramite) => {
      const historialActual = tramite.historialPasos
        .getItems()
        .find((h) => !h.fechaFin);

      if (!historialActual || !tramite.pasoActual.diasMaximoSinAvance) {
        return false;
      }

      const diasTranscurridos = Math.floor(
        (Date.now() - historialActual.fechaInicio.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return diasTranscurridos > tramite.pasoActual.diasMaximoSinAvance;
    }); */

    return ApiResponseDto.success(tramites);
  }

  async getDocumentos(id: number): Promise<ApiResponseDto<TramiteDocumento[]>> {
    const tramiteDocumentos = await this.tramiteDocumentoRepository.find(
      {
        tramite: { id },
      },
      {
        populate: ['documento'],
      },
    );
    return ApiResponseDto.success(
      tramiteDocumentos,
      'Documentos obtenidos exitosamente',
    );
  }
  async getDocumento(id: number): Promise<ApiResponseDto<TramiteDocumento>> {
    const documento = await this.tramiteDocumentoRepository.findOne(
      { id },
      { populate: ['documento'] },
    );
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    return ApiResponseDto.success(documento);
  }

  async getDocumentoFile(
    id: number,
  ): Promise<{ file: StreamableFile; mimeType: string; filename: string }> {
    const tramiteDocumento = await this.tramiteDocumentoRepository.findOne(
      { id },
      { populate: ['documento'] },
    );

    if (!tramiteDocumento) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (
      !tramiteDocumento.urlArchivo ||
      tramiteDocumento.estado === EstadoDocumento.PENDIENTE
    ) {
      throw new NotFoundException('El documento no tiene archivo asociado');
    }

    // Construir la ruta completa del archivo
    const filePath = path.join(process.cwd(), tramiteDocumento.urlArchivo);

    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      throw new NotFoundException(
        `Archivo no encontrado en la ruta: ${tramiteDocumento.urlArchivo}`,
      );
    }

    // Crear un stream del archivo
    const fileStream = createReadStream(filePath);

    // Determinar el tipo MIME
    const mimeType = tramiteDocumento.archivoTipo || 'application/octet-stream';

    // Nombre del archivo para la descarga
    const filename = tramiteDocumento.archivoNombre || 'documento';

    return {
      file: new StreamableFile(fileStream),
      mimeType,
      filename,
    };
  }
  async getHistorial(id: number): Promise<ApiResponseDto<HistorialPaso[]>> {
    const historial = await this.historialPasoRepository.find(
      { tramite: { id } },
      { populate: ['paso'] },
    );
    return ApiResponseDto.success(historial, 'Historial obtenido exitosamente');
  }

  async getEstadisticas(
    filtroEstadisticas?: FilterTramiteDto,
  ): Promise<ApiResponseDto<Estadisticas>> {
    const { tipoPrestamo, fuerzaId, clienteId, search, pasoId } =
      filtroEstadisticas || {};

    const where: FilterQuery<Tramite> = {};
    if (tipoPrestamo) {
      where.tipoPrestamo = tipoPrestamo;
    }
    if (fuerzaId) {
      where.cliente = { fuerza: { id: fuerzaId } };
    }
    if (pasoId) {
      where.pasoActual = { id: pasoId };
    }
    if (clienteId) {
      where.cliente = { id: clienteId };
    }
    if (search) {
      where.$or = [
        { cliente: { fullName: { $ilike: `%${search.toLowerCase()}%` } } },
        { cliente: { email: { $ilike: `%${search.toLowerCase()}%` } } },
        { observaciones: { $ilike: `%${search.toLowerCase()}%` } },
      ];
    }

    const tramites = await this.tramiteRepository.find(where, {
      populate: ['cliente', 'pasoActual', 'flujo'],
      orderBy: { createdAt: 'DESC' },
    });

    const estadisticas: Estadisticas = {
      totalTramites: tramites.length,
      porPaso: [],
      porFuerza: [],
      porTipoPrestamo: [],
      tramitesActivos: tramites.filter(
        (tramite) =>
          tramite.pasoActual.tipoPaso !== TipoPaso.FINAL_EXITOSO &&
          tramite.pasoActual.tipoPaso !== TipoPaso.FINAL_RECHAZADO,
      ).length,
      tramitesConRetraso: tramites.filter(
        (tramite) => tramite.pasoActual.diasMaximoSinAvance !== null,
      ).length,
      tramitesUltimaSemana: tramites.filter(
        (tramite) =>
          tramite.createdAt! >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      ).length,
      tramitesRecientes: tramites.slice(0, 10),
    };

    return ApiResponseDto.success(estadisticas);
  }
}
