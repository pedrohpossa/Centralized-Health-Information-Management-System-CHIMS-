/**
 * ===================================================================
 * ARQUIVO DE CONFIGURAÇÃO GLOBAL (config.js) - VERSÃO COMPLETA
 * Projeto: CHIMS
 * Descrição: Este arquivo é a "fonte da verdade" para todas as
 * configurações do front-end. Ele gerencia ambientes, chaves,
 * features e constantes para manter o código limpo e gerenciável.
 * ===================================================================
 */

// Usamos um objeto para agrupar todas as configurações em um único lugar,
// evitando poluir o escopo global com múltiplas variáveis.
const CHIMS_CONFIG = {

    // --- 1. Gerenciamento de Ambientes ---
    // Detecta automaticamente se estamos em ambiente de desenvolvimento local
    // ou em produção (no seu site) e ajusta a URL da API.
    getEnvironment: function() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        }
        return 'production';
    },

    // Define a URL base da API com base no ambiente detectado.
    API_BASE_URL: function() {
        const env = this.getEnvironment();
        if (env === 'development') {
            // Coloque aqui a URL do seu servidor local de desenvolvimento PHP
            return 'http://localhost/chims/php/';
        }
        // URL de produção que você informou
        return 'https://ricardofiorini.com/chims/php/';
    }(), // A função é auto-executada para definir o valor imediatamente.


    // --- 2. Informações da Aplicação ---
    APP_NAME: 'CHIMS',
    APP_VERSION: '1.0.0',


    // --- 3. Configurações de Autenticação ---
    // A chave usada para salvar o token de autenticação no localStorage do navegador.
    // Centralizar isso aqui evita "strings mágicas" espalhadas pelo código.
    TOKEN_STORAGE_KEY: 'chims_auth_token',


    // --- 4. Configurações de UI & UX ---
    // Define o número padrão de itens por página nas tabelas de gerenciamento.
    ITEMS_PER_PAGE: 15,

    // Duração padrão (em milissegundos) para mensagens de notificação (toasts).
    TOAST_DURATION: 4000, // 4 segundos


    // --- 5. Feature Flags (Controle de Funcionalidades) ---
    // Permite "ligar" ou "desligar" funcionalidades no front-end sem
    // precisar alterar o código em múltiplos lugares. Ótimo para o futuro.
    FEATURES: {
        ENABLE_PATIENT_MESSAGING: false, // Ex: um futuro chat com o médico
        ENABLE_DARK_MODE_TOGGLE: false,    // Ex: um futuro botão de modo escuro
    },


    // --- 6. Constantes da Aplicação (Anti-Erro) ---
    // Centraliza os nomes dos perfis de usuário para evitar erros de digitação
    // no resto do código. Em vez de escrever "medico", usamos CHIMS_CONFIG.USER_ROLES.MEDICO.
    USER_ROLES: {
        PACIENTE: 'paciente',
        MEDICO: 'medico',
        ADMIN: 'admin'
    },


    // --- 7. Modo de Depuração (DEBUG) ---
    // Ativa ou desativa automaticamente as mensagens de console.log
    // com base no ambiente. Evita que logs de debug apareçam para o usuário final.
    DEBUG_MODE: function() {
        return this.getEnvironment() === 'development';
    }()
};

// "Congela" o objeto de configuração para torná-lo imutável.
// Isso é uma medida de segurança para garantir que nenhum outro script
// possa alterar acidentalmente essas configurações durante a execução.
Object.freeze(CHIMS_CONFIG);