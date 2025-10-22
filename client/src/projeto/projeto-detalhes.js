const rolesPermitidos = ["docente", "estagiario", "Aluno"];

function getProjetoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function fetchProjetoDetalhes(id) {
    const response = await fetch(`${API_BASE_URL}/projetos/${id}`, {
        method: 'GET',
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Projeto não encontrado');
    }
    
    return await response.json();
}

function getResponsavel(membros) {
    return membros.find(membro => membro.responsavel === true);
}

function enviarSolicitacao(event, responsavelEmail, projetoTitulo) {
    event.preventDefault();
    
    const nomeInteressado = document.getElementById('nome-interessado').value;
    const emailInteressado = document.getElementById('email-interessado').value;
    const mensagem = document.getElementById('mensagem-interessado').value;
    
    const dados = {
        projetoTitulo: projetoTitulo,
        responsavelEmail: responsavelEmail,
        nomeInteressado: nomeInteressado,
        emailInteressado: emailInteressado,
        mensagem: mensagem
    };
    
    fetch(`${API_BASE_URL}/projetos/solicitar-participacao`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro ao enviar solicitação');
        return response.json();
    })
    .then(data => {
        alert('Solicitação enviada com sucesso! O responsável pelo projeto entrará em contato.');
        document.getElementById('form-participacao').reset();
    })
    .catch(err => {
        console.error('Erro ao enviar solicitação:', err);
        alert('Erro ao enviar solicitação. Tente novamente mais tarde.');
    });
}

function createProjetoDetalhesHTML(projeto) {
    const canEdit = rolesPermitidos.includes(window.currentUserRole);
    const responsavel = getResponsavel(projeto.membros || []);
    
    return `
        <div class="projeto-header">
            <button class="btn btn-outline-secondary mb-3" onclick="window.history.back()">
                <i class="bi bi-arrow-left"></i> Voltar
            </button>
            ${canEdit ? `
                <div class="float-end">
                    <a href="../form/form-editar.html?id=${projeto.id}" class="btn btn-primary">
                        <i class="bi bi-pencil"></i> Editar
                    </a>
                    <button class="btn btn-danger" onclick="removerProjeto(${projeto.id})">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            ` : ''}
        </div>

        <div class="projeto-content">
            <h1 class="projeto-titulo">${projeto.titulo}</h1>
            
            <div class="projeto-meta">
                <span class="meta-item">
                    <i class="bi bi-calendar-check"></i>
                    ${projeto.data}
                </span>
                <span class="meta-item">
                    <i class="bi bi-book-half"></i>
                    ${projeto.cursos}
                </span>
            </div>

            <img src="${API_BASE_URL}/uploads/${projeto.capa}" 
                 alt="${projeto.titulo}" 
                 class="projeto-capa img-fluid rounded">

            <div class="projeto-descricao">
                <h2>Sobre o Projeto</h2>
                <p>${projeto.descricao}</p>
            </div>

            ${projeto.galeria && projeto.galeria.length > 0 ? `
                <div class="projeto-galeria">
                    <h2>Galeria de Fotos</h2>
                    <div class="row g-3">
                        ${projeto.galeria.map((foto, index) => `
                            <div class="col-md-4 col-sm-6">
                                <img src="${API_BASE_URL}/uploads/${foto}" 
                                     alt="Foto ${index + 1}" 
                                     class="img-fluid rounded galeria-foto"
                                     data-bs-toggle="modal" 
                                     data-bs-target="#modalFoto${index}">
                            </div>
                            
                            <div class="modal fade" id="modalFoto${index}" tabindex="-1">
                                <div class="modal-dialog modal-lg modal-dialog-centered">
                                    <div class="modal-content">
                                        <div class="modal-body p-0">
                                            <button type="button" class="btn-close position-absolute top-0 end-0 m-2 bg-white" 
                                                    data-bs-dismiss="modal"></button>
                                            <img src="${API_BASE_URL}/uploads/${foto}" 
                                                 alt="Foto ${index + 1}" 
                                                 class="img-fluid">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${projeto.membros && projeto.membros.length > 0 ? `
                <div class="projeto-membros">
                    <h2>Equipe do Projeto</h2>
                    <div class="row g-4">
                        ${projeto.membros.map(membro => `
                            <div class="col-md-6 col-lg-4">
                                <div class="card membro-card h-100">
                                    <div class="card-body text-center">
                                        <img src="${API_BASE_URL}/uploads/${membro.image}" 
                                             alt="${membro.nome}" 
                                             class="membro-foto rounded-circle mb-3">
                                        <h5 class="card-title">${membro.nome}</h5>
                                        ${membro.titulos ? `
                                            <p class="card-text text-muted mb-2">${membro.titulos}</p>
                                        ` : ''}
                                        ${membro.responsavel ? `
                                            <span class="badge bg-success">Responsável</span>
                                        ` : ''}
                                        ${membro.email ? `
                                            <p class="card-text mt-2">
                                                <small><i class="bi bi-envelope"></i> ${membro.email}</small>
                                            </p>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${responsavel ? `
                <div class="projeto-participacao">
                    <h2>Interesse em Participar?</h2>
                    <p class="text-muted">Preencha o formulário abaixo para entrar em contato com o responsável pelo projeto.</p>
                    
                    <div class="card">
                        <div class="card-body">
                            <form id="form-participacao" onsubmit="enviarSolicitacao(event, '${responsavel.email}', '${projeto.titulo}')">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="nome-interessado" class="form-label">Seu Nome *</label>
                                        <input type="text" class="form-control" id="nome-interessado" required>
                                    </div>
                                    
                                    <div class="col-md-6 mb-3">
                                        <label for="email-interessado" class="form-label">Seu E-mail *</label>
                                        <input type="email" class="form-control" id="email-interessado" required>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="mensagem-interessado" class="form-label">Mensagem *</label>
                                    <textarea class="form-control" id="mensagem-interessado" rows="4" 
                                              placeholder="Descreva brevemente seu interesse e como você pode contribuir com o projeto..." 
                                              required></textarea>
                                </div>
                                
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> Sua mensagem será enviada para <strong>${responsavel.nome}</strong> (${responsavel.email})
                                </div>
                                
                                <button type="submit" class="btn btn-success">
                                    <i class="bi bi-send"></i> Enviar Solicitação
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function removerProjeto(id) {
    if (confirm('Tem certeza que deseja remover este projeto?')) {
        fetch(`${API_BASE_URL}/projetos/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                alert('Projeto removido com sucesso!');
                window.location.href = '../extensao/index.html';
            } else {
                alert('Falha ao remover o projeto.');
            }
        })
        .catch(err => {
            console.error('Erro ao remover projeto:', err);
            alert('Erro ao remover projeto.');
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const projetoId = getProjetoIdFromUrl();
    const container = document.getElementById('projeto-detalhes');

    if (!projetoId) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <h4>Erro</h4>
                <p>ID do projeto não fornecido.</p>
                <a href="../extensao/index.html" class="btn btn-primary">Voltar para lista de projetos</a>
            </div>
        `;
        return;
    }

    try {
        await getUserData();
        const projeto = await fetchProjetoDetalhes(projetoId);
        container.innerHTML = createProjetoDetalhesHTML(projeto);
    } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h4>Erro ao carregar projeto</h4>
                <p>${error.message}</p>
                <a href="../extensao/index.html" class="btn btn-primary">Voltar para lista de projetos</a>
            </div>
        `;
    }
});