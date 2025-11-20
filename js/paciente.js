/**
 * ===================================================================
 * SCRIPT DE LÓGICA DO PORTAL DO PACIENTE (paciente.js) - VERSÃO CORRIGIDA
 * Projeto: CHIMS
 * Descrição: Contém todas as funcionalidades e interações para as
 * páginas do painel do paciente, conectado ao backend PHP.
 * ===================================================================
 */

// --- CONFIGURAÇÃO DA API ---
// CORREÇÃO: Usando o caminho relativo correto a partir das páginas internas.
const PACIENTE_API_URL = '../php/api/paciente.php';

// --- ROTEAMENTO E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // A função checkAuth() já é chamada pelo auth.js.

    if (document.querySelector('main > section > h2 > a[href="./prontuario.html"]')) {
        initPacienteDashboard();
    } else if (document.getElementById('prontuario-timeline')) {
        initPacienteProntuario();
    } else if (document.getElementById('exames-lista-tbody')) {
        initPacienteExames();
    } else if (document.getElementById('receitas-lista-container')) {
        initPacienteReceitas();
    }
});

// ===================================================================
// --- DASHBOARD (dashboard.html) ---
// ===================================================================
async function initPacienteDashboard() {
    console.log("Inicializando Dashboard do Paciente...");
    try {
        const response = await fetch(`${PACIENTE_API_URL}?action=get_dashboard_summary`);
        if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);

        const dashboardData = result.data;
        const cards = document.querySelectorAll('main > section:first-of-type article');
        
        // Card: Próxima Consulta
        if (dashboardData.proxima_consulta) {
            cards[0].querySelector('p:nth-of-type(1)').textContent = `Data: ${new Date(dashboardData.proxima_consulta.data_hora).toLocaleString('pt-BR')}`;
            cards[0].querySelector('p:nth-of-type(2)').textContent = `Médico(a): ${dashboardData.proxima_consulta.medico_nome}`;
        } else {
            cards[0].querySelector('p:nth-of-type(1)').textContent = 'Nenhuma consulta agendada.';
            cards[0].querySelector('p:nth-of-type(2)').textContent = '';
        }

        // Card: Último Exame
        if (dashboardData.ultimo_exame) {
            cards[1].querySelector('p:nth-of-type(1)').textContent = `Tipo: ${dashboardData.ultimo_exame.nome_exame}`;
            // CORREÇÃO: Adicionando 'T00:00:00' para evitar problemas de fuso horário com datas
            cards[1].querySelector('p:nth-of-type(2)').textContent = `Realizado em: ${new Date(dashboardData.ultimo_exame.data_exame + 'T00:00:00').toLocaleDateString('pt-BR')}`;
        } else {
            cards[1].querySelector('p:nth-of-type(1)').textContent = 'Nenhum exame registrado.';
            cards[1].querySelector('p:nth-of-type(2)').textContent = '';
        }

        // Card: Receitas Ativas
        cards[2].querySelector('p').textContent = `Você tem ${dashboardData.receitas_ativas} receitas ativas.`;
        
        // Carrega as últimas atualizações do prontuário
        const listaUl = document.querySelector('main > section:nth-of-type(2) > ul');
        listaUl.innerHTML = '<li>Carregando atualizações...</li>';
        const prontuarioResponse = await fetch(`${PACIENTE_API_URL}?action=get_my_prontuario`);
        const prontuarioResult = await prontuarioResponse.json();
        if(prontuarioResult.status === 'success' && prontuarioResult.data?.length > 0) {
            listaUl.innerHTML = '';
            prontuarioResult.data.slice(0, 3).forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)} com Dr(a). ${item.medico_nome} - ${new Date(item.data).toLocaleDateString('pt-BR')}`;
                listaUl.appendChild(li);
            });
        } else {
            listaUl.innerHTML = '<li>Nenhuma atividade recente encontrada.</li>';
        }

    } catch (error) {
        console.error("Erro ao carregar dashboard do paciente:", error);
        alert('Não foi possível carregar os dados do painel.');
    }
}

// ===================================================================
// --- PRONTUÁRIO (prontuario.html) ---
// ===================================================================
async function initPacienteProntuario() {
    console.log("Inicializando Prontuário do Paciente...");
    const timelineContainer = document.getElementById('prontuario-timeline');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const template = document.getElementById('timeline-item-template');

    loadingState.style.display = 'block';
    
    try {
        const response = await fetch(`${PACIENTE_API_URL}?action=get_my_prontuario`);
        if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
        const result = await response.json();
        if(result.status !== 'success') throw new Error(result.message);

        const prontuario = result.data;
        if (!prontuario || prontuario.length === 0) {
            emptyState.style.display = 'block';
        } else {
            prontuario.forEach(item => {
                const clone = template.content.cloneNode(true);
                let titulo = `Registro de ${item.tipo}`;
                let detalhesHtml = '';

                // CORREÇÃO: Lógica de renderização ajustada para os campos corretos do PHP
                if(item.tipo === 'consulta') {
                    titulo = `Consulta de Rotina`;
                    detalhesHtml = `<strong>Médico(a):</strong> Dr(a). ${item.medico_nome}<br>
                                   <strong>Sintomas:</strong> ${item.sintomas || 'Não informado'}<br>
                                   <strong>Diagnóstico:</strong> ${item.diagnostico || 'Não informado'}`;
                } else if (item.tipo === 'exame') {
                    titulo = `Resultado de Exame: ${item.nome_exame}`;
                    detalhesHtml = `<strong>Resultado:</strong> ${item.resultado || 'Aguardando.'}<br>
                                    <a href="./exames.html">Ver todos os exames</a>`;
                } else if (item.tipo === 'receita') {
                    titulo = `Receita Emitida`;
                    detalhesHtml = `<strong>Medicamento:</strong> ${item.medicamento} (${item.dosagem})<br>
                                    <strong>Instruções:</strong> ${item.instrucoes}<br>
                                    <a href="./receitas.html">Ver todas as receitas</a>`;
                }

                clone.querySelector('[data-placeholder="titulo-registro"]').textContent = titulo;
                clone.querySelector('[data-placeholder="data-registro"]').textContent = new Date(item.data).toLocaleDateString('pt-BR');
                clone.querySelector('[data-placeholder="detalhes"]').innerHTML = detalhesHtml;
                timelineContainer.appendChild(clone);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar prontuário:", error);
        timelineContainer.innerHTML = 'Ocorreu um erro ao carregar seu prontuário.';
    } finally {
        loadingState.style.display = 'none';
    }
}

// ===================================================================
// --- EXAMES (exames.html) ---
// ===================================================================
async function initPacienteExames() {
    console.log("Inicializando página de Exames...");
    const tbody = document.getElementById('exames-lista-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const template = document.getElementById('exame-row-template');

    tbody.innerHTML = '';
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';

    try {
        const response = await fetch(`${PACIENTE_API_URL}?action=get_my_exames`);
        if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
        const result = await response.json();
        if(result.status !== 'success') throw new Error(result.message);

        const exames = result.data;
        if (!exames || exames.length === 0) {
            emptyState.style.display = 'block';
        } else {
            exames.forEach(exame => {
                const clone = template.content.cloneNode(true);
                // CORREÇÃO: Adicionando 'T00:00:00' para evitar problemas de fuso horário
                clone.querySelector('[data-placeholder="data"]').textContent = new Date(exame.data_exame + 'T00:00:00').toLocaleDateString('pt-BR');
                clone.querySelector('[data-placeholder="nome-exame"]').textContent = exame.nome_exame;
                // CORREÇÃO: Usando 'resultado' em vez de 'laudo'
                clone.querySelector('[data-placeholder="status"]').textContent = exame.resultado ? 'Disponível' : 'Pendente';
                if(exame.arquivo_path) {
                    clone.querySelector('[data-action="download"]').href = exame.arquivo_path; // Supondo que o caminho seja direto
                } else {
                    clone.querySelector('[data-action="download"]').style.display = 'none';
                }
                tbody.appendChild(clone);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar exames:", error);
        tbody.innerHTML = `<tr><td colspan="4">Não foi possível carregar seus exames.</td></tr>`;
    } finally {
        loadingState.style.display = 'none';
    }
}

// ===================================================================
// --- RECEITAS (receitas.html) ---
// ===================================================================
function initPacienteReceitas() {
    console.log("Inicializando página de Receitas...");
    const container = document.getElementById('receitas-lista-container');
    const modal = document.getElementById('receita-modal');
    const btnCloseModal = modal.querySelector('[data-action="close-modal"]');
    
    let receitasData = []; // Armazena os dados das receitas para usar no modal

    const openReceitaModal = (receitaId) => {
        const receita = receitasData.find(r => r.id == receitaId);
        if (!receita) return;
        
        const pacienteInfo = JSON.parse(localStorage.getItem('chims_user_data'));
        
        modal.querySelector('[data-placeholder="modal-medico-nome"]').textContent = `Dr(a). ${receita.medico_nome}`;
        modal.querySelector('[data-placeholder="modal-medico-crm"]').textContent = `CRM: ${receita.crm || 'Não informado'}`;
        modal.querySelector('[data-placeholder="modal-paciente-nome"]').textContent = pacienteInfo.nome;
        modal.querySelector('[data-placeholder="modal-paciente-cpf"]').textContent = pacienteInfo.cpf || ''; // O CPF não está no localStorage, seria uma melhoria buscar
        modal.querySelector('[data-placeholder="modal-data-emissao"]').textContent = new Date(receita.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR');
        modal.querySelector('[data-placeholder="modal-data-validade"]').textContent = receita.validade ? new Date(receita.validade + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
        
        const listaMed = modal.querySelector('#modal-medicamentos-lista');
        listaMed.innerHTML = '';
        // CORREÇÃO: A receita agora tem um único medicamento por linha, não um array JSON
        const li = document.createElement('li');
        li.innerHTML = `<strong>${receita.medicamento} ${receita.dosagem}</strong> - ${receita.instrucoes}`;
        listaMed.appendChild(li);
        
        modal.style.display = 'flex';
    };

    container.addEventListener('click', (event) => {
        const target = event.target.closest('button[data-action="view"]');
        if (target) {
            openReceitaModal(target.dataset.receitaId);
        }
    });

    btnCloseModal.addEventListener('click', () => modal.style.display = 'none');

    const fetchAndRenderReceitas = async () => {
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');
        const template = document.getElementById('receita-card-template');
        loadingState.style.display = 'block';

        try {
            const response = await fetch(`${PACIENTE_API_URL}?action=get_my_receitas`);
            if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
            const result = await response.json();
            if(result.status !== 'success') throw new Error(result.message);
            
            receitasData = result.data; // Guarda os dados completos

            if (!receitasData || receitasData.length === 0) {
                emptyState.style.display = 'block';
            } else {
                container.innerHTML = ''; // Limpa o container antes de adicionar novos cards
                receitasData.forEach(receita => {
                    const clone = template.content.cloneNode(true);
                    
                    clone.querySelector('[data-placeholder="medico"]').textContent = `Receita emitida por Dr(a). ${receita.medico_nome}`;
                    clone.querySelector('[data-placeholder="data-emissao"]').textContent = new Date(receita.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR');
                    // CORREÇÃO: Mostra o medicamento principal
                    clone.querySelector('[data-placeholder="resumo-medicamentos"]').textContent = `Medicamento: ${receita.medicamento}`;
                    
                    const statusEl = clone.querySelector('[data-placeholder="status"]');
                    statusEl.textContent = receita.status;
                    statusEl.className = `status status--${receita.status.toLowerCase()}`;
                    
                    clone.querySelector('button').dataset.receitaId = receita.id;
                    container.appendChild(clone);
                });
            }
        } catch (error) {
            console.error("Erro ao carregar receitas:", error);
            emptyState.textContent = 'Ocorreu um erro ao carregar suas receitas.';
            emptyState.style.display = 'block';
        } finally {
            loadingState.style.display = 'none';
        }
    };
    
    fetchAndRenderReceitas();
}