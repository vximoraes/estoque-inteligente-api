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

// Pool de campos plausíveis para popular `campos_personalizados` — cada
// unidade sorteia 1 a 3, sem repetir chave, só para a tela nascer com dado
// real em vez de um array sempre vazio.
const CAMPOS_PERSONALIZADOS_POOL: Array<{ chave: string; valor: () => string }> = [
  { chave: 'Número de série', valor: () => `SN${Math.floor(Math.random() * 900000) + 100000}` },
  { chave: 'Memória RAM', valor: () => `${[4, 8, 16, 32][Math.floor(Math.random() * 4)]}GB` },
  { chave: 'Nota fiscal', valor: () => `${Math.floor(Math.random() * 90000) + 10000}` },
  { chave: 'Fabricante', valor: () => ['Dell', 'Lenovo', 'HP', 'Ubiquiti', 'TP-Link'][Math.floor(Math.random() * 5)]! },
  { chave: 'Garantia até', valor: () => new Date(Date.now() + Math.floor(Math.random() * 730) * 86400000).toLocaleDateString('pt-BR') },
];

function camposPersonalizadosAleatorios() {
  const quantidade = Math.floor(Math.random() * 3) + 1; // 1 a 3
  const embaralhados = [...CAMPOS_PERSONALIZADOS_POOL].sort(() => Math.random() - 0.5);
  return embaralhados
    .slice(0, quantidade)
    .map(({ chave, valor }) => ({ chave, valor: valor() }));
}

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
        campos_personalizados: camposPersonalizadosAleatorios(),
        ativo: true,
        usuario: adminId,
      });
    }
  }
}
