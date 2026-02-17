import { DocumentoTipo } from '../../entities/tramite-documento.entity';

export class UploadedFileDto {
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  documentoTipo: DocumentoTipo;
}

export class UploadResponseDto {
  success: boolean;
  files: UploadedFileDto[];
  errors: string[];
  message?: string;
}

export class SingleUploadResponseDto {
  success: boolean;
  file: UploadedFileDto;
  message: string;
}
