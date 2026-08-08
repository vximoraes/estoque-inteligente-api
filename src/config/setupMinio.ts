import {
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
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

async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    await minioClient.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (erro) {
    const err = erro as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw erro;
  }
}

async function setupMinio(): Promise<void> {
  if (process.env['MINIO_GERENCIAR_BUCKETS'] === 'false') {
    console.info(
      'MINIO_GERENCIAR_BUCKETS=false: pulando criação/política de buckets (gerenciados fora da aplicação).',
    );
    return;
  }

  const bucketNames = [
    process.env['MINIO_BUCKET'],
    process.env['MINIO_BUCKET_2'],
  ]
    .filter((b): b is string => Boolean(b))
    .filter((bucket, index, buckets) => buckets.indexOf(bucket) === index);

  if (bucketNames.length === 0) {
    throw new Error(
      'As variáveis de ambiente dos buckets do MinIO não estão definidas.',
    );
  }

  try {
    for (const bucketName of bucketNames) {
      const exists = await bucketExists(bucketName);

      if (!exists) {
        await minioClient.send(
          new CreateBucketCommand({ Bucket: bucketName }),
        );
        console.info(`Bucket "${bucketName}" criado com sucesso no MinIO.`);
      } else {
        console.info(`Bucket "${bucketName}" já existe no MinIO.`);
      }

      await minioClient.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: buildPublicReadPolicy(bucketName),
        }),
      );
      console.info(
        `Política pública de leitura aplicada ao bucket "${bucketName}".`,
      );
    }
  } catch (erro) {
    const err = erro as {
      name?: string;
      message?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const detalhe =
      err.message || err.Code || err.name || JSON.stringify(err);
    throw new Error(
      `Erro ao verificar/criar buckets do MinIO: ${detalhe} (status ${err.$metadata?.httpStatusCode ?? '?'})`,
    );
  }
}

export default setupMinio;
