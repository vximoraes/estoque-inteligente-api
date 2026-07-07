import mongoose from 'mongoose';
import Usuario from '../modules/usuario/UsuarioModel.js';
import { fakeMappings } from './globalFakeMapping.js';
import { getAuth } from '../config/auth.js';
import seedRotas from './rotasSeed.js';
import seedGrupos from './grupoSeed.js';

export default async function usuarioSeed() {
  await Usuario.deleteMany({});
  const db = mongoose.connection.db!;
  await db.collection('account').deleteMany({});
  await db.collection('session').deleteMany({});
  await db.collection('verification').deleteMany({});

  const rotasCompletas = await seedRotas();
  const grupos = await seedGrupos(rotasCompletas);
  const grupoUsuario = grupos.find((g) => g.nome === 'Usuario');

  const auth = getAuth();

  for (let i = 0; i < 10; i++) {
    const nome = fakeMappings.Usuario.nome();
    const email = fakeMappings.Usuario.email();
    const senha = fakeMappings.Usuario.senha();

    const { user } = await auth.api.signUpEmail({
      body: { email, name: nome, password: senha },
    });

    await Usuario.findByIdAndUpdate(user.id, {
      ativo: fakeMappings.Usuario.ativo(),
      permissoes: grupoUsuario?.permissoes || [],
      grupos: grupoUsuario ? [grupoUsuario._id] : [],
    });
  }

  const adminNome = process.env['ADMIN_NAME'] ?? 'Administrador';
  const adminEmail = process.env['ADMIN_EMAIL'] ?? 'admin@admin.com';
  const adminSenha = process.env['ADMIN_PASSWORD'] ?? 'Senha@123';

  const { user: adminUser } = await auth.api.signUpEmail({
    body: { email: adminEmail, name: adminNome, password: adminSenha },
  });

  await Usuario.findByIdAndUpdate(adminUser.id, {
    ativo: true,
    permissoes: rotasCompletas.map((r) => r.toObject()),
    grupos: grupos[0] ? [grupos[0]._id] : [],
  });

  return { adminId: adminUser.id };
}
