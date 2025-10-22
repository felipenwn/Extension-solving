import express from "express";
import { db } from './db.js';
import cors from "cors";
import multer from 'multer';
import fs from 'fs';
import https from 'https';
import axios from 'axios';
import cookieParser from "cookie-parser";
import qs from 'qs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
const app = express();

const PORT = 5500;
const allowedOrigins = [
  'https://127.0.0.1:5500', 'http://127.0.0.1:5500', '127.0.0.1:5500',
  'http://127.0.0.1:3001', 'https://127.0.0.1:3001', 'http://127.0.0.1:3000', 'https://127.0.0.1:3000',
];
const allowedUserRoles = "docente estagiario";
const options = { key: fs.readFileSync('./cert/key.pem'), cert: fs.readFileSync('./cert/cert.pem') };

app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    fs.mkdir(uploadDir, { recursive: true }, (err) => cb(err, uploadDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

const checkSuapAuth = async (req, res, next) => {
    const token = req.cookies.SUAP_token;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
    try {
        const suapRes = await axios.get('https://suap.ifsul.edu.br/api/rh/meus-dados/', { headers: { Authorization: 'Bearer ' + token } });
        if (!allowedUserRoles.includes(suapRes.data.vinculo.categoria)) return res.status(403).send("Não autorizado.");
        req.userData = suapRes.data;
        next();
    } catch (error) {
        if (error.response && error.response.status === 401) return res.status(401).send('Token SUAP inválido ou expirado.');
        res.status(500).send('Erro interno ao verificar autenticação.');
    }
};

// Configuração de e-mail
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'seu-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'sua-senha-de-app'
    }
});

async function enviarEmailSolicitacao(dados) {
    const mailOptions = {
        from: '"Sistema de Projetos" <noreply@seu-dominio.com>',
        to: dados.responsavelEmail,
        subject: `Nova Solicitação de Participação - ${dados.projetoTitulo}`,
        html: `
          <h2>Nova Solicitação de Participação</h2>
          <p><strong>Projeto:</strong> ${dados.projetoTitulo}</p>
          <p><strong>Nome do Interessado:</strong> ${dados.nomeInteressado}</p>
          <p><strong>E-mail de Contato:</strong> ${dados.emailInteressado}</p>
          <hr>
          <p><strong>Mensagem:</strong></p>
          <p style="white-space: pre-wrap;">${dados.mensagem}</p>
          <hr>
          <p><small>Para responder, envie um e-mail para: ${dados.emailInteressado}</small></p>
        `
    };
    return transporter.sendMail(mailOptions);
}

// Função de validação reutilizável
const validarResponsaveis = (membros) => {
    const responsaveis = membros.filter(m => m.responsavel);
    if (responsaveis.length === 0) return { valido: false, erro: 'É necessário designar um responsável para o projeto.' };
    if (responsaveis.length > 1) return { valido: false, erro: 'O projeto pode ter apenas um responsável.' };
    return { valido: true };
}

// =================================================================
// IMPORTANTE: ROTA DE SOLICITAÇÃO DEVE VIR ANTES DE /projetos/:id
// =================================================================
app.post('/projetos/solicitar-participacao', async (req, res) => {
    try {
        const { projetoTitulo, responsavelEmail, nomeInteressado, emailInteressado, mensagem } = req.body;
        
        if (!projetoTitulo || !responsavelEmail || !nomeInteressado || !emailInteressado || !mensagem) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        console.log(`Enviando e-mail para ${responsavelEmail}...`);
        await enviarEmailSolicitacao(req.body);
        
        res.json({ success: true, message: 'Solicitação enviada com sucesso' });

    } catch (error) {
        console.error('Erro ao enviar solicitação por e-mail:', error);
        res.status(500).json({ error: 'Ocorreu um erro interno ao enviar a solicitação.' });
    }
});

// =================================================================
// ROTAS DE PROJETOS
// =================================================================

app.get('/projetos', (req, res) => {
    const query = `
      SELECT 
        p.id as projeto_id, p.titulo, p.data, p.cursos, p.descricao, p.capa, p.galeria,
        m.nome AS membro_nome, m.titulos AS membro_titulos, m.image AS membro_image,
        m.email AS membro_email, m.responsavel AS membro_responsavel
      FROM projetos p
      LEFT JOIN membros m ON p.id = m.projeto_id
      ORDER BY p.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar projetos:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const projectsMap = {};
        rows.forEach(row => {
            if (!projectsMap[row.projeto_id]) {
                projectsMap[row.projeto_id] = {
                    id: row.projeto_id, 
                    titulo: row.titulo, 
                    capa: row.capa, 
                    data: row.data,
                    cursos: row.cursos, 
                    descricao: row.descricao,
                    galeria: JSON.parse(row.galeria || '[]'),
                    membros: []
                };
            }
            if (row.membro_nome) {
                projectsMap[row.projeto_id].membros.push({
                    nome: row.membro_nome, 
                    image: row.membro_image, 
                    titulos: row.membro_titulos || '',
                    email: row.membro_email || '',
                    responsavel: !!row.membro_responsavel
                });
            }
        });
        res.json(Object.values(projectsMap).sort((a, b) => b.id - a.id));
    });
});

app.get('/projetos/:id', (req, res) => {
    const { id } = req.params;
    
    // Validar se o ID é numérico
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    db.get(`SELECT * FROM projetos WHERE id = ?`, [id], (err, projeto) => {
        if (err) {
            console.error('Erro ao buscar projeto:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!projeto) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }
        
        projeto.galeria = JSON.parse(projeto.galeria || '[]');

        const queryMembros = `SELECT nome, titulos, image, email, responsavel FROM membros WHERE projeto_id = ?`;
        db.all(queryMembros, [id], (err, membros) => {
            if (err) {
                console.error('Erro ao buscar membros:', err);
                return res.status(500).json({ error: 'Database error fetching members' });
            }
            
            // Garantir que todos os campos existam
            projeto.membros = (membros || []).map(m => ({
                nome: m.nome || '',
                titulos: m.titulos || '',
                image: m.image || 'default-avatar.jpg',
                email: m.email || '',
                responsavel: !!m.responsavel
            }));
            
            res.json(projeto);
        });
    });
});

app.post('/projetos', checkSuapAuth, upload.fields([
    { name: 'capa', maxCount: 1 }, { name: 'membroImages' }, { name: 'galeria', maxCount: 10 }
]), (req, res) => {
    const { titulo, data, cursos, descricao, membros } = req.body;
    const membrosArray = JSON.parse(membros);

    const validacao = validarResponsaveis(membrosArray);
    if (!validacao.valido) {
        return res.status(400).json({ error: validacao.erro });
    }

    const capaFilename = req.files['capa']?.[0]?.filename;
    const imagensMembros = req.files['membroImages'] || [];
    const galeriaFilenames = (req.files['galeria'] || []).map(f => f.filename);
    const galeriaJSON = JSON.stringify(galeriaFilenames);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(`INSERT INTO projetos (titulo, data, cursos, descricao, capa, galeria) VALUES (?, ?, ?, ?, ?, ?)`,
            [titulo, data, cursos, descricao, capaFilename, galeriaJSON],
            function (err) {
                if (err) { 
                    console.error('Erro ao inserir projeto:', err);
                    db.run('ROLLBACK'); 
                    return res.status(500).send('Erro ao inserir projeto'); 
                }
                const projetoId = this.lastID;
                if (membrosArray.length === 0) {
                    db.run('COMMIT');
                    return res.status(201).send('Projeto inserido');
                }
                const stmt = db.prepare(`INSERT INTO membros (projeto_id, nome, titulos, image, email, responsavel) VALUES (?, ?, ?, ?, ?, ?)`);
                membrosArray.forEach((membro, index) => {
                    const imgFilename = imagensMembros[index]?.filename || null;
                    stmt.run(
                        projetoId, 
                        membro.nome, 
                        membro.titulos, 
                        imgFilename, 
                        membro.email || '', 
                        membro.responsavel ? 1 : 0
                    );
                });
                stmt.finalize((err) => {
                    if (err) { 
                        console.error('Erro ao finalizar membros:', err);
                        db.run('ROLLBACK'); 
                        return res.status(500).send('Erro ao finalizar membros'); 
                    }
                    db.run('COMMIT');
                    res.status(201).send('Projeto e membros inseridos com sucesso');
                });
            }
        );
    });
});

app.put('/projetos/:id', checkSuapAuth, upload.fields([
    { name: 'capa', maxCount: 1 }, { name: 'membroImages' }, { name: 'galeria', maxCount: 10 }
]), (req, res) => {
    const { id } = req.params;
    const { titulo, data, descricao, cursos, membros, fotosGaleriaRemover, membrosImagesAntigas } = req.body;
    const membrosArray = JSON.parse(membros || '[]');
    const membrosImagesAntigasArray = JSON.parse(membrosImagesAntigas || '[]');
    
    const validacao = validarResponsaveis(membrosArray);
    if (!validacao.valido) {
        return res.status(400).json({ error: validacao.erro });
    }

    const galeriaParaRemover = JSON.parse(fotosGaleriaRemover || '[]');
    const capaFile = req.files['capa']?.[0];
    const novasImagensMembros = req.files['membroImages'] || [];
    const novasImagensGaleria = req.files['galeria'] || [];

    db.get('SELECT capa, galeria FROM projetos WHERE id = ?', [id], (err, projetoExistente) => {
        if (err) {
            console.error('Erro ao buscar projeto:', err);
            return res.status(500).send('Erro ao buscar projeto');
        }
        if (!projetoExistente) return res.status(404).json({ error: 'Projeto não encontrado' });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.all('SELECT image FROM membros WHERE projeto_id = ?', [id], (err, membrosAntigos) => {
                if (err) { 
                    console.error('Erro ao buscar membros antigos:', err);
                    db.run('ROLLBACK'); 
                    return res.status(500).send('Erro ao buscar membros antigos'); 
                }
                
                const galeriaAntiga = JSON.parse(projetoExistente.galeria || '[]');
                const galeriaMantida = galeriaAntiga.filter(img => !galeriaParaRemover.includes(img));
                const galeriaNovaCompleta = [...galeriaMantida, ...novasImagensGaleria.map(f => f.filename)];
                const imagensMembrosMantidos = new Set(membrosImagesAntigasArray.filter(Boolean));
                const imagensMembrosParaDeletar = membrosAntigos
                    .filter(m => m.image && !imagensMembrosMantidos.has(m.image))
                    .map(m => m.image);

                db.run('DELETE FROM membros WHERE projeto_id = ?', [id], (err) => {
                    if (err) { 
                        console.error('Erro ao limpar membros antigos:', err);
                        db.run('ROLLBACK'); 
                        return res.status(500).send('Erro ao limpar membros antigos'); 
                    }
                    
                    const stmt = db.prepare(`INSERT INTO membros (projeto_id, nome, titulos, image, email, responsavel) VALUES (?, ?, ?, ?, ?, ?)`);
                    let newImageIndex = 0;
                    membrosArray.forEach((membro, index) => {
                        let imagemFinal;
                        
                        // Se tem imagem antiga, usa ela
                        if (membrosImagesAntigasArray[index]) {
                            imagemFinal = membrosImagesAntigasArray[index];
                        } 
                        // Se não tem imagem antiga mas tem nova, usa a nova
                        else if (novasImagensMembros[newImageIndex]) {
                            imagemFinal = novasImagensMembros[newImageIndex].filename;
                            newImageIndex++;
                        } 
                        // Senão, null
                        else {
                            imagemFinal = null;
                        }
                        
                        stmt.run(
                            id, 
                            membro.nome, 
                            membro.titulos, 
                            imagemFinal, 
                            membro.email || '', 
                            membro.responsavel ? 1 : 0
                        );
                    });

                    stmt.finalize((err) => {
                        if (err) { 
                            console.error('Erro ao inserir novos membros:', err);
                            db.run('ROLLBACK'); 
                            return res.status(500).send('Erro ao inserir novos membros'); 
                        }
                        
                        let updateQuery = 'UPDATE projetos SET titulo=?, data=?, descricao=?, cursos=?, galeria=?';
                        let params = [titulo, data, descricao, cursos, JSON.stringify(galeriaNovaCompleta)];
                        if (capaFile) { 
                            updateQuery += ', capa = ?'; 
                            params.push(capaFile.filename); 
                        }
                        updateQuery += ' WHERE id = ?'; 
                        params.push(id);

                        db.run(updateQuery, params, (err) => {
                            if (err) { 
                                console.error('Erro ao atualizar projeto:', err);
                                db.run('ROLLBACK'); 
                                return res.status(500).send('Erro ao atualizar projeto'); 
                            }
                            
                            db.run('COMMIT', (err) => {
                                if (err) { 
                                    console.error('Erro ao commitar transação:', err);
                                    return res.status(500).send('Erro ao commitar transação'); 
                                }
                                if (capaFile && projetoExistente.capa) {
                                    fs.unlink(path.join('uploads', projetoExistente.capa), e => e && console.error(e));
                                }
                                galeriaParaRemover.forEach(img => {
                                    fs.unlink(path.join('uploads', img), e => e && console.error(e));
                                });
                                imagensMembrosParaDeletar.forEach(img => {
                                    fs.unlink(path.join('uploads', img), e => e && console.error(e));
                                });
                                res.send('Projeto atualizado com sucesso');
                            });
                        });
                    });
                });
            });
        });
    });
});

app.delete('/projetos/:id', checkSuapAuth, (req, res) => {
    const { id } = req.params;
    db.get('SELECT capa, galeria FROM projetos WHERE id = ?', [id], (err, projeto) => {
        if (err) return res.status(500).send('Erro ao buscar projeto');
        if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
        db.all('SELECT image FROM membros WHERE projeto_id = ?', [id], (err, membros) => {
            if (err) return res.status(500).send('Erro ao buscar membros');
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                db.run('DELETE FROM membros WHERE projeto_id = ?', [id]);
                db.run('DELETE FROM projetos WHERE id = ?', [id]);
                db.run('COMMIT', (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).send('Erro ao commitar deleção'); }
                    if (projeto.capa) fs.unlink(path.join('uploads', projeto.capa), e => e && console.error(e));
                    membros.forEach(m => { if (m.image) fs.unlink(path.join('uploads', m.image), e => e && console.error(e)); });
                    JSON.parse(projeto.galeria || '[]').forEach(img => fs.unlink(path.join('uploads', img), e => e && console.error(e)));
                    res.send('Projeto removido com sucesso');
                });
            });
        });
    });
});

app.get('/meus-dados', checkSuapAuth, (req, res) => res.json(req.userData));

https.createServer(options, app).listen(PORT, () => console.log(`HTTPS server running at https://localhost:${PORT}`));