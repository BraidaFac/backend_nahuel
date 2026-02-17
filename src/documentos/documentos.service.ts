import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Documento } from '../entities/documento.entity';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Injectable()
export class DocumentosService {
  constructor(
    @InjectRepository(Documento)
    private documentoRepository: EntityRepository<Documento>,
  ) {}

  async create(
    createDocumentoDto: CreateDocumentoDto,
  ): Promise<ApiResponseDto<Documento>> {
    const documento = new Documento();
    Object.assign(documento, createDocumentoDto);
    await this.documentoRepository
      .getEntityManager()
      .persistAndFlush(documento);

    return ApiResponseDto.success(documento, 'Documento creado exitosamente');
  }

  async findAll(): Promise<ApiResponseDto<Documento[]>> {
    const documentos = await this.documentoRepository.findAll({
      orderBy: { nombre: 'ASC' },
    });
    return ApiResponseDto.success(documentos);
  }

  async findOne(id: number): Promise<ApiResponseDto<Documento>> {
    const documento = await this.documentoRepository.findOne({ id });
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }
    return ApiResponseDto.success(documento);
  }

  async update(
    id: number,
    updateDocumentoDto: UpdateDocumentoDto,
  ): Promise<ApiResponseDto<Documento>> {
    const documento = await this.documentoRepository.findOne({ id });
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    Object.assign(documento, updateDocumentoDto);
    await this.documentoRepository.getEntityManager().flush();

    return ApiResponseDto.success(
      documento,
      'Documento actualizado exitosamente',
    );
  }

  async remove(id: number): Promise<ApiResponseDto> {
    const documento = await this.documentoRepository.findOne({ id });
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    await this.documentoRepository.getEntityManager().removeAndFlush(documento);
    return ApiResponseDto.success(null, 'Documento eliminado exitosamente');
  }

  async handleFileUpload(
    file: Express.Multer.File,
    body: CreateDocumentoDto,
  ): Promise<ApiResponseDto<Documento>> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const createDocumentoDto: CreateDocumentoDto = {
      nombre: body.nombre || file.originalname,
      descripcion: body.descripcion,
      tipo: body.tipo || 'archivo',
      archivoUrl: `/uploads/${file.filename}`,
      archivoNombre: file.originalname,
      archivoTipo: file.mimetype.includes('pdf') ? 'pdf' : 'imagen',
    };

    return this.create(createDocumentoDto);
  }
}
