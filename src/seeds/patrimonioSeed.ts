import Patrimonio from '../modules/patrimonio/PatrimonioModel.js';
import Categoria from '../modules/categoria/CategoriaModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';
import { fakeMappings } from './globalFakeMapping.js';

// Maioria disponível, algumas emprestadas/em manutenção, raramente baixada
// — dá pra ver os 4 status no relatório e no drawer de unidades sem forçar
// distribuição artificial (equiprovável esconderia o caso comum).
const STATUS_POOL: Array<
  'Disponível' | 'Emprestado' | 'Manutenção' | 'Baixado'
> = [
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
// real em vez de um array sempre vazio. `Fabricante`/`Modelo` já são campos
// próprios do Patrimonio, então não entram aqui de novo.
const CAMPOS_PERSONALIZADOS_POOL: Array<{
  chave: string;
  valor: () => string;
}> = [
  {
    chave: 'Número de série',
    valor: () => `SN${Math.floor(Math.random() * 900000) + 100000}`,
  },
  {
    chave: 'Memória RAM',
    valor: () => `${[4, 8, 16, 32][Math.floor(Math.random() * 4)]}GB`,
  },
  {
    chave: 'Nota fiscal',
    valor: () => `${Math.floor(Math.random() * 90000) + 10000}`,
  },
  {
    chave: 'Garantia até',
    valor: () =>
      new Date(
        Date.now() + Math.floor(Math.random() * 730) * 86400000,
      ).toLocaleDateString('pt-BR'),
  },
];

function camposPersonalizadosAleatorios() {
  const quantidade = Math.floor(Math.random() * 3) + 1; // 1 a 3
  const embaralhados = [...CAMPOS_PERSONALIZADOS_POOL].sort(
    () => Math.random() - 0.5,
  );
  return embaralhados
    .slice(0, quantidade)
    .map(({ chave, valor }) => ({ chave, valor: valor() }));
}

// Prefixo de 3 letras pro numero_patrimonio (`numero_patrimonio` tem \u00edndice
// \u00fanico entre unidades ativas). Usar s\u00f3 as 3 primeiras letras da primeira
// palavra colide f\u00e1cil ("Notebook Dell..." e "Notebook Lenovo..." dariam os
// dois "NOT") \u2014 por isso pega 2 letras da primeira palavra + 1 da segunda.
function prefixoDoNome(nome: string) {
  const palavras = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(' ')
    .filter(Boolean);
  const [primeira, segunda] = palavras;

  if (!segunda) return primeira!.slice(0, 3).toUpperCase();

  return `${primeira!.slice(0, 2)}${segunda[0]}`.toUpperCase();
}

export default async function patrimonioSeed(adminId: string) {
  const categoriasPermanentes = await Categoria.find({ tipo: 'permanente' });
  const localizacaoList = await Localizacao.find({});

  await Patrimonio.deleteMany({});

  for (const {
    nome: modelo,
    categoria: categoriaNome,
    fabricante,
  } of fakeMappings.Item.nomesPermanentes) {
    const prefixo = prefixoDoNome(modelo);
    const numUnidades = Math.floor(Math.random() * 4) + 2; // 2 a 5 unidades
    const categoria = categoriasPermanentes.find(
      (c) => c.nome === categoriaNome,
    )!;

    for (let i = 1; i <= numUnidades; i++) {
      const localizacaoRandom =
        localizacaoList[Math.floor(Math.random() * localizacaoList.length)]!;
      const status =
        STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)]!;

      await Patrimonio.create({
        modelo,
        fabricante,
        categoria: categoria._id,
        numero_patrimonio: `${prefixo}-${String(i).padStart(4, '0')}`,
        localizacao: localizacaoRandom._id,
        status,
        data_aquisicao: new Date(
          Date.now() - Math.floor(Math.random() * 365) * 86400000,
        ),
        campos_personalizados: camposPersonalizadosAleatorios(),
        observacoes: fakeMappings.Patrimonio.observacoes(),
        ativo: true,
        usuario: adminId,
      });
    }
  }
}
