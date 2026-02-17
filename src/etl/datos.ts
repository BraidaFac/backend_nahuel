import { EstadoLead } from 'src/entities';
import { EntityType, TargetProperty } from './interfaces/etl.interfaces';

export const entities: EntityType[] = [
  {
    name: 'lead',
    displayName: 'Leads',
    entityProperties: [
      {
        name: TargetProperty.FULL_NAME,
        displayName: 'Nombre',
        type: 'string',
        isRequired: true,
      },
      {
        name: TargetProperty.EMAIL,
        displayName: 'Email',
        type: 'string',
        isRequired: true,
      },
      {
        name: TargetProperty.TELEFONO,
        displayName: 'Teléfono',
        type: 'string',
        isRequired: true,
      },
      {
        name: TargetProperty.PROVINCIA,
        displayName: 'Provincia',
        type: 'relation',
        isRequired: true,
      },
      {
        name: TargetProperty.REPRESENTANTE,
        displayName: 'Representante',
        type: 'relation',
        isRequired: true,
      },
      {
        name: TargetProperty.FUERZA,
        displayName: 'Fuerza',
        type: 'relation',
        isRequired: true,
      },
      {
        name: TargetProperty.ESTADO,
        displayName: 'Estado',
        type: 'enum',
        isRequired: false,
        options: Object.values(EstadoLead).map((estado: EstadoLead) => ({
          value: estado,
          label: generateLabel(estado.toString()),
        })),
      },
    ],
  },
];

function generateLabel(propertyName: string): string {
  return propertyName
    .replace(/([A-Z])/g, ' $1') // Agrega espacio antes de mayúsculas
    .replace(/^./, (str) => str.toUpperCase()) // Primera letra mayúscula
    .trim();
}
