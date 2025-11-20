/**
 * ===================================================================
 * MÓDULO DE API (api.js)
 * Projeto: CHIMS
 * Descrição: Centraliza todas as chamadas de API para o back-end.
 * Esta função genérica `apiFetch` lida com a construção da URL,
 * autenticação (anexando o token JWT) e tratamento de erros.
 * ===================================================================
 */

/**
 * Realiza uma chamada para a API do CHIMS.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: 'pacientes/123').
 * @param {object} options - Opções da requisição, como method, body, etc.
 * @param {string} [options.method='GET'] - O método HTTP (GET, POST, PUT, DELETE).
 * @param {object} [options.body=null] - O corpo da requisição para POST/PUT.
 * @param {boolean} [options.requiresAuth=true] - Se a requisição precisa do token de autenticação.
 * @returns {Promise<any>} - Uma promessa que resolve com os dados da resposta em JSON.
 */
async function apiFetch(endpoint, options = {}) {
    // Define os valores padrão para as opções
    const { method = 'GET', body = null, requiresAuth = true } = options;

    try {
        // 1. Constrói a URL completa usando a base do config.js
        const url = `${CHIMS_CONFIG.API_BASE_URL()}${endpoint}`;

        // 2. Prepara os cabeçalhos da requisição
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');

        // 3. Lida com a autenticação
        if (requiresAuth) {
            const token = localStorage.getItem(CHIMS_CONFIG.TOKEN_STORAGE_KEY);
            if (!token) {
                // Se a rota exige autenticação e não há token, redireciona para o login.
                console.error("Erro de autenticação: Token não encontrado.");
                window.location.href = '/chims/'; // Redireciona para a página de login
                return Promise.reject(new Error("Token não encontrado."));
            }
            headers.append('Authorization', `Bearer ${token}`);
        }

        // 4. Monta o objeto de configuração para o fetch
        const fetchOptions = {
            method,
            headers,
        };

        // Adiciona o corpo da requisição, se houver (para POST, PUT)
        if (body) {
            fetchOptions.body = JSON.stringify(body);
        }

        // 5. Realiza a chamada da API
        const response = await fetch(url, fetchOptions);

        // 6. Trata a resposta do servidor
        if (!response.ok) {
            // Se a resposta for um erro (ex: 404, 500), tenta ler a mensagem de erro do corpo
            const errorData = await response.json().catch(() => null); // Tenta pegar erro do JSON, senão ignora
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(`Erro ${response.status}: ${errorMessage}`);
        }

        // Se a resposta for 204 (No Content), não há corpo para ler
        if (response.status === 204) {
            return null;
        }

        // 7. Retorna os dados da resposta em formato JSON
        return await response.json();

    } catch (error) {
        // 8. Trata erros de rede ou outros problemas
        console.error('Falha na comunicação com a API:', error);

        // Dispara o erro para que a função que chamou o apiFetch possa tratá-lo (ex: mostrar uma mensagem na tela)
        return Promise.reject(error);
    }
}