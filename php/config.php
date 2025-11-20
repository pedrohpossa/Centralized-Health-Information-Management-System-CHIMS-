<?php
/**
 * ===================================================================
 * ARQUIVO DE CONFIGURAÇÃO E CONEXÃO COM O BANCO DE DADOS
 * Projeto: CHIMS
 * Descrição: Centraliza as credenciais do banco de dados e estabelece
 * a conexão PDO, que será reutilizada em toda a aplicação.
 * ===================================================================
 */

// --- 1. Credenciais do Banco de Dados (substitua se necessário) ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'u129849830_chims');
define('DB_USER', 'u129849830_chims');
define('DB_PASS', 'CHIMS@usf_2025');
define('DB_CHARSET', 'utf8mb4');

// --- 2. Configuração do DSN (Data Source Name) para o PDO ---
$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

// --- 3. Opções do PDO para uma conexão robusta ---
$options = [
    // Garante que erros do banco de dados lancem exceções, facilitando o debug
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    // Define o modo de busca padrão para arrays associativos (ex: $row['nome'])
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    // Desativa a emulação de prepared statements para maior segurança
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// --- 4. Estabelecendo a Conexão ---
try {
    // Cria a instância do PDO, que é o nosso objeto de conexão
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (\PDOException $e) {
    // Em caso de falha na conexão, exibe uma mensagem de erro genérica e encerra o script.
    // Em um ambiente de produção, o ideal é logar o erro em um arquivo, em vez de exibi-lo.
    error_log("Erro de conexão com o banco de dados: " . $e->getMessage());
    http_response_code(500); // Internal Server Error
    die("Erro: Falha na conexão com o banco de dados. Por favor, tente novamente mais tarde.");
}

// A partir daqui, a variável $pdo está disponível para qualquer script que inclua este arquivo.

?>