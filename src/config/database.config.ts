import { Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { ColumnMapping } from 'src/entities/column-mapping.entity';
import { ImportBatch } from 'src/entities/import-batch.entity';
import { ImportTemplate } from 'src/entities/import-template.entity';
import {
  Cliente,
  Documento,
  DocumentoRequerido,
  Fuerza,
  HistorialPaso,
  Lead,
  Provincia,
  Representante,
  Tramite,
  TramiteDocumento,
  User,
} from '../entities';

export const databaseConfig: Options<MySqlDriver> = {
  driver: MySqlDriver,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '1101',
  dbName: process.env.DATABASE_NAME || 'crm_mutual',
  entities: [
    // Entidades principales
    Fuerza,
    Provincia,
    Representante,
    User,
    Cliente,
    Lead,
    Documento,
    DocumentoRequerido,
    HistorialPaso,
    Tramite,
    TramiteDocumento,
    // Entidades ETL
    ImportTemplate,
    ColumnMapping,
    ImportBatch,
  ],
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
  serialization: {
    forceObject: true,
  },
};
