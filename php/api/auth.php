<?php
/**
 * ===================================================================
 * ENDPOINT DE AUTENTICAÇÃO (VERSÃO FINAL COM CORREÇÃO NA RESPOSTA JSON)
 * Projeto: CHIMS
 * Descrição: Gerencia o login, logout e verificação de sessão.
 * ===================================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/functions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// --- AÇÃO DE LOGIN ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $email = $_POST['email'] ?? '';
    $senha = $_POST['senha'] ?? '';

    if (empty($email) || empty($senha)) {
        json_response(['message' => 'Email e senha são obrigatórios.'], 400);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, nome_completo, tipo_usuario, senha FROM usuarios WHERE email = :email AND ativo = 1");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($senha, $user['senha'])) {
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_type'] = $user['tipo_usuario'];
            $_SESSION['user_name'] = $user['nome_completo'];
            
            // Prepara os dados para o front-end, que espera as chaves 'nome' e 'tipo'.
            $userDataForFrontend = [
                'id' => $user['id'],
                'nome' => $user['nome_completo'],
                'tipo' => $user['tipo_usuario']
            ];
            
            // CORREÇÃO FINAL: Passa apenas o array de dados do usuário para a função json_response.
            // A função cuidará de envolvê-lo corretamente, sem aninhamento duplo.
            json_response($userDataForFrontend, 200, 'Login bem-sucedido.');
        } else {
            json_response(['message' => 'Credenciais inválidas ou usuário inativo.'], 401);
        }
    } catch (PDOException $e) {
        error_log("Erro de login: " . $e->getMessage());
        json_response(['message' => 'Erro interno no servidor.'], 500);
    }
}

// --- OUTRAS AÇÕES (check_session, logout) ---
else if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check_session') {
    if (isset($_SESSION['user_id'])) {
        $userData = [
            'id' => $_SESSION['user_id'],
            'tipo' => $_SESSION['user_type'],
            'nome' => $_SESSION['user_name']
        ];
        json_response($userData, 200, 'Sessão ativa.');
    } else {
        json_response(['message' => 'Não autenticado.'], 401);
    }
}
else if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'logout') {
    session_unset();
    session_destroy();
    json_response(['message' => 'Logout realizado com sucesso.'], 200);
}
else {
    json_response(['message' => 'Endpoint ou ação não encontrada.'], 404);
}