import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ColumnMapping } from '../../entities/column-mapping.entity';
import { ImportTemplate } from '../../entities/import-template.entity';
import { Provincia } from '../../entities/provincia.entity';
import { entities } from '../datos';
import { CreateColumnMappingDto } from '../dto/create-column-mapping.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import {
  EntityProperty,
  EntityType,
  FileParserOptions,
} from '../interfaces/etl.interfaces';

/**
 * DTO para crear un mapeo de columna.
 */
/**
 * Servicio para gestionar la configuración de templates y mapeos de columnas.
 */
@Injectable()
export class MappingConfigService {
  private readonly logger = new Logger(MappingConfigService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(ImportTemplate)
    private readonly templateRepository: EntityRepository<ImportTemplate>,
    @InjectRepository(ColumnMapping)
    private readonly mappingRepository: EntityRepository<ColumnMapping>,
  ) {}

  // ==================== TEMPLATES ====================

  /**
   * Obtiene todos los templates activos.
   */
  async findAllTemplates(): Promise<ImportTemplate[]> {
    const templates = await this.templateRepository.find(
      { isActive: true },
      {
        populate: ['provincia', 'columnMappings'],
        orderBy: { nombre: 'ASC' },
      },
    );
    return templates.map((template) => ({
      ...template,
      entity: this.getEntity(template.entityType),
    }));
  }

  getEntity(entityType: string): EntityType | undefined {
    return entities.find((entity) => entity.name === entityType);
  }

  /**
   * Obtiene un template por ID con sus mapeos.
   */
  async findTemplateById(id: number): Promise<ImportTemplate> {
    const template = await this.templateRepository.findOne(
      { id },
      { populate: ['provincia', 'columnMappings'] },
    );

    if (!template) {
      throw new NotFoundException(`Template con ID ${id} no encontrado`);
    }

    return template;
  }

  /**
   * Busca un template por provincia y fuerza.
   */

  /**
   * Crea un nuevo template de importación.
   */
  async createTemplate(dto: CreateTemplateDto): Promise<ImportTemplate> {
    const template = this.templateRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      fileType: dto.fileType,
      entityType: dto.entityType ?? dto.entity?.name ?? '',
      delimiter: dto.delimiter ?? ',',
      sheetName: dto.sheetName,
      headerRow: dto.headerRow ?? 1,
      dataStartRow: dto.dataStartRow ?? 2,
      encoding: dto.encoding ?? 'utf-8',
      isActive: true,
    });

    for (const mapping of dto.columnMappings) {
      const columnMapping = this.mappingRepository.create({
        sourceColumn: mapping.sourceColumn,
        defaultValue: mapping.defaultValue,
        template: template,
        targetProperty: mapping.targetProperty,
        relationProperty: mapping.relationProperty,
      });
      template.columnMappings.add(columnMapping);
    }

    if (dto.provinciaId) {
      template.provincia = this.em.getReference(Provincia, dto.provinciaId);
    }
    await this.em.persistAndFlush(template);
    return template;
  }

  /**
   * Actualiza un template existente.
   */
  async updateTemplate(
    id: number,
    dto: Partial<CreateTemplateDto>,
  ): Promise<ImportTemplate> {
    const template = await this.findTemplateById(id);
    if (dto.nombre) template.nombre = dto.nombre;
    if (dto.descripcion !== undefined) template.descripcion = dto.descripcion;
    if (dto.fileType) template.fileType = dto.fileType;
    if (dto.delimiter !== undefined) template.delimiter = dto.delimiter;
    if (dto.sheetName !== undefined) template.sheetName = dto.sheetName;
    if (dto.headerRow !== undefined) template.headerRow = dto.headerRow;
    if (dto.dataStartRow !== undefined)
      template.dataStartRow = dto.dataStartRow;
    if (dto.encoding !== undefined) template.encoding = dto.encoding;

    if (dto.provinciaId !== undefined) {
      template.provincia = dto.provinciaId
        ? this.em.getReference(Provincia, dto.provinciaId)
        : undefined;
    }
    if (dto.entityType !== undefined) template.entityType = dto.entityType;
    if (dto.columnMappings !== undefined) {
      for (const mapping of dto.columnMappings) {
        console.log(mapping);
        const existingMapping = template.columnMappings
          .getItems()
          .find((m) => m.id === mapping.id);
        if (existingMapping) {
          this.mappingRepository.assign(existingMapping, mapping);
        } else {
          const columnMapping = this.mappingRepository.create({
            sourceColumn: mapping.sourceColumn,
            defaultValue: mapping.defaultValue,
            targetProperty: mapping.targetProperty,
            relationProperty: mapping.relationProperty,
            template: template,
          });
          template.columnMappings.add(columnMapping);
        }
      }
    }

    await this.em.flush();
    return template;
  }

  /**
   * Elimina (desactiva) un template.
   */
  async deleteTemplate(id: number): Promise<void> {
    const template = await this.templateRepository.findOne({ id });
    if (!template) {
      throw new NotFoundException(`Template con ID ${id} no encontrado`);
    }
    await this.em.removeAndFlush(template);
  }

  /**
   * Elimina permanentemente un template y sus mapeos.
   */
  async hardDeleteTemplate(id: number): Promise<void> {
    const template = await this.findTemplateById(id);
    await this.em.removeAndFlush(template);
  }

  // ==================== COLUMN MAPPINGS ====================

  /**
   * Agrega un mapeo de columna a un template.
   */
  async addColumnMapping(
    templateId: number,
    dto: CreateColumnMappingDto,
  ): Promise<ColumnMapping> {
    const template = await this.findTemplateById(templateId);

    const mapping = new ColumnMapping();
    mapping.template = template;
    mapping.sourceColumn = dto.sourceColumn;
    mapping.defaultValue = dto.defaultValue;

    await this.em.persistAndFlush(mapping);
    return mapping;
  }

  /**
   * Actualiza un mapeo de columna.
   */
  async updateColumnMapping(
    mappingId: number,
    dto: Partial<CreateColumnMappingDto>,
  ): Promise<ColumnMapping> {
    const mapping = await this.mappingRepository.findOne({ id: mappingId });

    if (!mapping) {
      throw new NotFoundException(`Mapping con ID ${mappingId} no encontrado`);
    }

    if (dto.sourceColumn !== undefined) mapping.sourceColumn = dto.sourceColumn;
    if (dto.defaultValue !== undefined) mapping.defaultValue = dto.defaultValue;

    await this.em.flush();
    return mapping;
  }

  /**
   * Elimina un mapeo de columna.
   */
  async deleteColumnMapping(mappingId: number): Promise<void> {
    const mapping = await this.mappingRepository.findOne({ id: mappingId });

    if (!mapping) {
      throw new NotFoundException(`Mapping con ID ${mappingId} no encontrado`);
    }

    await this.em.removeAndFlush(mapping);
  }

  /**
   * Obtiene los mapeos de un template como ColumnMappingConfig.
   */
  async getMappingConfigs(templateId: number): Promise<ColumnMapping[]> {
    const template = await this.findTemplateById(templateId);

    return template.columnMappings.getItems().map((m) => ({
      id: m.id,
      sourceColumn: m.sourceColumn,
      defaultValue: m.defaultValue,
      targetProperty: m.targetProperty,
      relationProperty: m.relationProperty,
      template: m.template,
    }));
  }

  /**
   * Obtiene las opciones de parser desde un template.
   */
  getParserOptions(template: ImportTemplate): FileParserOptions {
    return {
      delimiter: template.delimiter,
      encoding: (template.encoding as BufferEncoding) || 'utf-8',
      headerRow: template.headerRow,
      dataStartRow: template.dataStartRow,
      sheetName: template.sheetName,
    };
  }

  // ==================== METADATA ====================
  /**
   * Obtiene las propiedades válidas para una entidad específica desde los metadatos de MikroORM.
   */
  getEntityProperties(entityType: string): EntityProperty[] {
    return (
      entities.find((entity) => entity.name === entityType)?.entityProperties ??
      []
    );
  }
}
