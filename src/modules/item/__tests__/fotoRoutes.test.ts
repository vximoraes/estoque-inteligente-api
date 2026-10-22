import {
  ID_INEXISTENTE,
  req,
  logarAdmin,
  logarUsuarioPadrao,
  criarItem,
  criarPatrimonio,
  convidarUsuario,
  esperarEnvelopeSucesso,
  esperarEnvelopeErro,
} from '../../../../test/helpers/rotasTestHelper.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
);

describe('Upload e remoção de foto', () => {
  let token;

  function enviarFoto(
    caminho: string,
    arquivo = PNG,
    nome = 'foto.png',
    metodo: 'post' | 'put' = 'post',
  ) {
    return req(token)[metodo](caminho).attach('file', arquivo, nome);
  }

  beforeAll(async () => {
    token = await logarAdmin();
  });

  const recursos = [
    {
      nome: 'item',
      rota: '/itens',
      campo: 'imagem',
      metodo: 'post' as const,
      criar: () => criarItem(token),
    },
    {
      nome: 'patrimônio',
      rota: '/patrimonios',
      campo: 'imagem',
      metodo: 'post' as const,
      criar: () => criarPatrimonio(token),
    },
    {
      nome: 'usuário',
      rota: '/usuarios',
      campo: 'fotoPerfil',
      metodo: 'put' as const,
      criar: () => convidarUsuario(token),
    },
  ];

  describe.each(recursos)('$nome', ({ rota, campo, metodo, criar }) => {
    it('envia a foto, grava o endereço e remove', async () => {
      const registro = await criar();

      const envio = await enviarFoto(
        `${rota}/${registro._id}/foto`,
        PNG,
        'foto.png',
        metodo,
      );
      esperarEnvelopeSucesso(envio, 201);
      expect(envio.body.data[campo]).toContain(String(registro._id));

      const consulta = await req(token).get(`${rota}/${registro._id}`);
      expect(consulta.body.data[campo]).toBe(envio.body.data[campo]);

      const remocao = await req(token).delete(`${rota}/${registro._id}/foto`);
      esperarEnvelopeSucesso(remocao, 200);
      expect(remocao.body.data[campo]).toBe('');
    });

    it('recusa arquivo que não é JPEG nem PNG', async () => {
      const registro = await criar();
      esperarEnvelopeErro(
        await enviarFoto(
          `${rota}/${registro._id}/foto`,
          Buffer.from('GIF89a'),
          'foto.gif',
          metodo,
        ),
        400,
      );
    });

    it('recusa envio sem arquivo', async () => {
      const registro = await criar();
      esperarEnvelopeErro(
        await req(token)[metodo](`${rota}/${registro._id}/foto`),
        400,
      );
    });

    it('responde 404 para registro inexistente', async () => {
      expect(
        (
          await enviarFoto(
            `${rota}/${ID_INEXISTENTE}/foto`,
            PNG,
            'foto.png',
            metodo,
          )
        ).status,
      ).toBe(404);
      expect(
        (await req(token).delete(`${rota}/${ID_INEXISTENTE}/foto`)).status,
      ).toBe(404);
    });
  });

  it('recusa arquivo acima de 5 MB', async () => {
    const item = await criarItem(token);
    const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await enviarFoto(`/itens/${item._id}/foto`, grande);
    expect([400, 413]).toContain(res.status);
    expect(res.body.error).toBe(true);
  });

  it('usuário sem permissão de usuários não troca a foto de outro', async () => {
    const tokenPadrao = await logarUsuarioPadrao();
    const outro = await convidarUsuario(token);
    expect(
      (
        await req(tokenPadrao)
          .put(`/usuarios/${outro._id}/foto`)
          .attach('file', PNG, 'foto.png')
      ).status,
    ).toBe(403);
  });
});
