<?php
/**
 * ===================================================================
 * ENDPOINT DE ADMINISTRAÇÃO (VERSÃO COMPLETA E CORRIGIDA)
 * Projeto: CHIMS
 * Descrição: Fornece todos os dados e ações para o painel administrativo.
 * ===================================================================
 */

// 1. Requerindo os arquivos de configuração e funções
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/functions.php';

// 2. Iniciando a sessão e validando o acesso
session_start();

// Medida de segurança: Apenas usuários autenticados E do tipo 'admin' podem acessar este endpoint.
if (!isset($_SESSION['user_id']) || $_SESSION['user_type'] !== 'admin') {
    json_response(null, 403, 'Acesso negado. Requer privilégios de administrador.');
    return;
}

// 3. Roteamento da Ação
$action = $_GET['action'] ?? '';
$request_method = $_SERVER['REQUEST_METHOD'];

// --- AÇÃO: Obter estatísticas para o Dashboard ---
if ($request_method === 'GET' && $action === 'dashboard_stats') {
    try {
        // CORREÇÃO: Usando 'tipo_usuario' e 'data_criacao'
        $stmtPacientes = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'paciente'");
        $totalPacientes = $stmtPacientes->fetchColumn();
        $stmtMedicos = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'medico'");
        $totalMedicos = $stmtMedicos->fetchColumn();
        $stmtSemana = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE data_criacao >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $novosNaSemana = $stmtSemana->fetchColumn();

        $stats = [
            'total_pacientes' => $totalPacientes,
            'total_medicos' => $totalMedicos,
            'novos_cadastros_semana' => $novosNaSemana
        ];
        json_response($stats, 200, 'Estatísticas carregadas com sucesso.');
    } catch (PDOException $e) {
        error_log("Erro no dashboard: " . $e->getMessage());
        json_response(null, 500, 'Erro ao buscar estatísticas do dashboard.');
    }
}

// --- AÇÃO: Listar todos os usuários (com filtro) ---
else if ($request_method === 'GET' && $action === 'get_users') {
    try {
        // CORREÇÃO: Usando 'nome_completo', 'tipo_usuario', 'ativo' e aliases para compatibilidade com o front-end
        $sql = "SELECT u.id, u.nome_completo AS nome, u.cpf, u.email, u.tipo_usuario AS tipo, u.ativo 
                FROM usuarios u 
                WHERE 1=1";
        $params = [];
        if (!empty($_GET['busca'])) {
            $sql .= " AND (u.nome_completo LIKE :busca OR u.cpf LIKE :busca)";
            $params[':busca'] = '%' . $_GET['busca'] . '%';
        }
        if (!empty($_GET['perfil']) && in_array($_GET['perfil'], ['paciente', 'medico', 'admin'])) {
            $sql .= " AND u.tipo_usuario = :perfil";
            $params[':perfil'] = $_GET['perfil'];
        }
        $sql .= " ORDER BY u.data_criacao DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // MELHORIA: Converte o booleano 'ativo' para texto 'ativo'/'inativo' que o front-end espera
        foreach ($usuarios as &$usuario) {
            $usuario['status'] = $usuario['ativo'] ? 'ativo' : 'inativo';
            unset($usuario['ativo']); // Remove a coluna original para não confundir
        }

        json_response($usuarios, 200);
    } catch (PDOException $e) {
        error_log("Erro ao listar usuários: " . $e->getMessage());
        json_response(null, 500, 'Erro ao buscar a lista de usuários.');
    }
}

// --- AÇÃO: Criar um novo usuário ---
else if ($request_method === 'POST' && $action === 'create_user') {
    $data = json_decode(file_get_contents('php://input'), true);

    // CORREÇÃO: Verificando os campos corretos
    if (empty($data['nome_completo']) || empty($data['email']) || empty($data['senha']) || empty($data['tipo_usuario']) || empty($data['cpf']) || empty($data['data_nascimento'])) {
        json_response(null, 400, 'Todos os campos são obrigatórios.');
        return;
    }
    $pdo->beginTransaction();
    try {
        $hashed_password = password_hash($data['senha'], PASSWORD_DEFAULT);
        // CORREÇÃO: Inserindo nas colunas corretas da tabela 'usuarios'
        $sqlUser = "INSERT INTO usuarios (nome_completo, cpf, email, data_nascimento, telefone, senha, tipo_usuario) 
                    VALUES (:nome_completo, :cpf, :email, :data_nascimento, :telefone, :senha, :tipo_usuario)";
        $stmtUser = $pdo->prepare($sqlUser);
        $stmtUser->execute([
            ':nome_completo'    => $data['nome_completo'],
            ':cpf'              => $data['cpf'],
            ':email'            => $data['email'],
            ':data_nascimento'  => $data['data_nascimento'],
            ':telefone'         => $data['telefone'] ?? null,
            ':senha'            => $hashed_password,
            ':tipo_usuario'     => $data['tipo_usuario']
        ]);
        $userId = $pdo->lastInsertId();

        if ($data['tipo_usuario'] === 'medico') {
            if (empty($data['crm']) || empty($data['especialidade'])) throw new Exception('CRM e Especialidade são obrigatórios para médicos.');
            $sqlMedico = "INSERT INTO medicos (usuario_id, crm, especialidade) VALUES (:user_id, :crm, :especialidade)";
            $stmtMedico = $pdo->prepare($sqlMedico);
            $stmtMedico->execute([':user_id' => $userId, ':crm' => $data['crm'], ':especialidade' => $data['especialidade']]);
        } else if ($data['tipo_usuario'] === 'paciente') {
            // CORREÇÃO: Inserindo na tabela 'pacientes' os campos corretos
            $sqlPaciente = "INSERT INTO pacientes (usuario_id, endereco, tipo_sanguineo) VALUES (:user_id, :endereco, :tipo_sanguineo)";
            $stmtPaciente = $pdo->prepare($sqlPaciente);
            $stmtPaciente->execute([
                ':user_id'          => $userId,
                ':endereco'         => $data['endereco'] ?? null,
                ':tipo_sanguineo'   => $data['tipo_sanguineo'] ?? null
            ]);
        }
        $pdo->commit();
        json_response(['id' => $userId], 201, 'Usuário criado com sucesso!');
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Erro ao criar usuário: " . $e->getMessage());
        json_response(null, 500, 'Erro ao criar usuário: ' . $e->getMessage());
    }
}

// --- AÇÃO: Alternar status do usuário (ativar/desativar) ---
else if ($request_method === 'POST' && $action === 'toggle_status') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['id'] ?? null;
    if (!$userId) { json_response(null, 400, 'ID do usuário não fornecido.'); return; }
    try {
        // CORREÇÃO: A lógica correta para inverter um booleano no SQL
        $updateStmt = $pdo->prepare("UPDATE usuarios SET ativo = NOT ativo WHERE id = :id");
        $updateStmt->execute(['id' => $userId]);

        $stmt = $pdo->prepare("SELECT ativo FROM usuarios WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $new_status_bool = $stmt->fetchColumn();
        $new_status_text = $new_status_bool ? 'ativo' : 'inativo';

        json_response(['new_status' => $new_status_text], 200, 'Status do usuário atualizado com sucesso.');
    } catch (PDOException $e) {
        error_log("Erro ao alterar status: " . $e->getMessage());
        json_response(null, 500, 'Erro ao alterar o status do usuário.');
    }
}

// --- AÇÃO: Obter detalhes de um usuário específico para edição ---
else if ($request_method === 'GET' && $action === 'get_user_details') {
    $userId = $_GET['id'] ?? null;
    if (!$userId) { json_response(null, 400, 'ID do usuário não fornecido.'); return; }
    try {
        // CORREÇÃO: Selecionando as colunas corretas e usando aliases
        $stmt = $pdo->prepare("SELECT id, nome_completo, cpf, email, data_nascimento, telefone, tipo_usuario FROM usuarios WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $userData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$userData) { json_response(null, 404, 'Usuário não encontrado.'); return; }

        if ($userData['tipo_usuario'] === 'medico') {
            $stmtMedico = $pdo->prepare("SELECT crm, especialidade FROM medicos WHERE usuario_id = :id");
            $stmtMedico->execute(['id' => $userId]);
            $medicoData = $stmtMedico->fetch(PDO::FETCH_ASSOC);
            if ($medicoData) $userData = array_merge($userData, $medicoData);
        } else if ($userData['tipo_usuario'] === 'paciente') {
            // CORREÇÃO: Buscando os dados corretos da tabela 'pacientes'
            $stmtPaciente = $pdo->prepare("SELECT endereco, tipo_sanguineo FROM pacientes WHERE usuario_id = :id");
            $stmtPaciente->execute(['id' => $userId]);
            $pacienteData = $stmtPaciente->fetch(PDO::FETCH_ASSOC);
            if ($pacienteData) $userData = array_merge($userData, $pacienteData);
        }

        json_response($userData, 200);
    } catch (PDOException $e) {
        error_log("Erro ao buscar detalhes do usuário: " . $e->getMessage());
        json_response(null, 500, 'Erro ao buscar detalhes do usuário.');
    }
}

// --- AÇÃO: Atualizar dados de um usuário existente ---
else if ($request_method === 'POST' && $action === 'update_user') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['id'] ?? null;

    if (!$userId || empty($data['nome_completo']) || empty($data['email'])) {
        json_response(null, 400, 'ID, nome e email são obrigatórios.');
        return;
    }

    $pdo->beginTransaction();
    try {
        // 1. Atualiza a tabela 'usuarios'
        $sqlUser = "UPDATE usuarios SET nome_completo = :nome_completo, cpf = :cpf, email = :email, data_nascimento = :data_nascimento, telefone = :telefone WHERE id = :id";
        $stmtUser = $pdo->prepare($sqlUser);
        $stmtUser->execute([
            ':nome_completo'    => $data['nome_completo'],
            ':cpf'              => $data['cpf'],
            ':email'            => $data['email'],
            ':data_nascimento'  => $data['data_nascimento'],
            ':telefone'         => $data['telefone'] ?? null,
            ':id'               => $userId
        ]);

        // 2. Se uma nova senha foi fornecida, atualiza
        if (!empty($data['senha'])) {
            $hashed_password = password_hash($data['senha'], PASSWORD_DEFAULT);
            $stmtPass = $pdo->prepare("UPDATE usuarios SET senha = :senha WHERE id = :id");
            $stmtPass->execute([':senha' => $hashed_password, ':id' => $userId]);
        }

        // 3. Atualiza a tabela específica (medicos ou pacientes)
        if ($data['tipo_usuario'] === 'medico') {
            if (empty($data['crm']) || empty($data['especialidade'])) throw new Exception('CRM e Especialidade são obrigatórios para médicos.');
            $sqlMedico = "UPDATE medicos SET crm = :crm, especialidade = :especialidade WHERE usuario_id = :id";
            $stmtMedico = $pdo->prepare($sqlMedico);
            $stmtMedico->execute([':crm' => $data['crm'], ':especialidade' => $data['especialidade'], ':id' => $userId]);
        } else if ($data['tipo_usuario'] === 'paciente') {
            // CORREÇÃO: Atualizando os campos corretos da tabela 'pacientes'
            $sqlPaciente = "UPDATE pacientes SET endereco = :endereco, tipo_sanguineo = :tipo_sanguineo WHERE usuario_id = :id";
            $stmtPaciente = $pdo->prepare($sqlPaciente);
            $stmtPaciente->execute([
                ':endereco'       => $data['endereco'] ?? null,
                ':tipo_sanguineo' => $data['tipo_sanguineo'] ?? null,
                ':id'             => $userId
            ]);
        }
        $pdo->commit();
        json_response(['id' => $userId], 200, 'Usuário atualizado com sucesso!');
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Erro ao atualizar usuário: " . $e->getMessage());
        json_response(null, 500, 'Erro ao atualizar usuário: ' . $e->getMessage());
    }
}

// --- AÇÃO: Deletar um usuário ---
else if ($request_method === 'POST' && $action === 'delete_user') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['id'] ?? null;
    if (!$userId) { json_response(null, 400, 'ID do usuário não fornecido.'); return; }

    $pdo->beginTransaction();
    try {
        // A exclusão em cascata (ON DELETE CASCADE) no seu SQL deve cuidar de deletar das tabelas filhas (medicos, pacientes).
        // Portanto, só precisamos deletar da tabela principal.
        $stmtUser = $pdo->prepare("DELETE FROM usuarios WHERE id = :id");
        $stmtUser->execute(['id' => $userId]);
        
        $pdo->commit();
        json_response(null, 200, 'Usuário excluído com sucesso.');
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao deletar usuário: " . $e->getMessage());
        json_response(null, 500, 'Erro ao excluir usuário. Verifique as dependências como agendamentos ou prontuários.');
    }
}

// Se nenhuma ação válida for encontrada
else {
    json_response(null, 404, 'Endpoint de administrador ou ação não encontrada.');
}
?>