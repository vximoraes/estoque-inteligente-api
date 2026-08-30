export function urlPublicaUsuario(id: string): string {
  return `${process.env['MINIO_PUBLIC_URL']}/${id}.jpeg`;
}

export function urlPublicaItem(id: string): string {
  return `${process.env['MINIO_PUBLIC_URL_2']}/${id}.jpeg`;
}

export function urlPublicaPatrimonio(id: string): string {
  return `${process.env['MINIO_PUBLIC_URL_3']}/${id}.jpeg`;
}
