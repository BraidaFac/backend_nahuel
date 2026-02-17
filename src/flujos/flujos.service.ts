import { EntityManager, EntityRepository, LoadStrategy } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReglaTransicion } from 'src/entities/regla-transicion.entity';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { DocumentoRequerido } from '../entities/documento-requerido.entity';
import { Documento } from '../entities/documento.entity';
import { FlujoTramite } from '../entities/flujo-tramite.entity';
import { Fuerza } from '../entities/fuerza.entity';
import { PasoTramite, TipoPaso } from '../entities/paso-tramite.entity';
import { TipoPrestamo } from '../entities/tramite.entity';
import { CreateFlujoDto } from './dto/create-flujo.dto';
import { UpdateFlujoDto } from './dto/update-flujo.dto';

@Injectable()
export class FlujosService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(FlujoTramite)
    private flujoRepository: EntityRepository<FlujoTramite>,
    @InjectRepository(PasoTramite)
    private pasoRepository: EntityRepository<PasoTramite>,
    @InjectRepository(Fuerza)
    private fuerzaRepository: EntityRepository<Fuerza>,
    @InjectRepository(DocumentoRequerido)
    private documentoRequeridoRepository: EntityRepository<DocumentoRequerido>,
    @InjectRepository(Documento)
    private documentoRepository: EntityRepository<Documento>,
  ) {}

  async createFlujo(
    createFlujoDto: CreateFlujoDto,
  ): Promise<ApiResponseDto<FlujoTramite>> {
    const fuerza = await this.fuerzaRepository.findOne({
      id: createFlujoDto.fuerza.id,
    });
    if (!fuerza) throw new NotFoundException('Fuerza no encontrada');

    const flujos = await this.flujoRepository.find({
      fuerza: {
        id: createFlujoDto.fuerza.id,
      },
    });
    if (
      flujos.findIndex((f) => f.tipoPrestamo == createFlujoDto.tipoPrestamo) !==
      -1
    )
      throw new BadRequestException(
        'Ya existe un flujo para esta fuerza y tipo de prestamo',
      );
    // Verificar documentos requeridos
    const documentos = await this.documentoRepository.find({
      id: {
        $in: createFlujoDto.documentosRequeridos.map((d) => d.documento.id),
      },
    });

    const flujo = new FlujoTramite();
    flujo.nombre = createFlujoDto.nombre;
    flujo.descripcion = createFlujoDto.descripcion;
    flujo.fuerza = fuerza;
    flujo.tipoPrestamo = createFlujoDto.tipoPrestamo;
    flujo.activo = createFlujoDto.activo;

    // --- Documentos requeridos ---
    for (const docDto of createFlujoDto.documentosRequeridos) {
      const documentoEntity = documentos.find(
        (d) => d.id === docDto.documento.id,
      );
      if (!documentoEntity) continue;

      const docReq = this.em.create(DocumentoRequerido, {
        documento: documentoEntity,
        obligatorio: docDto.obligatorio,
        noNecesarioSiEsSocio: docDto.noNecesarioSiEsSocio,
        activo: docDto.activo,
        flujo,
      });
      flujo.documentosRequeridos.add(docReq);
    }

    // --- Pasos del flujo ---
    const pasosMap = new Map<number, PasoTramite>(); // para resolver las transiciones luego

    for (const pasoDto of createFlujoDto.pasos) {
      const paso = this.em.create(PasoTramite, {
        nombre: pasoDto.nombre,
        descripcion: pasoDto.descripcion,
        tipoPaso: pasoDto.tipoPaso ?? TipoPaso.INTERMEDIO,
        flujo,
        orden: pasoDto.orden,
        diasMaximoSinAvance: pasoDto.diasMaximoSinAvance,
        color: pasoDto.color,
      });
      flujo.pasos.add(paso);
      pasosMap.set(pasoDto.orden, paso);
    }

    for (const pasoDto of createFlujoDto.pasos) {
      const paso = pasosMap.get(pasoDto.orden);
      if (paso) {
        for (const transicionDto of pasoDto.transicionesOrigen ?? []) {
          paso.transicionesOrigen.add(
            this.em.create(ReglaTransicion, {
              pasoOrigen: paso,
              pasoDestino: pasosMap.get(transicionDto.pasoDestino.orden)!,
              descripcion: transicionDto.descripcion,
              esAutomatico: transicionDto.esAutomatico,
              condicionDocumentos: transicionDto.condicionDocumentos,
            }),
          );
        }
      }
    }

    await this.em.persistAndFlush(flujo);
    return ApiResponseDto.success(flujo, 'Flujo creado exitosamente');
  }

  async updateFlujo(
    id: number,
    updateFlujoDto: UpdateFlujoDto,
  ): Promise<ApiResponseDto<FlujoTramite>> {
    // Buscar el flujo existente con todas sus relaciones
    const flujo = await this.flujoRepository.findOne(
      { id },
      {
        populate: [
          'fuerza',
          'documentosRequeridos.documento',
          'pasos.transicionesOrigen.pasoDestino',
          'pasos.transicionesDestino.pasoOrigen',
        ],
      },
    );

    if (!flujo) {
      throw new NotFoundException('Flujo no encontrado');
    }

    // Actualizar campos básicos si se proporcionan
    if (updateFlujoDto.nombre !== undefined) {
      flujo.nombre = updateFlujoDto.nombre;
    }
    if (updateFlujoDto.descripcion !== undefined) {
      flujo.descripcion = updateFlujoDto.descripcion;
    }
    if (updateFlujoDto.activo !== undefined) {
      flujo.activo = updateFlujoDto.activo;
    }
    if (updateFlujoDto.tipoPrestamo !== undefined) {
      const flujos = await this.flujoRepository.find({
        fuerza: {
          id: flujo.fuerza.id,
        },
      });
      if (
        flujos.findIndex(
          (f) => f.tipoPrestamo == updateFlujoDto.tipoPrestamo,
        ) !== -1
      )
        throw new BadRequestException(
          'Ya existe un flujo para esta fuerza y tipo de prestamo',
        );
      flujo.tipoPrestamo = updateFlujoDto.tipoPrestamo;
    }

    // Actualizar fuerza si se proporciona
    if (updateFlujoDto.fuerza) {
      const fuerza = await this.fuerzaRepository.findOne({
        id: updateFlujoDto.fuerza.id,
      });
      if (!fuerza) throw new NotFoundException('Fuerza no encontrada');
      flujo.fuerza = fuerza;
    }

    // Actualizar documentos requeridos si se proporcionan
    if (updateFlujoDto.documentosRequeridos) {
      const documentosIds = updateFlujoDto.documentosRequeridos
        .map((d) => d.documento.id)
        .filter((id) => id !== undefined);

      // Verificar que los documentos existen
      const documentos = await this.documentoRepository.find({
        id: { $in: documentosIds },
      });

      // IDs que vienen en el DTO
      const dtoDocReqIds = updateFlujoDto.documentosRequeridos
        .map((d) => d.id)
        .filter((id) => id !== undefined);

      // Eliminar los documentos requeridos que ya no están en el DTO
      const docsToRemove = flujo.documentosRequeridos
        .getItems()
        .filter((doc) => !dtoDocReqIds.includes(doc.id));
      docsToRemove.forEach((doc) => flujo.documentosRequeridos.remove(doc));

      // Actualizar o crear documentos requeridos
      for (const docDto of updateFlujoDto.documentosRequeridos) {
        const documentoEntity = documentos.find(
          (d) => d.id === docDto.documento.id,
        );
        if (!documentoEntity) continue;

        if (docDto.id) {
          // Actualizar existente
          const existente = flujo.documentosRequeridos
            .getItems()
            .find((d) => d.id === docDto.id);
          if (existente) {
            existente.documento = documentoEntity;
            existente.obligatorio = docDto.obligatorio;
            existente.noNecesarioSiEsSocio = docDto.noNecesarioSiEsSocio;
            existente.activo = docDto.activo;
          }
        } else {
          // Crear nuevo
          const docReq = this.em.create(DocumentoRequerido, {
            documento: documentoEntity,
            obligatorio: docDto.obligatorio,
            noNecesarioSiEsSocio: docDto.noNecesarioSiEsSocio,
            activo: docDto.activo,
            flujo,
          });
          flujo.documentosRequeridos.add(docReq);
        }
      }
    }

    // Actualizar pasos si se proporcionan
    if (updateFlujoDto.pasos) {
      // IDs de pasos que vienen en el DTO
      const dtoPasoIds = updateFlujoDto.pasos
        .map((p) => p.id)
        .filter((id) => id !== undefined);

      // Eliminar los pasos que ya no están en el DTO
      const pasosToRemove = flujo.pasos
        .getItems()
        .filter((paso) => !dtoPasoIds.includes(paso.id));
      pasosToRemove.forEach((paso) => flujo.pasos.remove(paso));

      // Map para almacenar pasos por secuencia (para las transiciones)
      const pasosMap = new Map<number, PasoTramite>();

      // Actualizar o crear pasos
      for (const pasoDto of updateFlujoDto.pasos) {
        let paso: PasoTramite;

        if (pasoDto.id) {
          // Actualizar existente
          const existente = flujo.pasos
            .getItems()
            .find((p) => p.id === pasoDto.id);
          if (existente) {
            existente.nombre = pasoDto.nombre;
            existente.descripcion = pasoDto.descripcion;
            existente.diasMaximoSinAvance = pasoDto.diasMaximoSinAvance;
            existente.color = pasoDto.color;
            paso = existente;
          } else {
            continue; // Si no existe, saltar
          }
        } else {
          // Crear nuevo paso
          paso = this.em.create(PasoTramite, {
            nombre: pasoDto.nombre,
            descripcion: pasoDto.descripcion,
            flujo,
            orden: pasoDto.orden,
            tipoPaso: pasoDto.tipoPaso ?? TipoPaso.INTERMEDIO,
            diasMaximoSinAvance: pasoDto.diasMaximoSinAvance,
            color: pasoDto.color,
          });
          flujo.pasos.add(paso);
        }

        pasosMap.set(pasoDto.orden, paso);
      }

      // Actualizar transiciones
      for (const pasoDto of updateFlujoDto.pasos) {
        const paso = pasosMap.get(pasoDto.orden);
        if (!paso) continue;

        // IDs de transiciones que vienen en el DTO
        const dtoTransicionIds = (pasoDto.transicionesOrigen ?? [])
          .map((t) => t.id)
          .filter((id) => id !== undefined);

        // Eliminar transiciones que ya no están en el DTO
        const transicionesToRemove = paso.transicionesOrigen
          .getItems()
          .filter((t) => !dtoTransicionIds.includes(t.id));
        transicionesToRemove.forEach((t) => paso.transicionesOrigen.remove(t));

        // Actualizar o crear transiciones
        for (const transicionDto of pasoDto.transicionesOrigen ?? []) {
          const pasoDestino = pasosMap.get(transicionDto.pasoDestino.orden);
          if (!pasoDestino) continue;

          if (transicionDto.id) {
            // Actualizar existente
            const existente = paso.transicionesOrigen
              .getItems()
              .find((t) => t.id === transicionDto.id);
            if (existente) {
              existente.pasoDestino = pasoDestino;
              existente.descripcion = transicionDto.descripcion;
              existente.esAutomatico = transicionDto.esAutomatico;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              existente.condicionDocumentos = transicionDto.condicionDocumentos;
            }
          } else {
            // Crear nueva transición
            const nuevaTransicion = this.em.create(ReglaTransicion, {
              pasoOrigen: paso,
              pasoDestino,
              descripcion: transicionDto.descripcion,
              esAutomatico: transicionDto.esAutomatico,
              condicionDocumentos: transicionDto.condicionDocumentos,
            });
            paso.transicionesOrigen.add(nuevaTransicion);
          }
        }
      }
    }

    await this.em.flush();
    return ApiResponseDto.success(flujo, 'Flujo actualizado exitosamente');
  }

  async removeFlujo(id: number): Promise<ApiResponseDto> {
    const flujo = await this.flujoRepository.findOne({ id });
    if (!flujo) {
      throw new NotFoundException('Flujo no encontrado');
    }

    await this.em.removeAndFlush(flujo);
    return ApiResponseDto.success(null, 'Flujo eliminado exitosamente');
  }

  async getPasosByFlujo(
    flujoId: number,
  ): Promise<ApiResponseDto<PasoTramite[]>> {
    const pasos = await this.pasoRepository.find(
      { flujo: { id: flujoId } },
      { orderBy: { createdAt: 'ASC' } },
    );
    return ApiResponseDto.success(pasos);
  }

  async getFirstPaso(flujoId: number): Promise<PasoTramite | null> {
    return await this.pasoRepository.findOne(
      { flujo: { id: flujoId } },
      { orderBy: { createdAt: 'ASC' } },
    );
  }

  async findAll(): Promise<ApiResponseDto<FlujoTramite[]>> {
    const flujos = await this.flujoRepository.find(
      {},
      {
        orderBy: { createdAt: 'DESC' },
        populate: ['fuerza', 'pasos', 'documentosRequeridos.documento'],
      },
    );

    return ApiResponseDto.success(flujos);
  }

  async findById(id: number): Promise<ApiResponseDto<FlujoTramite>> {
    const flujo = await this.flujoRepository.findOne(
      { id },
      {
        populate: [
          'fuerza',
          'pasos.transicionesOrigen.pasoDestino',
          'pasos.transicionesOrigen.pasoOrigen',
          'pasos.transicionesDestino.pasoOrigen',
          'pasos.transicionesDestino.pasoDestino',
          'documentosRequeridos.documento',
        ],
        strategy: LoadStrategy.JOINED,
      },
    );
    if (!flujo) throw new NotFoundException('Flujo no encontrado');

    return ApiResponseDto.success(flujo);
  }
  async findFlujoByFuerza(
    fuerzaId: number,
    tipoPrestamo?: TipoPrestamo,
  ): Promise<ApiResponseDto<FlujoTramite>> {
    const where: {
      fuerza: { id: number };
      tipoPrestamo?: TipoPrestamo;
    } = { fuerza: { id: fuerzaId } };

    const flujos = await this.flujoRepository.find(where, {
      populate: ['pasos', 'documentosRequeridos.documento'],
      orderBy: { createdAt: 'DESC' },
    });

    if (flujos.length === 0) throw new NotFoundException('Flujo no encontrado');
    if (flujos.length > 2)
      throw new BadRequestException(
        'Hay mas de un flujo para esta fuerza y tipo de prestamo',
      );

    if (flujos.length === 2) {
      const flujo = flujos.find((flujo) => flujo.tipoPrestamo === tipoPrestamo);
      if (!flujo) throw new NotFoundException('Flujo no encontrado');
      return ApiResponseDto.success(flujo);
    }

    return ApiResponseDto.success(flujos[0]);
  }

  async findOneFlujo(id: number): Promise<ApiResponseDto<FlujoTramite>> {
    const flujo = await this.flujoRepository.findOne(
      { id },
      {
        populate: [
          'fuerza',
          'pasos.transicionesOrigen.pasoDestino',
          'documentosRequeridos.documento',
        ],
      },
    );

    if (!flujo) {
      throw new NotFoundException('Flujo no encontrado');
    }

    return ApiResponseDto.success(flujo);
  }

  async getNextPaso(
    flujoId: number,
    currentPasoId: number,
  ): Promise<PasoTramite | null> {
    const flujo = await this.flujoRepository.findOne(
      { id: flujoId },
      {
        populate: [
          'pasos',
          'pasos.transicionesOrigen.pasoDestino',
          'pasos.transicionesOrigen.pasoOrigen',
          'pasos.transicionesDestino.pasoOrigen',
          'pasos.transicionesDestino.pasoDestino',
        ],
      },
    );

    if (!flujo) {
      throw new NotFoundException('Flujo no encontrado');
    }

    const currentPaso = flujo.pasos
      .getItems()
      .find((p) => p.id === currentPasoId);

    if (!currentPaso) {
      throw new NotFoundException('Paso no encontrado');
    }
    if (currentPaso.id === flujo.getLastPaso()?.id) {
      return null;
    }

    const destinosPosibles = currentPaso.transicionesOrigen
      .getItems()
      .map((t) => t.pasoDestino);

    if (destinosPosibles.length === 0) {
      throw new NotFoundException('No hay transiciones de salida para el paso');
    }

    const nextPaso = destinosPosibles.sort((a, b) => a.id - b.id)[0];

    return nextPaso;
  }

  async getDocumentosRequeridos(
    flujoId: number,
  ): Promise<ApiResponseDto<DocumentoRequerido[]>> {
    const documentos = await this.documentoRequeridoRepository.find(
      { flujo: { id: flujoId } },
      { populate: ['documento'] },
    );
    return ApiResponseDto.success(documentos);
  }
}
