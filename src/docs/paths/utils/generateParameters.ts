interface SchemaProperty {
  type?: string;
  format?: string;
  example?: unknown;
  description?: string;
  properties?: Record<string, SchemaProperty>;
}

interface Schema {
  properties?: Record<string, SchemaProperty>;
}

export function generateParameters(
  schema: Schema,
  _baseRef = '',
  parentKey = '',
): Record<string, unknown>[] {
  const params: Record<string, unknown>[] = [];
  const properties = schema.properties ?? {};

  for (const [key, value] of Object.entries(properties)) {
    if (!value) continue;

    const paramName = parentKey ? `${parentKey}.${key}` : key;

    if (value.type === 'object' && value.properties) {
      params.push(...generateParameters(value as Schema, _baseRef, paramName));
    } else {
      params.push({
        name: paramName,
        in: 'query',
        required: false,
        schema: {
          type: value.type ?? 'string',
          format: value.format ?? undefined,
          example: value.example ?? undefined,
        },
        description: value.description ?? `Filtro por ${paramName}`,
      });
    }
  }
  return params;
}
