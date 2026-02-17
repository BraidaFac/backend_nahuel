# Arquitectura ETL para Importación de Clientes

## 1. Diseño de Alto Nivel

### Flujo ETL Completo

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO ETL - IMPORTACIÓN DE CLIENTES                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌───────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  UPLOAD  │───▶│    EXTRACT    │───▶│    TRANSFORM    │───▶│       LOAD       │
│  (File)  │    │   (Parsing)   │    │    (Mapping)    │    │   (Persistence)  │
└──────────┘    └───────────────┘    └─────────────────┘    └──────────────────┘
                       │                      │                      │
                       ▼                      ▼                      ▼
              ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
              │ FileParserFactory│    │ MappingResolver │    │ BulkInsertService│
              │  - CSVParser    │    │  - ConfigLoader │    │  - BatchProcessor│
              │  - XLSXParser   │    │  - Transformer  │    │  - ConflictHandler│
              └─────────────────┘    │  - Normalizer   │    └──────────────────┘
                                     │  - Validator    │
                                     └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │ DeduplicationSvc│
                                    │  - InMemory     │
                                    │  - VsDatabase   │
                                    └─────────────────┘
```

### Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRESENTATION                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                        EtlController                                         │    │
│  │   POST /etl/import-clientes                                                  │    │
│  │   POST /etl/validate-file                                                    │    │
│  │   GET  /etl/templates                                                        │    │
│  │   CRUD /etl/column-mappings                                                  │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   ORCHESTRATION                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                        EtlOrchestratorService                                │    │
│  │   - Coordina todo el flujo ETL                                               │
│  │   - Maneja transacciones                                                     │
│  │   - Genera reportes de importación                                           │
│  │   - Gestiona errores parciales                                               │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   APPLICATION                                        │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │   FileParserSvc    │  │  MappingConfigSvc  │  │   TransformationSvc        │    │
│  │   - detect format  │  │  - load configs    │  │   - apply mappings         │    │
│  │   - parse stream   │  │  - resolve mapping │  │   - normalize data         │    │
│  │   - yield rows     │  │  - validate config │  │   - transform types        │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────────────┘    │
│                                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │  ValidationSvc     │  │  DeduplicationSvc  │  │   BulkPersistenceSvc       │    │
│  │  - schema valid    │  │  - dedupe internal │  │   - batch insert           │    │
│  │  - business rules  │  │  - dedupe vs DB    │  │   - conflict resolution    │    │
│  │  - reference check │  │  - build key index │  │   - transaction mgmt       │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                     DOMAIN                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │   RawFileRow       │  │  ColumnMapping     │  │   ImportTemplate           │    │
│  │   (Value Object)   │  │  (Entity)          │  │   (Entity)                 │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────────────┘    │
│                                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │   ImportResult     │  │  TransformError    │  │   ImportBatch              │    │
│  │   (Value Object)   │  │  (Value Object)    │  │   (Entity)                 │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  INFRASTRUCTURE                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │    CSVParser       │  │    XLSXParser      │  │   MikroORM Repositories    │    │
│  │    (papaparse)     │  │    (exceljs)       │  │                            │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Modelo de Configuración Dinámica

### Entidades de Configuración

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           MODELO DE DATOS - CONFIGURACIÓN                            │
└──────────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────┐         1:N        ┌──────────────────────────────┐
  │    ImportTemplate       │◄───────────────────│      ColumnMapping           │
  ├─────────────────────────┤                    ├──────────────────────────────┤
  │ id: number              │                    │ id: number                   │
  │ nombre: string          │                    │ sourceColumn: string         │
  │ descripcion?: string    │                    │ sourceColumnIndex?: number   │
  │ fileType: 'csv'|'xlsx'  │                    │ targetProperty: string       │
  │ provinciaId?: number    │                    │ transformationType?: string  │
  │ fuerzaId?: number       │                    │ defaultValue?: string        │
  │ delimiter?: string      │                    │ isRequired: boolean          │
  │ sheetName?: string      │                    │ validationRules?: JSON       │
  │ headerRow: number       │                    │ orden: number                │
  │ isActive: boolean       │                    │ template: ImportTemplate     │
  │ createdAt: Date         │                    │ createdAt: Date              │
  └─────────────────────────┘                    └──────────────────────────────┘
                │
                │  N:1 (opcional)
                ▼
  ┌─────────────────────────┐
  │    Provincia / Fuerza   │  (entidades existentes para asociar templates)
  └─────────────────────────┘
```

### Ejemplo de Configuración

```json
// ImportTemplate
{
  "id": 1,
  "nombre": "Template Buenos Aires - Policía Federal",
  "fileType": "xlsx",
  "provinciaId": 1,
  "fuerzaId": 2,
  "sheetName": "Listado",
  "headerRow": 1,
  "isActive": true
}

// ColumnMappings para este template
[
  {
    "sourceColumn": "NOMBRE COMPLETO",
    "targetProperty": "fullName",
    "transformationType": "TRIM_UPPERCASE_FIRST",
    "isRequired": true,
    "orden": 1
  },
  {
    "sourceColumn": "MATRICULA",
    "targetProperty": "matricula",
    "transformationType": "TRIM",
    "isRequired": true,
    "orden": 2
  },
  {
    "sourceColumn": "DNI",
    "targetProperty": "dni",
    "transformationType": "TO_NUMBER",
    "isRequired": true,
    "orden": 3
  },
  {
    "sourceColumn": "CORREO ELECTRONICO",
    "targetProperty": "email",
    "transformationType": "LOWERCASE_TRIM",
    "isRequired": true,
    "orden": 4
  },
  {
    "sourceColumn": "TELEFONO",
    "targetProperty": "telefono",
    "transformationType": "NORMALIZE_PHONE",
    "isRequired": true,
    "orden": 5
  },
  {
    "sourceColumn": "ES SOCIO",
    "targetProperty": "esSocio",
    "transformationType": "TO_BOOLEAN",
    "defaultValue": "false",
    "isRequired": false,
    "orden": 6
  }
]
```

## 3. Estrategia de Procesamiento

### Procesamiento en Chunks (Streaming)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        ESTRATEGIA DE CHUNKS PARA ARCHIVOS GRANDES                   │
└────────────────────────────────────────────────────────────────────────────────────┘

  Archivo (100K registros)
         │
         ▼
  ┌─────────────────┐
  │   StreamParser  │  ◄── Lee de forma incremental (no carga todo en memoria)
  └─────────────────┘
         │
         │ yield rows (streaming)
         ▼
  ┌─────────────────┐
  │   ChunkBuffer   │  ◄── Acumula hasta CHUNK_SIZE (ej: 1000 registros)
  │   size: 1000    │
  └─────────────────┘
         │
         │ cuando buffer lleno
         ▼
  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
  │   Transform     │────▶│    Dedupe       │────▶│   Bulk Insert   │
  │   Chunk[1000]   │     │    Chunk        │     │    Batch        │
  └─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │ ◄─────────────────────────────────────────────┘
         │         próximo chunk
         ▼
  ┌─────────────────┐
  │   Resultado     │
  │   Acumulado     │
  └─────────────────┘
```

### Deduplicación en Dos Fases

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           ESTRATEGIA DE DEDUPLICACIÓN                               │
└────────────────────────────────────────────────────────────────────────────────────┘

FASE 1: Deduplicación Interna (dentro del archivo)
─────────────────────────────────────────────────────
  Archivo CSV/XLSX
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Map<string, RawRow>  key = `${matricula}:${fuerzaId}`              │
  │                                                                     │
  │  Si la clave ya existe → guardar en "duplicados internos"           │
  │  Si no existe → agregar al mapa                                     │
  └─────────────────────────────────────────────────────────────────────┘
         │
         ▼
  Registros únicos del archivo


FASE 2: Deduplicación contra Base de Datos
─────────────────────────────────────────────────────
  Registros únicos del archivo
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  SELECT matricula, fuerza_id FROM cliente                           │
  │  WHERE (matricula, fuerza_id) IN (...)                              │
  │                                                                     │
  │  Batch de 500 claves para evitar query muy grande                   │
  └─────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Set<string> existingKeys = resultado de query                      │
  │                                                                     │
  │  Filtrar: registros donde !existingKeys.has(key)                    │
  └─────────────────────────────────────────────────────────────────────┘
         │
         ▼
  Registros nuevos (a insertar)
```

## 4. Manejo de Errores

### Estrategia de Errores Parciales

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                         MANEJO DE ERRORES PARCIALES                                 │
└────────────────────────────────────────────────────────────────────────────────────┘

  Cada registro procesado genera:

  ┌─────────────────────┐
  │   ProcessingResult  │
  ├─────────────────────┤
  │ status: SUCCESS     │  ◄── Registro insertado correctamente
  │       | SKIPPED     │  ◄── Duplicado (interno o DB), no es error
  │       | ERROR       │  ◄── Error de validación o transformación
  │ rowNumber: number   │
  │ originalData: any   │
  │ transformedData?: T │
  │ error?: ErrorDetail │
  └─────────────────────┘

  Resultado Final de Importación:

  ┌─────────────────────────────────────────────────────────────────────┐
  │   ImportResult                                                      │
  ├─────────────────────────────────────────────────────────────────────┤
  │ totalProcessed: number       // Total de filas en archivo           │
  │ successCount: number         // Insertados exitosamente             │
  │ skippedDuplicates: number    // Duplicados (internos + DB)          │
  │ errorCount: number           // Errores de validación               │
  │ errors: ErrorDetail[]        // Detalle de cada error               │
  │ processingTimeMs: number     // Tiempo total                        │
  │ batchId: string              // ID único de la importación          │
  └─────────────────────────────────────────────────────────────────────┘
```

## 5. Tipos de Transformación Soportados

```typescript
enum TransformationType {
  // Strings
  TRIM = 'TRIM',
  UPPERCASE = 'UPPERCASE',
  LOWERCASE = 'LOWERCASE',
  TRIM_UPPERCASE = 'TRIM_UPPERCASE',
  TRIM_LOWERCASE = 'TRIM_LOWERCASE',
  UPPERCASE_FIRST = 'UPPERCASE_FIRST', // "juan perez" → "Juan Perez"

  // Numbers
  TO_NUMBER = 'TO_NUMBER', // "12345" → 12345
  TO_FLOAT = 'TO_FLOAT', // "123.45" → 123.45

  // Booleans
  TO_BOOLEAN = 'TO_BOOLEAN', // "SI"/"NO", "1"/"0", "true"/"false"

  // Dates
  TO_DATE = 'TO_DATE', // Múltiples formatos
  TO_ISO_DATE = 'TO_ISO_DATE',

  // Específicos del dominio
  NORMALIZE_PHONE = 'NORMALIZE_PHONE', // Normaliza teléfonos argentinos
  NORMALIZE_DNI = 'NORMALIZE_DNI', // Remueve puntos, espacios
  NORMALIZE_EMAIL = 'NORMALIZE_EMAIL', // Lowercase + trim
  NORMALIZE_MATRICULA = 'NORMALIZE_MATRICULA', // Formato específico

  // Lookup (buscar ID por nombre)
  LOOKUP_PROVINCIA = 'LOOKUP_PROVINCIA', // "Buenos Aires" → ID
  LOOKUP_FUERZA = 'LOOKUP_FUERZA', // "Policía Federal" → ID
  LOOKUP_REPRESENTANTE = 'LOOKUP_REPRESENTANTE',

  // Sin transformación
  RAW = 'RAW',
}
```

## 6. Endpoints API

```
POST   /api/etl/import-clientes
       Body: multipart/form-data { file, templateId?, autoDetect? }
       Response: ImportResult

POST   /api/etl/validate
       Body: multipart/form-data { file, templateId? }
       Response: ValidationResult (preview sin insertar)

GET    /api/etl/templates
       Response: ImportTemplate[]

POST   /api/etl/templates
       Body: CreateTemplateDto
       Response: ImportTemplate

GET    /api/etl/templates/:id
       Response: ImportTemplate with ColumnMappings

PUT    /api/etl/templates/:id
       Body: UpdateTemplateDto
       Response: ImportTemplate

DELETE /api/etl/templates/:id
       Response: void

POST   /api/etl/templates/:id/mappings
       Body: CreateColumnMappingDto
       Response: ColumnMapping

PUT    /api/etl/mappings/:id
       Body: UpdateColumnMappingDto
       Response: ColumnMapping

DELETE /api/etl/mappings/:id
       Response: void

GET    /api/etl/transformations
       Response: TransformationType[] (lista de transformaciones disponibles)

GET    /api/etl/target-properties
       Response: PropertyInfo[] (propiedades del modelo Cliente)
```
