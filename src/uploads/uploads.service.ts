import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DocumentoTipo } from '../entities/tramite-documento.entity';

@Injectable()
export class UploadsService {
  private readonly uploadPath = join(process.cwd(), 'uploads');

  constructor() {
    // Crear directorio uploads si no existe
    this.ensureUploadDirectory();
  }

  /**
   * Procesa múltiples archivos subidos
   */

  /**
   * Obtiene el tipo de documento basado en el mimetype
   */
  private getDocumentoTipo(mimetype: string): DocumentoTipo | null {
    const mimeTypeMap: Record<string, DocumentoTipo> = {
      'image/jpeg': DocumentoTipo.jpeg,
      'image/jpg': DocumentoTipo.jpg,
      'image/png': DocumentoTipo.png,
      'application/pdf': DocumentoTipo.pdf,
    };

    return mimeTypeMap[mimetype] || null;
  }

  private ensureUploadDirectory(): void {
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Crea una carpeta para el cliente si no existe
   * Sanitiza el nombre para evitar problemas con el sistema de archivos
   */
  ensureClientDirectory(clienteName: string): string {
    // Sanitizar el nombre del cliente (quitar caracteres especiales)
    const sanitizedName = clienteName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Quitar caracteres especiales
      .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
      .trim();

    const clientPath = join(this.uploadPath, sanitizedName);

    if (!existsSync(clientPath)) {
      mkdirSync(clientPath, { recursive: true });
    }

    return clientPath;
  }

  /**
   * Obtiene la ruta de la carpeta del cliente
   */
  getClientPath(clienteName: string): string {
    const sanitizedName = clienteName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .trim();

    return join(this.uploadPath, sanitizedName);
  }

  /**
   * Obtiene la URL completa de un archivo
   */
  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  /**
   * Obtiene la ruta completa de un archivo
   */
  getFilePath(filename: string): string {
    return join(this.uploadPath, filename);
  }

  /**
   * Valida si un archivo existe
   */
  fileExists(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    return existsSync(filePath);
  }
}
