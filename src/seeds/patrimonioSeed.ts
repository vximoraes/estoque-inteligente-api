import Patrimonio from '../modules/patrimonio/PatrimonioModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';

// Maioria disponível, algumas emprestadas/em manutenção, raramente baixada
// — dá pra ver os 4 status no relatório e no drawer de unidades sem forçar
// distribuição artificial (equiprovável esconderia o caso comum).
const STATUS_POOL: Array<'Disponível' | 'Emprestado' | 'Manutenção' | 'Baixado'> = [
  'Disponível',
  'Disponível',
  'Disponível',
  'Disponível',
  'Emprestado',
  'Emprestado',
  'Manutenção',
  'Baixado',
];

function prefixoDoNome(nome: string) {
  return nome
    .split(' ')[0]!
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 3)
    .toUpperCase();
}

export default async function patrimonioSeed(adminId: string) {
  const itensPermanentes = await Item.find({ tipo: 'permanente' });
  const localizacaoList = await Localizacao.find({});

  await Patrimonio.deleteMany({});

  for (const item of itensPermanentes) {
    const prefixo = prefixoDoNome(item.nome);
    const numUnidades = Math.floor(Math.random() * 4) + 2; // 2 a 5 unidades

    for (let i = 1; i <= numUnidades; i++) {
      const localizacaoRandom =
        localizacaoList[Math.floor(Math.random() * localizacaoList.length)]!;
      const status =
        STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)]!;

      await Patrimonio.create({
        item: item._id,
        numero_patrimonio: `${prefixo}-${String(i).padStart(4, '0')}`,
        localizacao: localizacaoRandom._id,
        status,
        data_aquisicao: new Date(
          Date.now() - Math.floor(Math.random() * 365) * 86400000,
        ),
        ativo: true,
        usuario: adminId,
      });
    }
  }
}
