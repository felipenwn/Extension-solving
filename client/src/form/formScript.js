let membroCount = 0;

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
          <small class="form-text text-muted d-block">Marque se este membro é o professor/coordenador responsável que receberá solicitações de participação.</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label">Foto (Opcional)</label>
          <input type="file" class="form-control membro-image" name="membros[${membroCount}][image]" accept="image/*">
        </div>
        
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">Remover</button>
      `;

    container.appendChild(membroDiv);
    membroCount++;
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

function submitProjetoForm(event) {
    event.preventDefault();

    const titulo = document.getElementById('titulo').value;
    const data = document.getElementById('data').value;
    const descricao = document.getElementById('descricao').value;

    // CURSOS (checkboxes)
    const cursosSelecionados = [];
    document.querySelectorAll('input[name="cursos"]:checked').forEach((checkbox) => {
        cursosSelecionados.push(checkbox.value);
    });

    // CAPA
    const capaFile = document.getElementById('capa').files[0];

    // GALERIA (se existir no formulário)
    const galeriaInput = document.getElementById('galeria');
    const galeriaFiles = galeriaInput ? galeriaInput.files : [];

    // MEMBROS
    const membrosArray = [];
    const membrosImages = [];
    let temResponsavel = false;

    document.querySelectorAll('.membro-grupo').forEach((membroDiv) => {
        const nome = membroDiv.querySelector('.membro-nome').value;
        const email = membroDiv.querySelector('.membro-email').value;
        const titulos = membroDiv.querySelector('.membro-titulos').value;
        const responsavel = membroDiv.querySelector('.membro-responsavel').checked;
        const imageFile = membroDiv.querySelector('.membro-image').files[0];

        if (responsavel) {
            temResponsavel = true;
        }

        membrosArray.push({ 
            nome, 
            email,
            titulos, 
            responsavel: responsavel ? true : false 
        });
        membrosImages.push(imageFile);
    });

    // Validação: verificar se há pelo menos um responsável
    if (!temResponsavel) {
        alert('Por favor, marque pelo menos um membro como responsável pelo projeto.');
        return;
    }

    // FormData
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('data', data);
    formData.append('descricao', descricao);
    formData.append('cursos', cursosSelecionados.join(','));
    formData.append('capa', capaFile);
    formData.append('membros', JSON.stringify(membrosArray));
    
    // Adicionar imagens dos membros
    membrosImages.forEach(img => {
        if (img) {
            formData.append('membroImages', img);
        }
    });

    // Adicionar fotos da galeria (se houver)
    if (galeriaFiles.length > 0) {
        for (let i = 0; i < galeriaFiles.length; i++) {
            formData.append('galeria', galeriaFiles[i]);
        }
    }

    // Enviar
    fetch(`${API_BASE_URL}/projetos`, {
        method: 'POST',
        credentials: 'include',
        body: formData
    })
        .then(response => {
            if (!response.ok) throw new Error('Erro ao enviar o projeto');
            return response.text();
        })
        .then(data => {
            alert('Projeto enviado com sucesso!');
            console.log(data);
            window.location.href = '/client/src/extensao/index.html';
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao enviar projeto');
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("project-form");
    form.addEventListener("submit", submitProjetoForm);
});