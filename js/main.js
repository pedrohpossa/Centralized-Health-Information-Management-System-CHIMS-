/**
 * ===================================================================
 * SCRIPT PRINCIPAL DA INTERFACE (main.js)
 * Projeto: CHIMS
 * Descrição: Controla todos os elementos de UI e interações que são
 * compartilhados entre as páginas internas (pós-login), como o menu
 * mobile, exibição de dados do usuário e logout.
 * ===================================================================
 */

/**
 * Exibe o nome do usuário logado no cabeçalho da página.
 */
function displayUserInfo() {
    // Busca o nome do usuário salvo no localStorage durante o login
    const userName = localStorage.getItem('chims_user_name');
    
    // Procura o elemento no header para exibir o nome
    // A estrutura HTML é: header > div:last-child > span
    const userNameElement = document.querySelector('body > header > div:last-child > span');

    if (userName && userNameElement) {
        // Se encontrou o nome e o elemento, atualiza o texto
        userNameElement.textContent = `Olá, ${userName}!`;
    }
}

/**
 * Configura a funcionalidade do menu "gaveta" (off-canvas) para telas mobile.
 */
function setupMobileMenu() {
    const toggleButton = document.getElementById('menu-toggle-btn');
    const sidebar = document.querySelector('body > nav');
    
    // Se não houver botão de menu na página, não faz nada
    if (!toggleButton || !sidebar) {
        return;
    }

    // Cria dinamicamente o overlay (fundo escuro) para uma melhor UX
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    // Função para abrir/fechar o menu
    const toggleMenu = () => {
        document.body.classList.toggle('sidebar-visible');
    };

    // Adiciona o evento de clique ao botão hambúrguer
    toggleButton.addEventListener('click', toggleMenu);

    // Adiciona o evento de clique ao overlay para fechar o menu
    overlay.addEventListener('click', toggleMenu);
}

/**
 * Configura os listeners de evento para todos os botões/links de logout.
 */
function setupLogout() {
    // Procura por todos os links que devem acionar o logout
    const logoutLinks = document.querySelectorAll('a[href="#"]'); // Uma forma simples de pegar o link "Sair"

    logoutLinks.forEach(link => {
        if (link.textContent.toLowerCase().includes('sair')) {
            link.addEventListener('click', (event) => {
                event.preventDefault(); // Impede que o link navegue para "#"
                // Pergunta ao usuário se ele realmente quer sair
                if (confirm('Você tem certeza que deseja sair do sistema?')) {
                    handleLogout(); // Chama a função de logout do auth.js
                }
            });
        }
    });
}

/**
 * Função de inicialização principal.
 * DEVE ser chamada em todas as páginas internas após a verificação de autenticação.
 */
function initMain() {
    displayUserInfo();
    setupMobileMenu();
    setupLogout();
}