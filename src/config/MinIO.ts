import * as Minio from 'minio';
import 'dotenv/config';

const requiredMinioVars = [
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
];

for (const varName of requiredMinioVars) {
  if (!process.env[varName]) {
    throw new Error(`Variável de ambiente do MinIO não está definida: ${varName}`);
  }
}

const minioClient = new Minio.Client({
  endPoint: process.env['MINIO_ENDPOINT'] as string,
  port: parseInt(process.env['MINIO_PORT'] as string, 10),
  useSSL: process.env['MINIO_USE_SSL'] === 'true',
  accessKey: process.env['MINIO_ACCESS_KEY'] as string,
  secretKey: process.env['MINIO_SECRET_KEY'] as string,
});

export default minioClient;
