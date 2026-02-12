import request from 'supertest'
import { describe, it, expect, beforeAll } from '@jest/globals'
import faker from 'faker-br'
import dotenv from 'dotenv'
import '../../routes/grupoRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

describe("Grupos", () =>{
    let tokenAdmin;
    let tokenUser;
    let idGrupo
    beforeAll(async () =>{
        const res = await request(BASE_URL).post('/login').send({email: "admin@admin.com", senha: "Senha@123"})
        tokenAdmin = res.body?.data?.user?.accesstoken
    })
    it('Deve listar os grupos com sucesso sendo administrador e verificar se todos os campos estão sendo informados', async ()=>{
        const res = await request(BASE_URL)
        .get('/grupos')
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200)
        expect(Array.isArray(res.body?.data?.docs)).toBe(true)
        expect(res.body?.data?.docs[0]).toHaveProperty("_id")
        expect(res.body?.data?.docs[0]).toHaveProperty("nome")
        expect(res.body?.data?.docs[0]).toHaveProperty("descricao")
        expect(res.body?.data?.docs[0]).toHaveProperty("ativo")
        expect(res.body?.data?.docs[0]).toHaveProperty("permissoes")
        expect(res.body?.message).toEqual("Requisição bem-sucedida")
        idGrupo = res.body?.data?.docs[0]._id
    });
    it('Deve listar grupo por id', async () =>{
        const res = await request(BASE_URL)
        .get(`/grupos/${idGrupo}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .expect(200)
        expect(res.body?.data?._id).toEqual(idGrupo)
        expect(res.body?.data).toHaveProperty("_id")
        expect(res.body?.data).toHaveProperty("nome")
        expect(res.body?.data).toHaveProperty("descricao")
        expect(res.body?.data).toHaveProperty("ativo")
        expect(res.body?.data).toHaveProperty("permissoes")
        expect(res.body?.message).toEqual("Requisição bem-sucedida")
    });
    it('Deve listar grupos pelo nome, usando Usuario', async () => {
        const res = await request(BASE_URL)
        .get("/grupos")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({nome: "Usuario"})
        .expect(200)
        expect(res.body?.data?.docs[0]).toHaveProperty("nome")
        expect(res.body?.data?.docs[0]).toHaveProperty("_id")
        expect(res.body?.data?.docs[0]).toHaveProperty("ativo")
        expect(res.body?.data?.docs[0]).toHaveProperty("permissoes")
        expect(res.body?.data?.docs[0]).toHaveProperty("descricao")
        expect(res.body?.data?.docs).toHaveLength(1)
        expect(res.body?.data?.docs[0].nome).toEqual("Usuario")
    });
    it('Deve listar grupos pela descricação, usando "Grupo com acesso total a todas as rotas"', async () => {
        const res = await request(BASE_URL)
        .get("/grupos")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({descricao: "Grupo com acesso total a todas as rotas"})
        .expect(200)
        expect(res.body?.data?.docs[0]).toHaveProperty("nome")
        expect(res.body?.data?.docs[0]).toHaveProperty("_id")
        expect(res.body?.data?.docs[0]).toHaveProperty("ativo")
        expect(res.body?.data?.docs[0]).toHaveProperty("permissoes")
        expect(res.body?.data?.docs[0]).toHaveProperty("descricao")
        expect(res.body?.data?.docs[0].descricao).toEqual("Grupo com acesso total a todas as rotas")
        expect(res.body?.data?.docs).toHaveLength(1)
    });
    it('Deve listar grupos pela campo "ativo", usando "true"', async () => {
        const res = await request(BASE_URL)
        .get("/grupos")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .query({ativo: true})
        .expect(200)
        expect(res.body?.data?.docs[0]).toHaveProperty("nome")
        expect(res.body?.data?.docs[0]).toHaveProperty("_id")
        expect(res.body?.data?.docs[0]).toHaveProperty("ativo")
        expect(res.body?.data?.docs[0]).toHaveProperty("permissoes")
        expect(res.body?.data?.docs[0]).toHaveProperty("descricao")
        expect(res.body?.data?.docs[0].ativo).toEqual(true)
    })
    it('Deve falhar ao tentar listar grupos não sendo um administrador', async () =>{
        const login = await logar("vinicius@gmail.com", "Senha@123")
        tokenUser = login.body?.data?.user?.accesstoken
        const res = await request(BASE_URL)
        .get("/grupos")
        .set("Authorization", `Bearer ${tokenUser}`)
        
        expect([403, 498]).toContain(res.status);
    });
})
async function logar(email, senha) {
    const res = await request(BASE_URL)
    .post("/login")
    .send({email: email, senha: senha})
    return res
}