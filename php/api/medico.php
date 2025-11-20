<?php
/**
 * ===================================================================
 * ENDPOINT DO PORTAL DO MÉDICO (VERSÃO COMPLETA E DEFINITIVA)
 * Projeto: CHIMS
 * Descrição: Fornece todos os dados e ações para o painel do médico.
 * ===================================================================
 */

// 1. Requerindo os arquivos de configuração e funções
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/functions.php';

// 2. Iniciando a sessão e validando o acesso
session_start();

// Medida de segurança: Apenas usuários autenticados E do tipo 'medico' podem acessar.
if (!isset($_SESSION['user_id']) || $_SESSION['user_type'] !== 'medico') {
    json_response(null, 403, 'Acesso negado. Requer privilégios de médico.');
    return;
}

// O ID do médico logado (da tabela 'usuarios')
$usuario_medico_id = $_SESSION['user_id'];

// 3. Roteamento da Ação
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$request_method = $_SERVER['REQUEST_METHOD'];

// --- AÇÃO: Obter agenda do dia para o Dashboard ---
if ($request_method === 'GET' && $action === 'get_agenda_hoje') {
    try {
        $stmt = $pdo->prepare("
            SELECT a.id, TIME(a.data_hora) as horario, u.nome_completo as paciente_nome, u.id as paciente_usuario_id
            FROM agendamentos a
            JOIN pacientes p ON a.paciente_id = p.id
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN medicos m ON a.medico_id = m.id
            WHERE m.usuario_id = :usuario_medico_id AND DATE(a.data_hora) = CURDATE()
            ORDER BY a.data_hora ASC
        ");
        $stmt->execute([':usuario_medico_id' => $usuario_medico_id]);
        $agenda = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_response($agenda, 200);
    } catch (PDOException $e) {
        error_log("Erro ao buscar agenda: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar a agenda do dia.');
    }
}

// --- AÇÃO: Buscar pacientes por nome ou CPF ---
else if ($request_method === 'GET' && $action === 'buscar_pacientes') {
    $busca = $_GET['busca'] ?? '';
    if (strlen($busca) < 3) {
        json_response([], 200);
        return;
    }
    try {
        // CORREÇÃO: Usando 'nome_completo' e 'tipo_usuario'
        $stmt = $pdo->prepare("
            SELECT id, nome_completo AS nome, cpf 
            FROM usuarios 
            WHERE tipo_usuario = 'paciente' AND (nome_completo LIKE :busca OR cpf LIKE :busca)
            LIMIT 10
        ");
        $stmt->execute([':busca' => '%' . $busca . '%']);
        $pacientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_response($pacientes, 200);
    } catch (PDOException $e) {
        error_log("Erro ao buscar paciente: " . $e->getMessage());
        json_response(null, 500, 'Erro ao realizar a busca por paciente.');
    }
}

// --- AÇÃO: Obter detalhes de um paciente (para o prontuário) ---
else if ($request_method === 'GET' && $action === 'get_paciente_detalhes') {
    $paciente_usuario_id = $_GET['id'] ?? null;
    if (!$paciente_usuario_id) { json_response(null, 400, 'ID do paciente não fornecido.'); return; }

    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.nome_completo AS nome, u.cpf, u.email, u.telefone, u.data_nascimento, p.endereco, p.tipo_sanguineo
            FROM usuarios u
            LEFT JOIN pacientes p ON u.id = p.usuario_id
            WHERE u.id = :paciente_usuario_id AND u.tipo_usuario = 'paciente'
        ");
        $stmt->execute([':paciente_usuario_id' => $paciente_usuario_id]);
        $paciente = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$paciente) { json_response(null, 404, 'Paciente não encontrado.'); return; }
        
        json_response($paciente, 200);
    } catch (PDOException $e) {
        error_log("Erro ao buscar detalhes do paciente: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar os dados do paciente.');
    }
}

// --- AÇÃO: Obter o histórico completo do prontuário ---
else if ($request_method === 'GET' && $action === 'get_prontuario') {
    $paciente_usuario_id = $_GET['id'] ?? null;
    if (!$paciente_usuario_id) { json_response(null, 400, 'ID do paciente não fornecido.'); return; }

    try {
        $stmtPacienteId = $pdo->prepare("SELECT id FROM pacientes WHERE usuario_id = :usuario_id");
        $stmtPacienteId->execute([':usuario_id' => $paciente_usuario_id]);
        $paciente_id = $stmtPacienteId->fetchColumn();
        if (!$paciente_id) { json_response([], 200); return; }

        $sqlConsultas = "SELECT 'consulta' as tipo, p.id, p.data_consulta as data, p.diagnostico, p.sintomas, p.tratamento_recomendado, u.nome_completo as medico_nome
                         FROM prontuarios p
                         JOIN medicos m ON p.medico_id = m.id
                         JOIN usuarios u ON m.usuario_id = u.id
                         WHERE p.paciente_id = :paciente_id";
        
        $sqlReceitas = "SELECT 'receita' as tipo, r.id, r.data_emissao as data, r.medicamento, r.dosagem, r.instrucoes, u.nome_completo as medico_nome
                        FROM receitas r
                        JOIN medicos m ON r.medico_id = m.id
                        JOIN usuarios u ON m.usuario_id = u.id
                        WHERE r.paciente_id = :paciente_id";
        
        $sqlExames = "SELECT 'exame' as tipo, e.id, e.data_exame as data, e.nome_exame, e.resultado, u.nome_completo as medico_nome
                      FROM exames e
                      LEFT JOIN medicos m ON e.medico_id = m.id
                      LEFT JOIN usuarios u ON m.usuario_id = u.id
                      WHERE e.paciente_id = :paciente_id";

        $stmt = $pdo->prepare("($sqlConsultas) UNION ALL ($sqlReceitas) UNION ALL ($sqlExames) ORDER BY data DESC");
        $stmt->execute([':paciente_id' => $paciente_id]);
        $historico = $stmt->fetchAll(PDO::FETCH_ASSOC);

        json_response($historico, 200);
    } catch (PDOException $e) {
        error_log("Erro ao buscar prontuário: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar o histórico do prontuário.');
    }
}

// --- AÇÃO: Adicionar novo registro de consulta ao prontuário ---
else if ($request_method === 'POST' && $action === 'add_consulta') {
    $data = json_decode(file_get_contents('php://input'), true);
    $paciente_usuario_id = $data['paciente_id'] ?? null;

    if (!$paciente_usuario_id || empty($data['diagnostico'])) {
        json_response(null, 400, 'Dados da consulta incompletos.'); return;
    }

    try {
        $stmtPacienteId = $pdo->prepare("SELECT id FROM pacientes WHERE usuario_id = :usuario_id");
        $stmtPacienteId->execute([':usuario_id' => $paciente_usuario_id]);
        $paciente_id = $stmtPacienteId->fetchColumn();

        $stmtMedicoId = $pdo->prepare("SELECT id FROM medicos WHERE usuario_id = :usuario_id");
        $stmtMedicoId->execute([':usuario_id' => $usuario_medico_id]);
        $medico_id = $stmtMedicoId->fetchColumn();
        
        if (!$paciente_id || !$medico_id) { throw new Exception("IDs de paciente ou médico não encontrados."); }

        $sql = "INSERT INTO prontuarios (paciente_id, medico_id, data_consulta, diagnostico, sintomas, tratamento_recomendado)
                VALUES (:paciente_id, :medico_id, NOW(), :diagnostico, :sintomas, :tratamento_recomendado)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':paciente_id' => $paciente_id,
            ':medico_id' => $medico_id,
            ':diagnostico' => $data['diagnostico'],
            ':sintomas' => $data['sintomas'] ?? null,
            ':tratamento_recomendado' => $data['tratamento_recomendado'] ?? null
        ]);
        json_response(['id' => $pdo->lastInsertId()], 201, 'Registro de consulta salvo com sucesso.');
    } catch (Exception $e) {
        error_log("Erro ao salvar consulta: " . $e->getMessage());
        json_response(null, 500, 'Erro ao salvar o registro no prontuário.');
    }
}

// --- AÇÃO: Gerar e salvar uma nova receita ---
else if ($request_method === 'POST' && $action === 'gerar_receita') {
    $data = json_decode(file_get_contents('php://input'), true);
    $paciente_usuario_id = $data['paciente_id'] ?? null;
    
    if (!$paciente_usuario_id || empty($data['medicamentos']) || !is_array($data['medicamentos'])) {
        json_response(null, 400, 'Dados da receita incompletos ou mal formatados.'); return;
    }

    $pdo->beginTransaction();
    try {
        $stmtPacienteId = $pdo->prepare("SELECT id FROM pacientes WHERE usuario_id = :usuario_id");
        $stmtPacienteId->execute([':usuario_id' => $paciente_usuario_id]);
        $paciente_id = $stmtPacienteId->fetchColumn();

        $stmtMedicoId = $pdo->prepare("SELECT id FROM medicos WHERE usuario_id = :usuario_id");
        $stmtMedicoId->execute([':usuario_id' => $usuario_medico_id]);
        $medico_id = $stmtMedicoId->fetchColumn();
        if (!$paciente_id || !$medico_id) { throw new Exception("IDs de paciente ou médico não encontrados."); }

        $sqlProntuario = "INSERT INTO prontuarios (paciente_id, medico_id, data_consulta, diagnostico) VALUES (:paciente_id, :medico_id, NOW(), 'Emissão de Receita')";
        $stmtProntuario = $pdo->prepare($sqlProntuario);
        $stmtProntuario->execute([':paciente_id' => $paciente_id, ':medico_id' => $medico_id]);
        $prontuario_id = $pdo->lastInsertId();

        $sqlReceita = "INSERT INTO receitas (prontuario_id, paciente_id, medico_id, medicamento, dosagem, instrucoes, data_emissao, validade)
                       VALUES (:prontuario_id, :paciente_id, :medico_id, :medicamento, :dosagem, :instrucoes, CURDATE(), :validade)";
        $stmtReceita = $pdo->prepare($sqlReceita);
        
        foreach($data['medicamentos'] as $medicamento) {
            if(empty($medicamento['nome'])) continue;
            $stmtReceita->execute([
                ':prontuario_id' => $prontuario_id,
                ':paciente_id' => $paciente_id,
                ':medico_id' => $medico_id,
                ':medicamento' => $medicamento['nome'],
                ':dosagem' => $medicamento['dosagem'],
                ':instrucoes' => $medicamento['posologia'],
                ':validade' => $data['data_validade'] ?? null
            ]);
        }
        $pdo->commit();
        json_response(null, 201, 'Receita gerada com sucesso.');
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Erro ao gerar receita: " . $e->getMessage());
        json_response(null, 500, 'Erro ao salvar a receita no banco de dados.');
    }
}

// Se nenhuma ação válida for encontrada
else {
    json_response(null, 404, 'Endpoint do portal do médico ou ação não encontrada.');
}
?>