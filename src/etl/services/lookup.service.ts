import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { Fuerza } from '../../entities/fuerza.entity';
import { Provincia } from '../../entities/provincia.entity';
import { Representante } from '../../entities/representante.entity';
import { LookupContext } from '../interfaces/etl.interfaces';

/**
 * Servicio para cargar y cachear lookups de entidades relacionadas.
 * Permite resolver nombres a IDs para transformaciones LOOKUP_*.
 */
@Injectable()
export class LookupService {
  private readonly logger = new Logger(LookupService.name);

  // Cache en memoria (se puede mejorar con Redis para producción)
  private provinciasCache: Map<string, number> | null = null;
  private fuerzasCache: Map<string, number> | null = null;
  private representantesCache: Map<string, number> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  private defaultProvincia: number | null = null;
  private defaultFuerza: number | null = null;
  constructor(private readonly em: EntityManager) {}

  /**
   * Obtiene el contexto de lookup completo.
   */
  async getLookupContext(forceRefresh = false): Promise<LookupContext> {
    const now = Date.now();
    const cacheExpired = now - this.cacheTimestamp > this.CACHE_TTL_MS;
    console.log('cacheExpired', cacheExpired);

    if (forceRefresh || cacheExpired || !this.provinciasCache) {
      await this.refreshCache();
    }

    return {
      provincias: this.provinciasCache!,
      fuerzas: this.fuerzasCache!,
      representantes: this.representantesCache!,
      defaultProvincia: this.defaultProvincia!,
      defaultFuerza: this.defaultFuerza!,
    };
  }

  /**
   * Refresca todo el cache de lookups.
   */
  async refreshCache(): Promise<void> {
    this.logger.debug('Refreshing lookup cache...');

    // Actualizar timestamp ANTES para evitar recursión
    this.cacheTimestamp = Date.now();

    const [provincias, fuerzas, representantes] = await Promise.all([
      this.loadProvincias(),
      this.loadFuerzas(),
      this.loadRepresentantes(),
    ]);

    this.provinciasCache = provincias;
    this.fuerzasCache = fuerzas;
    this.representantesCache = representantes;
    this.defaultProvincia = await this.loadDefaultProvincia();
    this.defaultFuerza = await this.loadDefaultFuerza();
  }

  private async loadDefaultProvincia(): Promise<number> {
    const provincia = await this.em.findOne(Provincia, {
      esDefault: true,
    });
    if (provincia) {
      return provincia.id;
    }

    // Si no existe ninguna variante, crear una nueva
    const newProvincia = this.em.create(Provincia, {
      nombre: 'Otra',
      esDefault: true,
    });
    await this.em.persistAndFlush(newProvincia);

    // Agregar al cache
    if (this.provinciasCache) {
      this.provinciasCache.set('OTRA', newProvincia.id);
    }

    return newProvincia.id;
  }

  private async loadDefaultFuerza(): Promise<number> {
    const fuerza = await this.em.findOne(Fuerza, {
      esDefault: true,
    });
    if (fuerza) {
      return fuerza.id;
    }

    // Si no existe ninguna variante, crear una nueva
    const newFuerza = this.em.create(Fuerza, {
      nombre: 'Otra',
      esDefault: true,
    });
    await this.em.persistAndFlush(newFuerza);

    // Agregar al cache
    if (this.fuerzasCache) {
      this.fuerzasCache.set('OTRA', newFuerza.id);
    }

    return newFuerza.id;
  }
  /**
   * Carga todas las provincias y crea el mapa nombre → id.
   */
  private async loadProvincias(): Promise<Map<string, number>> {
    const provincias = await this.em.find(
      Provincia,
      {},
      { fields: ['id', 'nombre'] },
    );
    const map = new Map<string, number>();

    for (const provincia of provincias) {
      // Guardar con múltiples variantes del nombre
      const variants = this.generateNameVariants(provincia.nombre);
      for (const variant of variants) {
        map.set(variant, provincia.id);
      }
    }

    return map;
  }

  /**
   * Carga todas las fuerzas y crea el mapa nombre → id.
   */
  private async loadFuerzas(): Promise<Map<string, number>> {
    const fuerzas = await this.em.find(
      Fuerza,
      {},
      { fields: ['id', 'nombre'] },
    );
    const map = new Map<string, number>();

    for (const fuerza of fuerzas) {
      const variants = this.generateNameVariants(fuerza.nombre);
      for (const variant of variants) {
        map.set(variant, fuerza.id);
      }
    }

    return map;
  }

  /**
   * Carga todos los representantes y crea el mapa nombre → id.
   */
  private async loadRepresentantes(): Promise<Map<string, number>> {
    const representantes = await this.em.find(
      Representante,
      {},
      { fields: ['id', 'fullName'] },
    );
    const map = new Map<string, number>();

    for (const rep of representantes) {
      const variants = this.generateNameVariants(rep.fullName);
      for (const variant of variants) {
        map.set(variant, rep.id);
      }
    }

    return map;
  }

  /**
   * Genera variantes de un nombre para matching flexible.
   */
  private generateNameVariants(name: string): string[] {
    const variants: string[] = [];
    const normalized = name.trim().toUpperCase();

    // Versión normalizada
    variants.push(normalized);

    // Sin acentos
    const withoutAccents = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    variants.push(withoutAccents);

    // Sin espacios extra
    const compacted = normalized.replace(/\s+/g, ' ');
    variants.push(compacted);

    // Con guiones bajos en lugar de espacios
    variants.push(normalized.replace(/\s+/g, '_'));

    return [...new Set(variants)]; // Eliminar duplicados
  }

  /**
   * Busca una provincia por nombre.
   */
  async findProvinciaId(nombre: string): Promise<number | null> {
    const context = await this.getLookupContext();
    const normalized = nombre.trim().toUpperCase();
    return context.provincias.get(normalized) ?? context.defaultProvincia;
  }

  /**
   * Busca una fuerza por nombre.
   */
  async findFuerzaId(nombre: string): Promise<number | null> {
    const context = await this.getLookupContext();
    const normalized = nombre.trim().toUpperCase();
    return context.fuerzas.get(normalized) ?? context.defaultFuerza;
  }

  /**
   * Busca un representante por nombre.
   */
  async findRepresentanteId(nombre: string): Promise<number | null> {
    const context = await this.getLookupContext();
    const normalized = nombre.trim().toUpperCase();
    return context.representantes.get(normalized) ?? null;
  }

  /**
   * Obtiene todas las provincias disponibles (para UI).
   */
  async getProvincias(): Promise<Array<{ id: number; nombre: string }>> {
    return this.em.find(Provincia, {}, { fields: ['id', 'nombre'] });
  }

  /**
   * Obtiene todas las fuerzas disponibles (para UI).
   */
  async getFuerzas(): Promise<Array<{ id: number; nombre: string }>> {
    return this.em.find(Fuerza, {}, { fields: ['id', 'nombre'] });
  }

  /**
   * Invalida el cache (útil cuando se modifican provincias/fuerzas/representantes).
   */
  invalidateCache(): void {
    this.provinciasCache = null;
    this.fuerzasCache = null;
    this.representantesCache = null;
    this.cacheTimestamp = 0;
    this.logger.debug('Lookup cache invalidated');
  }
}
