import HttpStatusCodes from '../../utils/helpers/HttpStatusCodes.js';

type SwaggerResponse = (schemaRef?: string | null, description?: string) => Record<string, unknown>;

const swaggerCommonResponses: Record<number, SwaggerResponse> = {};

Object.keys(HttpStatusCodes).forEach((statusKey) => {
  const entry = (HttpStatusCodes as unknown as Record<string, { code: number; message: string }>)[statusKey];
  if (!entry) return;
  const { code, message } = entry;

  swaggerCommonResponses[code] = (schemaRef: string | null = null, description = message) => ({
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: schemaRef
              ? { $ref: schemaRef }
              : { type: 'array', items: {}, example: [] },
            message: { type: 'string', example: message },
            errors: {
              type: 'array',
              example: code >= 400 ? [{ message }] : [],
            },
          },
        },
      },
    },
  });
});

export default swaggerCommonResponses;
