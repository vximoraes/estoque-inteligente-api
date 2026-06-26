declare module 'mongoose-schema-jsonschema' {
  import type mongoose from 'mongoose';
  function mongooseSchemaJsonSchema(mongoose: typeof import('mongoose')): void;
  export = mongooseSchemaJsonSchema;
}

declare module 'mongoose' {
  interface Schema {
    jsonSchema(): Record<string, unknown>;
  }
}
