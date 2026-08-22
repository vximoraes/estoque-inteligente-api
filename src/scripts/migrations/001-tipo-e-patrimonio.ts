import mongoose from 'mongoose';
import DbConnect from '../../config/DbConnect.js';
import { initAuth } from '../../config/auth.js';
import ItemModel from '../../modules/item/ItemModel.js';
import RotaModel from '../../modules/rota/RotaModel.js';
import GrupoModel from '../../modules/grupo/GrupoModel.js';

// Migração idempotente para bases já existentes, criada junto com a
// separação patrimônio/almoxarifado. NUNCA usa deleteMany — ao contrário
// dos scripts em src/seeds/, este roda sobre dados reais.
//
// Passos:
//   1. Backfill de `Item.tipo` — o `default` do Mongoose não retro-preenche
//      documentos já gravados antes do campo existir; sem isso,
//      `Item.find({ tipo: 'consumo' })` não acha itens antigos.
//   2. Backfill de `Item.quantidade_disponivel` a partir de `quantidade`.
//   3. Libera as rotas `patrimonios`/`patrimonios:id` — rodar `rotasSeed`
//      seria destrutivo numa base existente (ele faz `deleteMany`).
//   4. Concede a permissão nova a todo Grupo que ainda não a tem, com
//      acesso completo (mesmo padrão que os demais recursos não
//      administrativos recebem em `grupoSeed.ts`). Se algum grupo
//      custom precisar de acesso mais restrito a patrimônio, ajuste depois
//      manualmente — este script só garante que ninguém fique bloqueado
//      por engano (403 silencioso) na primeira chamada a /patrimonios.
async function migrar() {
  await DbConnect.conectar();
  initAuth();

  const tipoResult = await ItemModel.updateMany(
    { tipo: { $exists: false } },
    { $set: { tipo: 'consumo' } },
  );
  console.log(
    `[migração 001] Item.tipo preenchido em ${tipoResult.modifiedCount} documento(s).`,
  );

  const quantidadeDisponivelResult = await ItemModel.updateMany(
    { quantidade_disponivel: { $exists: false } },
    [{ $set: { quantidade_disponivel: '$quantidade' } }],
  );
  console.log(
    `[migração 001] Item.quantidade_disponivel preenchido em ${quantidadeDisponivelResult.modifiedCount} documento(s).`,
  );

  const rotasParaCriar = ['patrimonios', 'patrimonios:id'];
  let rotasCriadas = 0;
  for (const rota of rotasParaCriar) {
    const existente = await RotaModel.findOne({ rota });
    if (!existente) {
      await RotaModel.create({
        rota,
        ativo: true,
        buscar: true,
        enviar: true,
        substituir: true,
        modificar: true,
        excluir: true,
      });
      rotasCriadas += 1;
    }
  }
  console.log(`[migração 001] ${rotasCriadas} rota(s) nova(s) criada(s).`);

  const grupos = await GrupoModel.find();
  let gruposAtualizados = 0;
  for (const grupo of grupos) {
    const jaTemPermissao = grupo.permissoes.some(
      (permissao) => permissao.rota === 'patrimonios',
    );
    if (!jaTemPermissao) {
      await GrupoModel.updateOne(
        { _id: grupo._id },
        {
          $push: {
            permissoes: {
              rota: 'patrimonios',
              ativo: true,
              buscar: true,
              enviar: true,
              substituir: true,
              modificar: true,
              excluir: true,
            },
          },
        },
      );
      gruposAtualizados += 1;
    }
  }
  console.log(
    `[migração 001] Permissão 'patrimonios' concedida a ${gruposAtualizados} grupo(s). Revise manualmente se algum grupo deveria ter acesso mais restrito.`,
  );
}

migrar()
  .then(() => {
    console.log('[migração 001] Concluída com sucesso.');
    return mongoose.connection.close();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[migração 001] Falhou:', error);
    return mongoose.connection.close().finally(() => process.exit(1));
  });
