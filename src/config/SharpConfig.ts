import sharp from 'sharp';

export default async function compress(arquivo: Buffer | string): Promise<Buffer> {
  const novoArquivo = await sharp(arquivo)
    .resize({ width: 1024 })
    .jpeg({ quality: 80 })
    .toBuffer();

  return novoArquivo;
}
