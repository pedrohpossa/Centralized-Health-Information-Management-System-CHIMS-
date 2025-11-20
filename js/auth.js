/**
 * ===================================================================
 * MÓDULO DE AUTENTICAÇÃO (auth.js) - Versão Final Definitiva
 * Projeto: CHIMS
 * Descrição: Gerencia o ciclo de vida da autenticação do usuário.
 * ===================================================================
 */

const AUTH_CONFIG = {
    API_URL_ROOT: 'php/api/auth.php',
    API_URL_INTERNAL: '../php/api/auth.php',
    USER_DATA_KEY: 'chims_user_data'
};

/**
 * Protege uma página, verificando se o usuário tem uma sessão ativa.
 */
async function checkAuth() {
    try {
        const response = await fetch(`${AUTH_CONFIG.API_URL_INTERNAL}?action=check_session`);
        if (!response.ok) throw new Error('Sessão inválida ou expirada.');
        
        const result = await response.json();
        if (result.status === 'success' && result.data) {
            localStorage.setItem(AUTH_CONFIG.USER_DATA_KEY, JSON.stringify(result.data));
            console.log("Sessão válida para o usuário:", result.data.nome);
        } else {
            throw new Error(result.message || 'Falha na verificação da sessão.');
        }
    } catch (error) {
        console.error("Erro de autenticação:", error.message);
        localStorage.removeItem(AUTH_CONFIG.USER_DATA_KEY);
        window.location.href = '../'; // Redireciona para a página de login
    }
}

/**
 * Lida com a submissão do formulário de login.
 */
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Autenticando...';

    const formData = new FormData(form);
    formData.append('action', 'login');
    
    const bodyData = new URLSearchParams(formData);

    try {
        const response = await fetch(AUTH_CONFIG.API_URL_ROOT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyData
        });

        const result = await response.json();

        if (!response.ok) {
            // Usa a mensagem de erro específica do JSON se disponível
            throw new Error(result.data?.message || 'O servidor respondeu com um erro.');
        }

        if (result.status === 'success' && result.data) {
            localStorage.setItem(AUTH_CONFIG.USER_DATA_KEY, JSON.stringify(result.data));

            // SOLUÇÃO FINAL: Verifica se a resposta contém 'tipo' ou 'tipo_usuario'.
            // Isso torna o JS compatível com ambas as respostas do PHP.
            const userType = result.data.tipo || result.data.tipo_usuario;

            if (!userType) {
                // Esta é a mensagem de erro que você estava vendo. Agora a causa está corrigida.
                throw new Error('A resposta do servidor não incluiu um tipo de usuário (tipo/tipo_usuario).');
            }
            
            switch (userType.toLowerCase()) {
                case 'paciente': window.location.href = './paciente/dashboard.html'; break;
                case 'medico': window.location.href = './medico/dashboard.html'; break;
                case 'admin': window.location.href = './admin/dashboard.html'; break;
                default: throw new Error(`Perfil de usuário desconhecido: ${userType}`);
            }
        } else {
            throw new Error(result.message || 'Resposta inválida da API.');
        }

    } catch (error) {
        alert(`Falha no login: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Entrar';
    }
}

/**
 * Realiza o logout do usuário.
 */
async function handleLogout() {
    try {
        await fetch(`${AUTH_CONFIG.API_URL_INTERNAL}?action=logout`);
    } catch (error) {
        console.error("Erro ao contatar servidor para logout:", error);
    } finally {
        localStorage.removeItem(AUTH_CONFIG.USER_DATA_KEY);
        alert("Você foi desconectado com sucesso.");
        window.location.href = '../';
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.querySelector('.logout-btn, [data-action="logout"]'); 

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        checkAuth();
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});