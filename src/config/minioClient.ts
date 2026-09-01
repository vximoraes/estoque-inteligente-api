import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

const requiredMinioVars = [
  'MINIO_ENDPOINT',
  'MINIO_REGION',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
];

for (const varName of requiredMinioVars) {
  if (!process.env[varName]) {
    throw new Error(
      `Variável de ambiente do MinIO não está definida: ${varName}`,
    );
  }
}

const minioClient = new S3Client({
  endpoint: process.env['MINIO_ENDPOINT'] as string,
  region: process.env['MINIO_REGION'] as string,
  credentials: {
    accessKeyId: process.env['MINIO_ACCESS_KEY'] as string,
    secretAccessKey: process.env['MINIO_SECRET_KEY'] as string,
  },
  forcePathStyle: true,
});

export default minioClient;
