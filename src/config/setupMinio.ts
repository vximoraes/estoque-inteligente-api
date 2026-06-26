import minioClient from './MinIO.js';

function buildPublicReadPolicy(bucketName: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  });
}

async function setupMinio(): Promise<void> {
  const bucketNames = [process.env['MINIO_BUCKET'], process.env['MINIO_BUCKET_2']]
    .filter((b): b is string => Boolean(b))
    .filter((bucket, index, buckets) => buckets.indexOf(bucket) === index);

  if (bucketNames.length === 0) {
    throw new Error('As variáveis de ambiente dos buckets do MinIO não estão definidas.');
  }

  if (!minioClient) {
    throw new Error('A variável de ambiente do cliente do MinIO não está definida.');
  }

  try {
    for (const bucketName of bucketNames) {
      const exists = await minioClient.bucketExists(bucketName);

      if (!exists) {
        await minioClient.makeBucket(bucketName);
        console.info(`Bucket "${bucketName}" criado com sucesso no MinIO.`);
      } else {
        console.info(`Bucket "${bucketName}" já existe no MinIO.`);
      }

      await minioClient.setBucketPolicy(bucketName, buildPublicReadPolicy(bucketName));
      console.info(`Política pública de leitura aplicada ao bucket "${bucketName}".`);
    }
  } catch (erro) {
    const err = erro as Error;
    throw new Error(`Erro ao verificar/criar buckets do MinIO: ${err.message}`);
  }
}

export default setupMinio;
