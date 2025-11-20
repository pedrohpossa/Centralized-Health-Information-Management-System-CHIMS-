/**
 * ===================================================================
 * SCRIPT DE LÓGICA DO PORTAL DO ADMINISTRADOR (admin.js) - VERSÃO CORRIGIDA
 * Projeto: CHIMS
 * Descrição: Contém todas as funcionalidades e interações para as
 * páginas do painel administrativo, agora conectado ao backend PHP.
 * ===================================================================
 */

// --- CONFIGURAÇÃO DA API ---
// CORREÇÃO: Usando o caminho relativo correto para a API, que funciona em qualquer servidor.
const ADMIN_API_URL = '../php/api/admin.php';

// --- ROTEAMENTO E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // A função checkAuth() já é chamada pelo auth.js, não precisa chamar aqui de novo.
    
    // Identifica qual página estamos e inicializa a função correta.
    if (document.getElementById('total-pacientes')) {
        carregarDashboardAdmin();
    } else if (document.getElementById('usuarios-tbody')) {
        inicializarGerenciamentoUsuarios();
    } else if (document.getElementById('user-form')) {
        inicializarFormularioUsuario();
    }
});


// ===================================================================
// --- FUNÇÕES DO DASHBOARD (dashboard.html) ---
// ===================================================================
async function carregarDashboardAdmin() {
    console.log("Carregando dados do dashboard do admin...");
    try {
        const response = await fetch(`${ADMIN_API_URL}?action=dashboard_stats`);
        if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
        
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            document.getElementById('total-pacientes').textContent = result.data.total_pacientes;
            document.getElementById('total-medicos').textContent = result.data.total_medicos;
            document.getElementById('novos-cadastros-semana').textContent = result.data.novos_cadastros_semana;
        } else {
            throw new Error(result.message || 'A resposta da API não continha os dados esperados.');
        }
        
        document.getElementById('atividades-recentes-lista').innerHTML = '<li>Funcionalidade de log de atividades a ser implementada.</li>';

    } catch (error) {
        console.error("Erro ao carregar dashboard do admin:", error);
        alert("Não foi possível carregar os dados do dashboard. Verifique o console para mais detalhes.");
    }
}


// ===================================================================
// --- FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS (gerenciar-usuarios.html) ---
// ===================================================================
function inicializarGerenciamentoUsuarios() {
    const form = document.querySelector('main > section > form');
    const userTableBody = document.getElementById('usuarios-tbody');

    fetchAndRenderUsers(); // Carrega a lista inicial de usuários

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const searchTerm = document.getElementById('busca-usuario').value;
        const roleFilter = document.getElementById('filtro-perfil').value;
        fetchAndRenderUsers(searchTerm, roleFilter);
    });

    // Delegação de eventos para os botões de ação na tabela
    userTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button, a[data-action="edit"]');
        if (!target) return;

        const action = target.dataset.action;
        const userId = target.dataset.userId;

        if (action === 'toggle-status') {
            if (confirm('Tem certeza que deseja alterar o status deste usuário?')) {
                toggleUserStatus(userId);
            }
        } else if (action === 'delete') {
            if (confirm('ATENÇÃO: Esta ação é irreversível. Deseja realmente excluir este usuário?')) {
                deleteUser(userId);
            }
        }
    });
}

async function fetchAndRenderUsers(search = '', perfil = 'todos') {
    const userTableBody = document.getElementById('usuarios-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');

    userTableBody.innerHTML = '';
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';

    try {
        const url = new URL(ADMIN_API_URL, window.location.href);
        url.searchParams.append('action', 'get_users');
        if (search) url.searchParams.append('busca', search);
        if (perfil && perfil !== 'todos') url.searchParams.append('perfil', perfil);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
        
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);

        if (!result.data || result.data.length === 0) {
            emptyState.style.display = 'block';
        } else {
            const template = document.getElementById('usuario-row-template');
            result.data.forEach(user => {
                const clone = template.content.cloneNode(true);
                clone.querySelector('[data-placeholder="nome"]').textContent = user.nome;
                clone.querySelector('[data-placeholder="cpf"]').textContent = user.cpf || 'N/A';
                clone.querySelector('[data-placeholder="email"]').textContent = user.email;
                clone.querySelector('[data-placeholder="perfil"]').textContent = user.tipo.charAt(0).toUpperCase() + user.tipo.slice(1);
                
                const statusSpan = clone.querySelector('[data-placeholder="status"]');
                statusSpan.textContent = user.status.charAt(0).toUpperCase() + user.status.slice(1);
                statusSpan.className = `status status--${user.status}`;
                
                clone.querySelector('[data-action="edit"]').href = `./criar-editar-usuario.html?id=${user.id}`;
                
                const statusButton = clone.querySelector('[data-action="toggle-status"]');
                statusButton.textContent = user.status === 'ativo' ? 'Desativar' : 'Ativar';
                statusButton.dataset.userId = user.id;

                clone.querySelector('[data-action="delete"]').dataset.userId = user.id;
                userTableBody.appendChild(clone);
            });
        }
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        userTableBody.innerHTML = `<tr><td colspan="6">Erro ao carregar dados. Tente novamente. (${error.message})</td></tr>`;
    } finally {
        loadingState.style.display = 'none';
    }
}

async function toggleUserStatus(userId) {
    try {
        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_status', id: userId })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        
        alert('Status alterado com sucesso!');
        fetchAndRenderUsers(
            document.getElementById('busca-usuario').value,
            document.getElementById('filtro-perfil').value
        );
    } catch (error) {
        alert(`Erro ao alterar status: ${error.message}`);
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_user', id: userId })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);

        alert('Usuário excluído com sucesso!');
        fetchAndRenderUsers(
            document.getElementById('busca-usuario').value,
            document.getElementById('filtro-perfil').value
        );
    } catch (error) {
        alert(`Erro ao excluir usuário: ${error.message}`);
    }
}

// ===================================================================
// --- FUNÇÕES DO FORMULÁRIO (criar-editar-usuario.html) ---
// ===================================================================
async function inicializarFormularioUsuario() {
    const form = document.getElementById('user-form');
    const formTitle = document.getElementById('form-mode-title');
    const submitButton = document.getElementById('submit-button');
    const campoCRM = document.getElementById('campo-crm'); // Div que envolve o CRM
    const campoEspecialidade = document.getElementById('campo-especialidade'); // Div que envolve a Especialidade
    const radiosTipo = document.querySelectorAll('input[name="tipo_usuario"]');
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    const isEditMode = Boolean(userId);

    // Função para mostrar/esconder campos de médico
    const toggleCamposMedico = () => {
        const tipoSelecionado = document.querySelector('input[name="tipo_usuario"]:checked')?.value;
        const isMedico = tipoSelecionado === 'medico';
        campoCRM.style.display = isMedico ? 'block' : 'none';
        campoEspecialidade.style.display = isMedico ? 'block' : 'none';
        form.elements.crm.required = isMedico;
        form.elements.especialidade.required = isMedico;
    };
    radiosTipo.forEach(radio => radio.addEventListener('change', toggleCamposMedico));
    
    if (isEditMode) {
        formTitle.textContent = 'Editar';
        submitButton.textContent = 'Atualizar Cadastro';
        document.title = 'Editar Usuário - CHIMS';
        document.getElementById('senha-help-text').textContent = 'Deixe em branco para não alterar a senha.';

        try {
            const url = new URL(ADMIN_API_URL, window.location.href);
            url.searchParams.append('action', 'get_user_details');
            url.searchParams.append('id', userId);
            
            const response = await fetch(url);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            
            // Preenche os campos do formulário com os dados recebidos
            const userData = result.data;
            for (const key in userData) {
                const input = form.elements[key];
                if (input) {
                    if (input.type === 'radio') {
                       form.querySelector(`[name="${key}"][value="${userData[key]}"]`).checked = true;
                    } else {
                       input.value = userData[key];
                    }
                }
            }
            toggleCamposMedico(); // Mostra os campos corretos após preencher
        } catch(error) {
            alert(`Erro ao carregar dados do usuário: ${error.message}`);
            window.location.href = './gerenciar-usuarios.html';
        }
    } else {
         formTitle.textContent = 'Cadastrar Novo';
         toggleCamposMedico(); // Garante estado inicial correto
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const action = isEditMode ? 'update_user' : 'create_user';
        if (isEditMode) {
            data.id = userId;
        }
        if (data.senha === '') {
            delete data.senha; // Não envia a senha se estiver vazia no modo de edição
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            const response = await fetch(ADMIN_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);

            alert(result.message);
            window.location.href = './gerenciar-usuarios.html';
        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = isEditMode ? 'Atualizar Cadastro' : 'Salvar Cadastro';
        }
    });
}