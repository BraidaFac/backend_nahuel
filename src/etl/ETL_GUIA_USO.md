# Guía de Uso del Módulo ETL

## Índice

1. [Instalación de Dependencias](#instalación-de-dependencias)
2. [Configuración Inicial](#configuración-inicial)
3. [Uso de la API](#uso-de-la-api)
4. [Configuración de Templates](#configuración-de-templates)
5. [Estrategias de Optimización](#estrategias-de-optimización)
6. [Manejo de Edge Cases](#manejo-de-edge-cases)
7. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## 1. Instalación de Dependencias

Ejecutar en el directorio del backend:

```bash
npm install papaparse exceljs uuid
npm install -D @types/papaparse @types/uuid
```

### Dependencias utilizadas:

| Paquete     | Versión | Propósito                             |
| ----------- | ------- | ------------------------------------- |
| `papaparse` | ^5.x    | Parsing de CSV con streaming          |
| `exceljs`   | ^4.x    | Parsing de XLSX con streaming         |
| `uuid`      | ^9.x    | Generación de IDs únicos para batches |

---

## 2. Configuración Inicial

### 2.1 Ejecutar Migraciones

Después de agregar las entidades, generar y ejecutar la migración:

```bash
npm run migration:create
npm run migration:up
```

### 2.2 Verificar Tablas Creadas

Las siguientes tablas deben existir:

- `import_template` - Templates de importación
- `column_mapping` - Mapeos de columnas
- `import_batch` - Historial de importaciones

---

## 3. Uso de la API

### 3.1 Endpoints Disponibles

#### Importación

```
POST /api/etl/import-clientes
Content-Type: multipart/form-data

Body:
- file: archivo CSV/XLSX
- templateId?: number (opcional)
- autoDetectTemplate?: boolean (default: true)
- dryRun?: boolean (default: false)
- batchSize?: number (default: 1000)
- provinciaId?: number (override)
- fuerzaId?: number (override)
- useStreaming?: boolean (para archivos grandes)
```

#### Validación (Preview)

```
POST /api/etl/validate
Content-Type: multipart/form-data

Body:
- file: archivo CSV/XLSX
- templateId?: number
- provinciaId?: number
- fuerzaId?: number
```

#### Templates

```
GET    /api/etl/templates           - Listar templates
GET    /api/etl/templates/:id       - Obtener template
POST   /api/etl/templates           - Crear template
PUT    /api/etl/templates/:id       - Actualizar template
DELETE /api/etl/templates/:id       - Eliminar template
```

#### Mapeos de Columnas

```
POST   /api/etl/templates/:id/mappings  - Agregar mapeo
PUT    /api/etl/mappings/:id            - Actualizar mapeo
DELETE /api/etl/mappings/:id            - Eliminar mapeo
```

#### Metadata

```
GET /api/etl/transformations      - Tipos de transformación disponibles
GET /api/etl/target-properties    - Propiedades destino del modelo Cliente
GET /api/etl/supported-formats    - Formatos de archivo soportados
```

### 3.2 Ejemplo de Respuesta de Importación

```json
{
  "success": true,
  "message": "Importación completada exitosamente",
  "data": {
    "batchId": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "clientes_buenos_aires.xlsx",
    "totalProcessed": 5000,
    "successCount": 4850,
    "skippedDuplicates": {
      "internal": 50,
      "database": 80
    },
    "errorCount": 20,
    "errors": [
      {
        "rowNumber": 125,
        "field": "email",
        "value": "email-invalido",
        "message": "Email con formato inválido",
        "code": "VALIDATION_FAILED"
      }
    ],
    "skipped": [
      {
        "rowNumber": 45,
        "reason": "DATABASE_DUPLICATE",
        "key": "ABC123:1"
      }
    ],
    "processingTimeMs": 12500,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": "2024-01-15T10:30:12.500Z"
  }
}
```

---

## 4. Configuración de Templates

### 4.1 Crear un Template

```bash
curl -X POST http://localhost:3000/api/etl/templates \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Template Buenos Aires - Policía Federal",
    "descripcion": "Para archivos de la policía federal de Buenos Aires",
    "fileType": "xlsx",
    "provinciaId": 1,
    "fuerzaId": 2,
    "sheetName": "Listado",
    "headerRow": 1,
    "dataStartRow": 2
  }'
```

### 4.2 Agregar Mapeos de Columnas

```bash
# Mapeo para nombre completo
curl -X POST http://localhost:3000/api/etl/templates/1/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "sourceColumn": "NOMBRE COMPLETO",
    "targetProperty": "fullName",
    "transformationType": "TITLE_CASE",
    "isRequired": true,
    "orden": 1
  }'

# Mapeo para DNI
curl -X POST http://localhost:3000/api/etl/templates/1/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "sourceColumn": "DNI",
    "targetProperty": "dni",
    "transformationType": "NORMALIZE_DNI",
    "isRequired": true,
    "orden": 2
  }'

# Mapeo para email
curl -X POST http://localhost:3000/api/etl/templates/1/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "sourceColumn": "CORREO ELECTRONICO",
    "targetProperty": "email",
    "transformationType": "NORMALIZE_EMAIL",
    "isRequired": true,
    "orden": 3
  }'

# Mapeo para teléfono
curl -X POST http://localhost:3000/api/etl/templates/1/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "sourceColumn": "TELEFONO",
    "targetProperty": "telefono",
    "transformationType": "NORMALIZE_PHONE",
    "isRequired": true,
    "orden": 4
  }'

# Mapeo para matrícula
curl -X POST http://localhost:3000/api/etl/templates/1/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "sourceColumn": "MATRICULA",
    "targetProperty": "matricula",
    "transformationType": "NORMALIZE_MATRICULA",
    "isRequired": false,
    "orden": 5
  }'

# Mapeo para fuerza (usando lookup por nombre)
curl -X POST http://localhost:3000/api/etl/templates/1/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "sourceColumn": "FUERZA",
    "targetProperty": "fuerzaId",
    "transformationType": "LOOKUP_FUERZA",
    "isRequired": true,
    "orden": 6
  }'
```

### 4.3 Tipos de Transformación Disponibles

| Tipo               | Descripción          | Ejemplo                               |
| ------------------ | -------------------- | ------------------------------------- |
| `RAW`              | Sin transformación   | " Texto " → " Texto "                 |
| `TRIM`             | Elimina espacios     | " Texto " → "Texto"                   |
| `UPPERCASE`        | Mayúsculas           | "texto" → "TEXTO"                     |
| `LOWERCASE`        | Minúsculas           | "TEXTO" → "texto"                     |
| `TITLE_CASE`       | Capitalizar palabras | "juan perez" → "Juan Perez"           |
| `TO_INTEGER`       | Convertir a entero   | "12.345" → 12345                      |
| `TO_BOOLEAN`       | Convertir a booleano | "SI" → true                           |
| `NORMALIZE_PHONE`  | Normalizar teléfono  | "011-1234-5678" → "1112345678"        |
| `NORMALIZE_DNI`    | Normalizar DNI       | "12.345.678" → 12345678               |
| `NORMALIZE_EMAIL`  | Normalizar email     | " EMAIL@Test.COM " → "email@test.com" |
| `LOOKUP_FUERZA`    | Buscar ID por nombre | "Policía Federal" → 2                 |
| `LOOKUP_PROVINCIA` | Buscar ID por nombre | "Buenos Aires" → 1                    |

---

## 5. Estrategias de Optimización

### 5.1 Para Archivos Grandes (> 10,000 filas)

```bash
# Usar modo streaming
curl -X POST http://localhost:3000/api/etl/import-clientes \
  -F "file=@archivo_grande.xlsx" \
  -F "useStreaming=true" \
  -F "batchSize=500"
```

**Recomendaciones:**

- Usar `useStreaming=true` para archivos > 50MB
- Reducir `batchSize` a 500 si hay muchos errores
- Aumentar `batchSize` a 2000 si hay pocos errores

### 5.2 Configuración de Memoria

Para archivos muy grandes, ajustar Node.js:

```bash
# En package.json
"scripts": {
  "start:prod": "node --max-old-space-size=4096 dist/main"
}
```

### 5.3 Índices de Base de Datos Recomendados

```sql
-- Índice compuesto para deduplicación
CREATE INDEX idx_cliente_matricula_fuerza
ON cliente (matricula, fuerza_id);

-- Índice para búsqueda por DNI
CREATE INDEX idx_cliente_dni ON cliente (dni);

-- Índice para búsqueda por teléfono
CREATE INDEX idx_cliente_telefono ON cliente (telefono);
```

---

## 6. Manejo de Edge Cases

### 6.1 Columnas con Nombres Variables

Si las columnas tienen nombres inconsistentes entre archivos:

```json
{
  "sourceColumn": "NOMBRE",
  "sourceColumnIndex": 0,
  "targetProperty": "fullName"
}
```

El sistema intentará primero por nombre, luego por índice.

### 6.2 Valores Vacíos

```json
{
  "sourceColumn": "ES_SOCIO",
  "targetProperty": "esSocio",
  "transformationType": "TO_BOOLEAN",
  "defaultValue": "false",
  "isRequired": false
}
```

### 6.3 Formatos de Fecha

El sistema detecta automáticamente:

- `DD/MM/YYYY`
- `DD-MM-YYYY`
- `YYYY-MM-DD`
- `YYYY/MM/DD`
- ISO 8601

### 6.4 Teléfonos con Formatos Diversos

El normalizador de teléfonos maneja:

- `+54 11 1234-5678` → `1112345678`
- `011-1234-5678` → `1112345678`
- `15 1234 5678` → `1512345678`

### 6.5 DNI con Puntos

```
12.345.678 → 12345678
12 345 678 → 12345678
```

### 6.6 Duplicados Parciales

El sistema detecta duplicados por:

1. **Matrícula + Fuerza** (constraint principal)
2. **DNI** (constraint único)
3. **Teléfono** (constraint único)

Si un registro tiene matrícula única pero DNI duplicado, se reporta como error, no como duplicado.

### 6.7 Errores de Codificación

Para archivos con encoding especial:

```json
{
  "encoding": "latin1"
}
```

Encodings soportados: `utf-8`, `latin1`, `ascii`, `utf16le`

---

## 7. Ejemplos Prácticos

### 7.1 Importación Simple (Sin Template)

El sistema usa mapeo por defecto si las columnas tienen nombres estándar:

| Columna en archivo      | Propiedad destino |
| ----------------------- | ----------------- |
| NOMBRE_COMPLETO, NOMBRE | fullName          |
| EMAIL, CORREO           | email             |
| TELEFONO                | telefono          |
| DNI                     | dni               |
| MATRICULA               | matricula         |
| ES_SOCIO                | esSocio           |
| FUERZA, FUERZA_ID       | fuerzaId          |
| PROVINCIA               | provinciaId       |

```bash
curl -X POST http://localhost:3000/api/etl/import-clientes \
  -F "file=@clientes.csv"
```

### 7.2 Importación con Override de Fuerza

Para importar todos los registros asignándoles la misma fuerza:

```bash
curl -X POST http://localhost:3000/api/etl/import-clientes \
  -F "file=@clientes.csv" \
  -F "fuerzaId=1"
```

### 7.3 Validación Previa (Dry Run)

```bash
curl -X POST http://localhost:3000/api/etl/import-clientes \
  -F "file=@clientes.csv" \
  -F "dryRun=true"
```

Esto procesa todo pero no inserta nada. Útil para verificar antes de importar.

### 7.4 Archivo CSV de Ejemplo

```csv
NOMBRE_COMPLETO,DNI,EMAIL,TELEFONO,MATRICULA,FUERZA,ES_SOCIO
Juan Pérez,12345678,juan@email.com,1112345678,ABC123,Policía Federal,SI
María García,23456789,maria@email.com,1123456789,DEF456,Policía Federal,NO
```

### 7.5 Manejo de Respuesta con Errores

```javascript
const response = await importClientes(file, options);

if (response.data.errorCount > 0) {
  console.log('Errores encontrados:');
  response.data.errors.forEach((error) => {
    console.log(`Fila ${error.rowNumber}: ${error.message}`);
  });
}

if (response.data.skippedDuplicates.database > 0) {
  console.log(
    `${response.data.skippedDuplicates.database} duplicados ya existían en BD`,
  );
}

console.log(
  `Importados: ${response.data.successCount} de ${response.data.totalProcessed}`,
);
```

---

## Troubleshooting

### Error: "Template not found"

- Verificar que el templateId existe y está activo

### Error: "Lookup not found"

- Verificar que la provincia/fuerza existe en la BD
- Verificar que el nombre coincide (case insensitive)

### Error: "Duplicate entry"

- El registro ya existe en la base de datos
- Verificar constraints únicos (DNI, teléfono, matrícula+fuerza)

### Proceso muy lento

- Usar `useStreaming=true`
- Reducir `batchSize`
- Verificar índices de BD

### Memoria insuficiente

- Usar modo streaming
- Aumentar memoria de Node.js
- Dividir archivo en partes menores
