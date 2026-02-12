import Usuario from "../models/Usuario.js";
import { fakeMappings } from "./globalFakeMapping.js";
import bcrypt from 'bcrypt';
import seedRotas from "./rotasSeed.js";
import seedGrupos from "./grupoSeed.js";

export default async function usuarioSeed() {
    await Usuario.deleteMany({});

    const rotasCompletas = await seedRotas();
    
    const grupos = await seedGrupos(rotasCompletas);

    const grupoUsuario = grupos.find((g) => g.nome === "Usuario");

    const usuarios = []

    for (let i = 0; i < 10; i++) {
        const senhaGerada = fakeMappings.Usuario.senha.apply();
        const senhaCriptografada = await bcrypt.hash(senhaGerada, 10);

        const usuario = {
            nome: fakeMappings.Usuario.nome.apply(),
            email: fakeMappings.Usuario.email.apply(),
            senha: senhaCriptografada,
            permissoes: grupoUsuario?.permissoes || [],
            grupos: grupoUsuario ? [grupoUsuario._id] : [],
            ativo: fakeMappings.Usuario.ativo.apply()
        };

        usuarios.push(usuario);
    }

    const admin = {
        nome: process.env.ADMIN_NAME || "Administrador",
        email: process.env.ADMIN_EMAIL || "admin@admin.com",
        senha: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Senha@123', 10),
        ativo: true,
        permissoes: rotasCompletas.map(r => r.toObject()),
        grupos: grupos[0],
    };

    usuarios.push(admin);

    const result = await Usuario.collection.insertMany(usuarios);
    
    // Buscar o admin criado para retornar seu ID
    const adminCriado = await Usuario.findOne({ email: process.env.ADMIN_EMAIL || "admin@admin.com" });
    
    return {
        adminId: adminCriado._id,
        usuarios: result
    };
}
