import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UploadTramiteDocumentosDto {
  @IsNumber()
  tramiteId: number;

  @IsNumber()
  documentoId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UploadTramiteDocumentosResponseDto {
  success: boolean;
  tramiteDocumentos: {
    id: number;
    tramiteId: number;
    documentoId: number;
    urlArchivo: string;
    archivoNombre: string;
    fechaSubida: Date;
  }[];
  errors: string[];
}
