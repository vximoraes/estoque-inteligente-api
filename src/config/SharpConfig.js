import sharp from "sharp";

export default async function compress(arquivo){
    let novoArquivo = await sharp(arquivo)
            .resize({ width: 1024 }) // reduz largura, mantém proporção
            .jpeg({ quality: 80, compressionLevel: 9})  // reduz qualidade
            .toBuffer();
    

    return novoArquivo;
}