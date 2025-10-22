import sqlite3 from "sqlite3";

export const db = new sqlite3.Database("extensao.db");

db.serialize(() => {
  // Tabela de projetos (já com a coluna 'galeria')
  db.run(`
    CREATE TABLE IF NOT EXISTS projetos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      data DATE NOT NULL,
      capa TEXT NOT NULL,
      cursos TEXT,
      descricao TEXT,
      galeria TEXT
    )
  `);

  // Tabela de membros (com os novos campos)
  db.run(`
    CREATE TABLE IF NOT EXISTS membros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projeto_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      titulos TEXT,
      image TEXT,
      email TEXT,            -- NOVO
      responsavel BOOLEAN DEFAULT 0, -- NOVO
      FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
    )
  `);

  // --- Migrações para o banco de dados existente ---
  
  // Adiciona 'galeria' à tabela de projetos (se ainda não existir)
  db.run('ALTER TABLE projetos ADD COLUMN galeria TEXT', (err) => {
    if (err && err.message.includes('duplicate column name')) {
      console.log("A coluna 'galeria' já existe em 'projetos'.");
    } else if (err) {
      console.error("Erro ao adicionar 'galeria':", err.message);
    } else {
      console.log("Coluna 'galeria' adicionada com sucesso.");
    }
  });
  
  // NOVO: Adiciona 'email' à tabela de membros (se ainda não existir)
  db.run('ALTER TABLE membros ADD COLUMN email TEXT', (err) => {
    if (err && err.message.includes('duplicate column name')) {
        console.log("A coluna 'email' já existe em 'membros'.");
    } else if (err) {
        console.error("Erro ao adicionar 'email':", err.message);
    } else {
        console.log("Coluna 'email' adicionada com sucesso.");
    }
  });

  // NOVO: Adiciona 'responsavel' à tabela de membros (se ainda não existir)
  db.run('ALTER TABLE membros ADD COLUMN responsavel BOOLEAN DEFAULT 0', (err) => {
    if (err && err.message.includes('duplicate column name')) {
        console.log("A coluna 'responsavel' já existe em 'membros'.");
    } else if (err) {
        console.error("Erro ao adicionar 'responsavel':", err.message);
    } else {
        console.log("Coluna 'responsavel' adicionada com sucesso.");
    }
  });

  console.log("Inicialização do banco de dados concluída.");
});