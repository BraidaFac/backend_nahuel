import { Injectable, Logger } from '@nestjs/common';
import { FileType } from 'src/entities/import-template.entity';
import { IFileParser } from '../interfaces/etl.interfaces';
import { CsvParser } from './csv.parser';
import { XlsxParser } from './xlsx.parser';

/**
 * Factory para obtener el parser adecuado según el tipo de archivo.
 */
@Injectable()
export class FileParserFactory {
  private readonly logger = new Logger(FileParserFactory.name);

  constructor(
    private readonly csvParser: CsvParser,
    private readonly xlsxParser: XlsxParser,
  ) {}

  /**
   * Obtiene el parser adecuado para el tipo de archivo.
   */
  getParser(fileType: FileType): IFileParser {
    switch (fileType) {
      case FileType.CSV:
        return this.csvParser;
      case FileType.XLSX:
        return this.xlsxParser;
      default:
        throw new Error(`Unsupported file type: ${fileType as string}`);
    }
  }

  /**
   * Detecta el tipo de archivo basándose en la extensión y contenido.
   */
  detectFileType(fileName: string): FileType | null {
    const extension = fileName.toLowerCase().split('.').pop();

    if (extension === 'xlsx') {
      return FileType.XLSX;
    }
    return null;
  }

  /**
   * Valida que el archivo tenga un formato soportado.
   */
  validateFileFormat(fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return ['csv', 'xlsx', 'xls'].includes(extension || '');
  }

  /**
   * Obtiene las extensiones de archivo soportadas.
   */
  getSupportedExtensions(): string[] {
    return ['.csv', '.xlsx', '.xls'];
  }
}
