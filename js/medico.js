/**
 * ===================================================================
 * SCRIPT DE LÓGICA DO PORTAL DO MÉDICO (medico.js) - VERSÃO CORRIGIDA
 * Projeto: CHIMS
 * Descrição: Contém todas as funcionalidades e interações para as
 * páginas do painel do médico, conectado ao backend PHP.
 * ===================================================================
 */

// --- CONFIGURAÇÃO DA API ---
// CORREÇÃO: Usando o caminho relativo correto a partir das páginas internas.
const MEDICO_API_URL = '../php/api/medico.php';

// --- ROTEAMENTO E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // A função checkAuth() já é chamada pelo auth.js.

    const pagePath = window.location.pathname;
    if (pagePath.includes('dashboard.html')) {
        initMedicoDashboard();
    } else if (pagePath.includes('prontuario-paciente.html')) {
        initProntuarioPaciente();
    } else if (pagePath.includes('gerar-receita.html')) {
        initGerarReceita();
    }
});

// ===================================================================
// --- DASHBOARD (dashboard.html) ---
// ===================================================================
function initMedicoDashboard() {
    console.log("Inicializando Dashboard do Médico...");
    const agendaTbody = document.getElementById('agenda-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const searchForm = document.querySelector('section > form');

    const fetchAgenda = async () => {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        agendaTbody.innerHTML = '';
        try {
            const response = await fetch(`${MEDICO_API_URL}?action=get_agenda_hoje`);
            if (!response.ok) throw new Error(`O servidor respondeu com erro: ${response.status}`);
            
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);

            if (!result.data || result.data.length === 0) {
                emptyState.style.display = 'block';
            } else {
                const template = document.getElementById('agenda-row-template');
                result.data.forEach(consulta => {
                    const clone = template.content.cloneNode(true);
                    clone.querySelector('[data-placeholder="horario"]').textContent = consulta.horario;
                    clone.querySelector('[data-placeholder="nome-paciente"]').textContent = consulta.paciente_nome;
                    const link = clone.querySelector('[data-action="access"]');
                    // CORREÇÃO: O ID correto para o prontuário é o `usuario_id`, não o `paciente_id`.
                    // O PHP foi ajustado para retornar o `usuario_id` do paciente.
                    link.href = `./prontuario-paciente.html?id=${consulta.paciente_usuario_id}`;
                    agendaTbody.appendChild(clone);
                });
            }
        } catch (error) {
            console.error("Erro ao carregar agenda:", error);
            agendaTbody.innerHTML = `<tr><td colspan="3">Não foi possível carregar a agenda. Tente novamente.</td></tr>`;
        } finally {
            loadingState.style.display = 'none';
        }
    };
    
    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const busca = new FormData(searchForm).get('busca-paciente');
        if(!busca || busca.length < 3) {
            alert('Digite ao menos 3 caracteres para buscar.');
            return;
        }
        try {
            const response = await fetch(`${MEDICO_API_URL}?action=buscar_pacientes&busca=${encodeURIComponent(busca)}`);
            const result = await response.json();
            if(result.status === 'success' && result.data.length > 0) {
                window.location.href = `./prontuario-paciente.html?id=${result.data[0].id}`; // O ID aqui é o usuario_id
            } else {
                alert('Nenhum paciente encontrado.');
            }
        } catch(error) {
            alert('Erro ao buscar paciente.');
            console.error(error);
        }
    });

    fetchAgenda();
}

// ===================================================================
// --- PRONTUÁRIO DO PACIENTE (prontuario-paciente.html) ---
// ===================================================================
function initProntuarioPaciente() {
    const urlParams = new URLSearchParams(window.location.search);
    const pacienteId = urlParams.get('id'); // Este é o usuario_id do paciente

    if (!pacienteId) {
        alert("Nenhum paciente selecionado.");
        window.location.href = './dashboard.html';
        return;
    }

    const timelineContainer = document.getElementById('prontuario-timeline-container');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    const carregarDadosCompletos = async () => {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        timelineContainer.innerHTML = '';
        
        try {
            const [pacienteRes, prontuarioRes] = await Promise.all([
                fetch(`${MEDICO_API_URL}?action=get_paciente_detalhes&id=${pacienteId}`),
                fetch(`${MEDICO_API_URL}?action=get_prontuario&id=${pacienteId}`)
            ]);
            const pacienteResult = await pacienteRes.json();
            const prontuarioResult = await prontuarioRes.json();

            if (pacienteResult.status !== 'success') throw new Error(`Erro ao buscar paciente: ${pacienteResult.message}`);
            if (prontuarioResult.status !== 'success') throw new Error(`Erro ao buscar prontuário: ${prontuarioResult.message}`);

            const paciente = pacienteResult.data;
            document.getElementById('paciente-nome').textContent = paciente.nome;
            document.getElementById('paciente-dtnasc').textContent = new Date(paciente.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR');
            document.getElementById('paciente-cpf').textContent = paciente.cpf;
            document.getElementById('link-gerar-receita').href = `./gerar-receita.html?id=${pacienteId}`;

            const prontuario = prontuarioResult.data;
            if (!prontuario || prontuario.length === 0) {
                emptyState.style.display = 'block';
            } else {
                const template = document.getElementById('prontuario-item-template');
                prontuario.forEach(item => {
                    const clone = template.content.cloneNode(true);
                    let titulo = `Registro (${item.tipo})`;
                    let desc = '';

                    // CORREÇÃO: Lógica de renderização ajustada para os campos corretos do novo PHP
                    if (item.tipo === 'consulta') {
                        titulo = `Consulta com Dr(a). ${item.medico_nome}`;
                        desc = `<strong>Sintomas:</strong> ${item.sintomas || 'Não informado'}<br>
                                <strong>Diagnóstico:</strong> ${item.diagnostico}<br>
                                <strong>Tratamento:</strong> ${item.tratamento_recomendado || 'Não informado'}`;
                    } else if (item.tipo === 'receita') {
                        titulo = `Receita emitida por Dr(a). ${item.medico_nome}`;
                        desc = `<strong>Medicamento:</strong> ${item.medicamento} (${item.dosagem})<br>
                                <strong>Instruções:</strong> ${item.instrucoes}`;
                    } else if (item.tipo === 'exame') {
                        titulo = `Exame: ${item.nome_exame}`;
                        desc = `<strong>Resultado:</strong> ${item.resultado || 'Não especificado'}`;
                    }
                    
                    clone.querySelector('[data-placeholder="titulo-registro"]').textContent = titulo;
                    clone.querySelector('[data-placeholder="data-registro"]').textContent = new Date(item.data).toLocaleDateString('pt-BR');
                    clone.querySelector('[data-placeholder="detalhes"]').innerHTML = desc;
                    timelineContainer.appendChild(clone);
                });
            }
        } catch (error) {
            console.error("Erro ao carregar prontuário:", error);
            timelineContainer.innerHTML = `<p>Erro ao carregar o prontuário. ${error.message}</p>`;
        } finally {
            loadingState.style.display = 'none';
        }
    };

    // --- Lógica dos Modais ---
    const modais = {
        consulta: document.getElementById('modal-add-consulta'),
        exame: document.getElementById('modal-add-exame')
    };
    document.querySelector('[data-action="abrir-modal-consulta"]').addEventListener('click', () => modais.consulta.style.display = 'flex');
    document.querySelector('[data-action="abrir-modal-exame"]').addEventListener('click', () => modais.exame.style.display = 'flex');
    document.querySelectorAll('[data-action="fechar-modal"]').forEach(btn => btn.addEventListener('click', () => {
        modais.consulta.style.display = 'none';
        modais.exame.style.display = 'none';
    }));

    document.getElementById('form-add-consulta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        // CORREÇÃO: Mapeia os nomes dos campos do formulário para os nomes que o PHP espera
        const data = {
            paciente_id: pacienteId,
            sintomas: formData.get('consulta-descricao'),
            diagnostico: formData.get('consulta-diagnostico'),
            tratamento_recomendado: 'N/A' // Adicione um campo para isso se desejar
        };
        
        try {
            const response = await fetch(MEDICO_API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'add_consulta', ...data })
            });
            const result = await response.json();
            alert(result.message);
            if(result.status === 'success') {
                e.target.closest('div[id^="modal-"]').style.display = 'none';
                e.target.reset();
                carregarDadosCompletos();
            }
        } catch(error) {
            alert('Erro ao salvar consulta.');
        }
    });
    
    carregarDadosCompletos();
}

// ===================================================================
// --- GERAR RECEITA (gerar-receita.html) ---
// ===================================================================
function initGerarReceita() {
    const urlParams = new URLSearchParams(window.location.search);
    const pacienteId = urlParams.get('id'); // usuario_id

    if (!pacienteId) {
        alert("Nenhum paciente selecionado.");
        window.location.href = './dashboard.html';
        return;
    }

    const medicamentosContainer = document.getElementById('medicamentos-container');
    const addMedicamentoBtn = document.getElementById('adicionar-medicamento-btn');
    const formReceita = document.getElementById('form-receita');

    const carregarDadosPaciente = async () => {
        try {
            const response = await fetch(`${MEDICO_API_URL}?action=get_paciente_detalhes&id=${pacienteId}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            
            document.getElementById('paciente-nome').textContent = result.data.nome;
            document.getElementById('paciente-cpf').textContent = result.data.cpf;
        } catch (error) {
            console.error("Erro ao carregar dados do paciente:", error);
            alert('Não foi possível carregar os dados do paciente.');
        }
    };

    const adicionarMedicamento = () => {
        const template = document.getElementById('medicamento-item-template');
        const clone = template.content.cloneNode(true);
        medicamentosContainer.appendChild(clone);
    };
    
    adicionarMedicamento(); // Adiciona o primeiro campo de medicamento
    addMedicamentoBtn.addEventListener('click', adicionarMedicamento);

    medicamentosContainer.addEventListener('click', (event) => {
        if (event.target?.dataset.action === 'remover-medicamento') {
            // Não remove se for o último
            if (medicamentosContainer.querySelectorAll('article').length > 1) {
                event.target.closest('article').remove();
            }
        }
    });

    formReceita.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = formReceita.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Gerando...';

        try {
            const data = {
                action: 'gerar_receita',
                paciente_id: pacienteId,
                data_validade: new FormData(formReceita).get('data-validade'),
                medicamentos: []
            };
            
            const nomes = document.querySelectorAll('[name="medicamento_nome[]"]');
            const dosagens = document.querySelectorAll('[name="medicamento_dosagem[]"]');
            const posologias = document.querySelectorAll('[name="medicamento_posologia[]"]');

            for (let i = 0; i < nomes.length; i++) {
                if (nomes[i].value) { // Só adiciona se o nome do medicamento for preenchido
                    data.medicamentos.push({
                        nome: nomes[i].value,
                        dosagem: dosagens[i].value,
                        posologia: posologias[i].value
                    });
                }
            }

            if (data.medicamentos.length === 0) {
                throw new Error('Adicione ao menos um medicamento.');
            }
            
            const response = await fetch(MEDICO_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if(result.status !== 'success') throw new Error(result.message);

            alert(result.message);
            window.location.href = `./prontuario-paciente.html?id=${pacienteId}`;
        } catch (error) {
            alert(`Erro ao gerar receita: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Gerar e Enviar Receita';
        }
    });

    carregarDadosPaciente();
}