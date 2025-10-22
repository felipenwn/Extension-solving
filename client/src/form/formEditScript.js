let membroCount = 0;
let projetoAtual = null;
let fotosGaleriaParaRemover = [];

function getProjetoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function carregarProjeto(id) {
    const response = await fetch(`${API_BASE_URL}/projetos/${id}`, {
        method: 'GET',
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Projeto não encontrado');
    }
    
    return await response.json();
}

function preencherFormulario(projeto) {
    projetoAtual = projeto;
    
    document.getElementById('projeto-id').value = projeto.id;
    document.getElementById('titulo').value = projeto.titulo;
    document.getElementById('data').value = projeto.data;
    document.getElementById('descricao').value = projeto.descricao;
    
    // Capa atual
    const capaAtual = document.getElementById('capa-atual');
    capaAtual.innerHTML = `
        <img src="${API_BASE_URL}/uploads/${projeto.capa}" 
             alt="Capa atual" 
             class="img-thumbnail" 
             style="max-width: 200px;">
    `;
    
    // Cursos
    const cursos = projeto.cursos.split(',').map(c => c.trim());
    cursos.forEach(curso => {
        const checkbox = document.querySelector(`input[name="cursos"][value="${curso}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Galeria de fotos
    if (projeto.galeria && projeto.galeria.length > 0) {
        const galeriaAtual = document.getElementById('galeria-atual');
        galeriaAtual.innerHTML = `
            <label class="form-label">Fotos atuais da galeria:</label>
            <div class="row g-2">
                ${projeto.galeria.map((foto, index) => `
                    <div class="col-md-3 col-sm-4 position-relative" id="foto-${index}">
                        <img src="${API_BASE_URL}/uploads/${foto}" 
                             class="img-thumbnail" 
                             style="width: 100%; height: 150px; object-fit: cover;">
                        <button type="button" 
                                class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                onclick="removerFotoGaleria('${foto}', ${index})">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Membros
    const membrosContainer = document.getElementById('membros-container');
    membrosContainer.innerHTML = '';
    
    if (projeto.membros && projeto.membros.length > 0) {
        projeto.membros.forEach((membro, index) => {
            addMembroExistente(membro, index);
        });
    }
}

function removerFotoGaleria(foto, index) {
    if (confirm('Deseja remover esta foto da galeria?')) {
        fotosGaleriaParaRemover.push(foto);
        document.getElementById(`foto-${index}`).remove();
    }
}

function handleResponsavelChange(checkbox) {
    if (checkbox.checked) {
        // Desmarca todos os outros checkboxes de responsável
        document.querySelectorAll('.membro-responsavel').forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = false;
            }
        });
    }
}

function addMembro() {
    const container = document.getElementById("membros-container");

    const membroDiv = document.createElement("div");
    membroDiv.classList.add("border", "p-3", "mb-3", "rounded", 'membro-grupo');
    membroDiv.innerHTML = `
        <div class="mb-3">
          <label class="form-label">Nome do Membro</label>
          <input type="text" class="form-control membro-nome" name="membros[${membroCount}][nome]" required>
        </div>
        
        <div class="mb-3">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-control membro-email" name="membros[${membroCount}][email]" placeholder="exemplo@ifsul.edu.br" required>
        </div>
        
        <div class="mb-3">
          <label class="form-label">Função no Projeto</label>
          <select class="form-select membro-titulos" name="membros[${membroCount}][titulos]" required>
            <option value="">Selecione...</option>
            <option value="Professor Orientador">Professor Orientador</option>
            <option value="Professor Colaborador">Professor Colaborador</option>
            <option value="Coordenador">Coordenador</option>
            <option value="Estudante Bolsista">Estudante Bolsista</option>
            <option value="Estudante Voluntário">Estudante Voluntário</option>
            <option value="Pesquisador">Pesquisador</option>
            <option value="Técnico Administrativo">Técnico Administrativo</option>
            <option value="Parceiro Externo">Parceiro Externo</option>
            <option value="Colaborador">Colaborador</option>
          </select>
          <small class="form-text text-muted">A função do membro no projeto.</small>
        </div>
        
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input membro-responsavel" name="membros[${membroCount}][responsavel]" onchange="handleResponsavelChange(this)">
          <label class="form-check-label">
            <strong>Responsável pelo projeto</strong>
          </label>
          <small class="form-text text-muted d-block">Marque se este membro é o professor/coordenador responsável.</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label">Foto</label>
          <input type="file" class="form-control membro-image" name="membros[${membroCount}][image]" accept="image/*">
        </div>
        
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">Remover</button>
      `;

    container.appendChild(membroDiv);
    membroCount++;
}

function addMembroExistente(membro, index) {
    const container = document.getElementById("membros-container");

    const membroDiv = document.createElement("div");
    membroDiv.classList.add("border", "p-3", "mb-3", "rounded", 'membro-grupo');
    membroDiv.setAttribute('data-membro-id', index);
    membroDiv.innerHTML = `
        <input type="hidden" class="membro-id" value="${index}">
        <input type="hidden" class="membro-image-atual" value="${membro.image}">
        
        <div class="mb-3">
          <label class="form-label">Nome do Membro</label>
          <input type="text" class="form-control membro-nome" name="membros[${membroCount}][nome]" value="${membro.nome}" required>
        </div>
        
        <div class="mb-3">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-control membro-email" name="membros[${membroCount}][email]" value="${membro.email || ''}" placeholder="exemplo@ifsul.edu.br" required>
        </div>
        
        <div class="mb-3">
          <label class="form-label">Função no Projeto</label>
          <select class="form-select membro-titulos" name="membros[${membroCount}][titulos]" required>
            <option value="">Selecione...</option>
            <option value="Professor Orientador" ${membro.titulos === 'Professor Orientador' ? 'selected' : ''}>Professor Orientador</option>
            <option value="Professor Colaborador" ${membro.titulos === 'Professor Colaborador' ? 'selected' : ''}>Professor Colaborador</option>
            <option value="Coordenador" ${membro.titulos === 'Coordenador' ? 'selected' : ''}>Coordenador</option>
            <option value="Estudante Bolsista" ${membro.titulos === 'Estudante Bolsista' ? 'selected' : ''}>Estudante Bolsista</option>
            <option value="Estudante Voluntário" ${membro.titulos === 'Estudante Voluntário' ? 'selected' : ''}>Estudante Voluntário</option>
            <option value="Pesquisador" ${membro.titulos === 'Pesquisador' ? 'selected' : ''}>Pesquisador</option>
            <option value="Técnico Administrativo" ${membro.titulos === 'Técnico Administrativo' ? 'selected' : ''}>Técnico Administrativo</option>
            <option value="Parceiro Externo" ${membro.titulos === 'Parceiro Externo' ? 'selected' : ''}>Parceiro Externo</option>
            <option value="Colaborador" ${membro.titulos === 'Colaborador' ? 'selected' : ''}>Colaborador</option>
          </select>
          <small class="form-text text-muted">A função do membro no projeto.</small>
        </div>
        
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input membro-responsavel" name="membros[${membroCount}][responsavel]" ${membro.responsavel ? 'checked' : ''} onchange="handleResponsavelChange(this)">
          <label class="form-check-label">
            <strong>Responsável pelo projeto</strong>
          </label>
          <small class="form-text text-muted d-block">Marque se este membro é o professor/coordenador responsável.</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label">Foto</label>
          <div class="mb-2">
            <img src="${API_BASE_URL}/uploads/${membro.image}" class="img-thumbnail" style="max-width: 100px;">
          </div>
          <input type="file" class="form-control membro-image" name="membros[${membroCount}][image]" accept="image/*">
          <small class="form-text text-muted">Deixe em branco para manter a foto atual</small>
        </div>
        
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">Remover</button>
      `;

    container.appendChild(membroDiv);
    membroCount++;
}

async function submitEditarProjetoForm(event) {
    event.preventDefault();

    const projetoId = document.getElementById('projeto-id').value;
    const titulo = document.getElementById('titulo').value;
    const data = document.getElementById('data').value;
    const descricao = document.getElementById('descricao').value;

    // CURSOS
    const cursosSelecionados = [];
    document.querySelectorAll('input[name="cursos"]:checked').forEach((checkbox) => {
        cursosSelecionados.push(checkbox.value);
    });

    // CAPA
    const capaFile = document.getElementById('capa').files[0];

    // GALERIA
    const galeriaFiles = document.getElementById('galeria').files;

    // MEMBROS
    const membrosArray = [];
    const membrosImagesNovas = [];
    const membrosImagesAntigas = [];
    let temResponsavel = false;

    document.querySelectorAll('.membro-grupo').forEach((membroDiv) => {
        const nome = membroDiv.querySelector('.membro-nome').value;
        const email = membroDiv.querySelector('.membro-email').value;
        const titulos = membroDiv.querySelector('.membro-titulos').value;
        const responsavel = membroDiv.querySelector('.membro-responsavel').checked;
        const imageFile = membroDiv.querySelector('.membro-image').files[0];
        const imageAtual = membroDiv.querySelector('.membro-image-atual')?.value;

        if (responsavel) {
            temResponsavel = true;
        }

        membrosArray.push({ 
            nome, 
            email,
            titulos,
            responsavel: responsavel ? true : false,
            imageAtual: imageAtual || null
        });
        
        if (imageFile) {
            membrosImagesNovas.push(imageFile);
        } else {
            membrosImagesNovas.push(null);
        }
        
        if (imageAtual) {
            membrosImagesAntigas.push(imageAtual);
        } else {
            membrosImagesAntigas.push(null);
        }
    });

    // Validação: verificar se há pelo menos um responsável
    if (!temResponsavel) {
        alert('Por favor, marque pelo menos um membro como responsável pelo projeto.');
        return;
    }

    // FormData
    const formData = new FormData();
    formData.append('id', projetoId);
    formData.append('titulo', titulo);
    formData.append('data', data);
    formData.append('descricao', descricao);
    formData.append('cursos', cursosSelecionados.join(','));
    
    if (capaFile) {
        formData.append('capa', capaFile);
    }
    
    // Adicionar fotos da galeria
    for (let i = 0; i < galeriaFiles.length; i++) {
        formData.append('galeria', galeriaFiles[i]);
    }
    
    // Fotos da galeria para remover
    formData.append('fotosGaleriaRemover', JSON.stringify(fotosGaleriaParaRemover));
    
    formData.append('membros', JSON.stringify(membrosArray));
    
    // Adicionar novas imagens de membros
    membrosImagesNovas.forEach((img, index) => {
        if (img) {
            formData.append('membroImages', img);
        }
    });
    
    // Adicionar imagens antigas de membros para referência
    formData.append('membrosImagesAntigas', JSON.stringify(membrosImagesAntigas));

    try {
        const response = await fetch(`${API_BASE_URL}/projetos/${projetoId}`, {
            method: 'PUT',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar o projeto');
        }

        alert('Projeto atualizado com sucesso!');
        window.location.href = `../projeto/projeto-detalhes.html?id=${projetoId}`;
    } catch (err) {
        console.error(err);
        alert('Erro ao atualizar projeto: ' + err.message);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const projetoId = getProjetoIdFromUrl();
    
    if (!projetoId) {
        alert('ID do projeto não fornecido');
        window.location.href = '../extensao/index.html';
        return;
    }

    try {
        await getUserData();
        const projeto = await carregarProjeto(projetoId);
        preencherFormulario(projeto);
        
        document.getElementById('loading-container').style.display = 'none';
        document.getElementById('form-container').style.display = 'block';
        
        const form = document.getElementById("project-form");
        form.addEventListener("submit", submitEditarProjetoForm);
    } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        alert('Erro ao carregar projeto: ' + error.message);
        window.location.href = '../extensao/index.html';
    }
});