import mongoose from 'mongoose';
import getGlobalFakeMapping from '../../seeds/globalFakeMapping.js';

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isRefField(key: string, mongooseSchema: mongoose.Schema): boolean {
  const path = mongooseSchema.path(key) as (mongoose.SchemaType & {
    instance?: string;
    caster?: { options?: { ref?: string } };
  }) | null;
  return !!(path && path.instance === 'Array' && path.caster?.options?.ref);
}

export async function generateExample(
  schema: Record<string, unknown>,
  key: string | null = null,
  mongooseSchema: mongoose.Schema | null = null,
): Promise<unknown> {
  if (schema['example'] !== undefined) {
    return schema['example'];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapping = await getGlobalFakeMapping() as Record<string, any>;

  if (key && mapping[key]) {
    const generator = mapping[key];
    return typeof generator === 'function' ? generator() : generator;
  }

  if (key === '_id') {
    return new mongoose.Types.ObjectId().toString();
  }

  if (schema['type'] === 'object' && schema['properties']) {
    const example: Record<string, unknown> = {};
    for (const [propKey, propertySchema] of Object.entries(
      schema['properties'] as Record<string, Record<string, unknown>>,
    )) {
      example[propKey] = await generateExample(propertySchema, propKey, mongooseSchema);
    }
    return example;
  }

  if (schema['type'] === 'array' && schema['items']) {
    if (key && mongooseSchema && isRefField(key, mongooseSchema)) {
      return [
        { _id: new mongoose.Types.ObjectId().toString() },
        { _id: new mongoose.Types.ObjectId().toString() },
      ];
    }
    return [
      await generateExample(schema['items'] as Record<string, unknown>, null, mongooseSchema),
    ];
  }

  if (schema['type'] === 'string') return 'exemplo string';
  if (schema['type'] === 'number' || schema['type'] === 'integer') return 0;
  if (schema['type'] === 'boolean') return true;
  return null;
}
