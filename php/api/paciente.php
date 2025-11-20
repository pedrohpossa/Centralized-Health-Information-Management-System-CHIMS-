<?php
/**
 * ===================================================================
 * ENDPOINT DO PORTAL DO PACIENTE (VERSÃO COMPLETA E CORRIGIDA)
 * Projeto: CHIMS
 * Descrição: Fornece todos os dados para as telas do paciente.
 * ===================================================================
 */

// 1. Requerindo os arquivos de configuração e funções
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/functions.php';

// 2. Iniciando a sessão e validando o acesso
session_start();

// Medida de segurança: Apenas usuários autenticados E do tipo 'paciente' podem acessar.
if (!isset($_SESSION['user_id']) || $_SESSION['user_type'] !== 'paciente') {
    json_response(null, 403, 'Acesso negado. Requer login de paciente.');
    return;
}

// O ID do usuário logado (da tabela 'usuarios')
$paciente_usuario_id = $_SESSION['user_id'];

// CORREÇÃO CRÍTICA: Precisamos do ID da tabela 'pacientes' para as consultas.
try {
    $stmtPaciente = $pdo->prepare("SELECT id FROM pacientes WHERE usuario_id = :uid");
    $stmtPaciente->execute([':uid' => $paciente_usuario_id]);
    $paciente_id_tabela = $stmtPaciente->fetchColumn();

    if (!$paciente_id_tabela) {
        throw new Exception('Registro de paciente correspondente não encontrado.');
    }
} catch (Exception $e) {
    json_response(null, 404, $e->getMessage());
    return;
}


// 3. Roteamento da Ação
$action = $_GET['action'] ?? '';
$request_method = $_SERVER['REQUEST_METHOD'];

// --- AÇÃO: Obter resumos para o Dashboard ---
if ($request_method === 'GET' && $action === 'get_dashboard_summary') {
    try {
        // Próxima consulta
        $stmtConsulta = $pdo->prepare("
            SELECT a.data_hora, u.nome_completo as medico_nome
            FROM agendamentos a
            JOIN medicos m ON a.medico_id = m.id
            JOIN usuarios u ON m.usuario_id = u.id
            WHERE a.paciente_id = :id AND a.data_hora >= NOW()
            ORDER BY a.data_hora ASC LIMIT 1
        ");
        $stmtConsulta->execute([':id' => $paciente_id_tabela]);
        $proxima_consulta = $stmtConsulta->fetch(PDO::FETCH_ASSOC);

        // Último exame
        $stmtExame = $pdo->prepare("SELECT nome_exame, data_exame FROM exames WHERE paciente_id = :id ORDER BY data_exame DESC LIMIT 1");
        $stmtExame->execute([':id' => $paciente_id_tabela]);
        $ultimo_exame = $stmtExame->fetch(PDO::FETCH_ASSOC);

        // Contagem de receitas ativas
        $stmtReceitas = $pdo->prepare("SELECT COUNT(*) FROM receitas WHERE paciente_id = :id AND validade >= CURDATE()");
        $stmtReceitas->execute([':id' => $paciente_id_tabela]);
        $receitas_ativas = $stmtReceitas->fetchColumn();

        $summary = [
            'proxima_consulta' => $proxima_consulta ?: null,
            'ultimo_exame' => $ultimo_exame ?: null,
            'receitas_ativas' => $receitas_ativas ?: 0
        ];
        json_response($summary, 200);
    } catch (PDOException $e) {
        error_log("Erro no dashboard do paciente: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar o resumo do painel.');
    }
}

// --- AÇÃO: Obter o histórico completo do prontuário (Timeline) ---
else if ($request_method === 'GET' && $action === 'get_my_prontuario') {
    try {
        // CORREÇÃO: Queries e joins corrigidos para refletir o schema do banco
        $sqlConsultas = "SELECT 'consulta' as tipo, p.id, p.data_consulta as data, p.diagnostico, p.sintomas, u.nome_completo as medico_nome
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
        $stmt->execute([':paciente_id' => $paciente_id_tabela]);
        $historico = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_response($historico, 200);
    } catch (PDOException $e) {
        error_log("Erro ao buscar prontuário do paciente: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar o seu histórico de saúde.');
    }
}

// --- AÇÃO: Listar todos os exames do paciente ---
else if ($request_method === 'GET' && $action === 'get_my_exames') {
    try {
        // CORREÇÃO: Usando a coluna 'resultado'
        $stmt = $pdo->prepare("
            SELECT id, data_exame, nome_exame, resultado, arquivo_path 
            FROM exames 
            WHERE paciente_id = :paciente_id 
            ORDER BY data_exame DESC
        ");
        $stmt->execute([':paciente_id' => $paciente_id_tabela]);
        $exames = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_response($exames, 200);
    } catch (PDOException $e) {
        error_log("Erro ao listar exames do paciente: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar sua lista de exames.');
    }
}

// --- AÇÃO: Listar todas as receitas do paciente ---
else if ($request_method === 'GET' && $action === 'get_my_receitas') {
    try {
        // CORREÇÃO: Junção e colunas corretas
        $stmt = $pdo->prepare("
            SELECT r.id, u.nome_completo as medico_nome, m.crm, r.data_emissao, r.medicamento, r.dosagem, r.instrucoes, r.validade,
                   (CASE WHEN r.validade >= CURDATE() THEN 'Ativa' ELSE 'Vencida' END) as status
            FROM receitas r
            JOIN medicos m ON r.medico_id = m.id
            JOIN usuarios u ON m.usuario_id = u.id
            WHERE r.paciente_id = :paciente_id
            ORDER BY r.data_emissao DESC
        ");
        $stmt->execute([':paciente_id' => $paciente_id_tabela]);
        $receitas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_response($receitas, 200);
    } catch (PDOException $e) {
        error_log("Erro ao listar receitas do paciente: " . $e->getMessage());
        json_response(null, 500, 'Erro ao carregar sua lista de receitas.');
    }
}

// Se nenhuma ação válida for encontrada
else {
    json_response(null, 404, 'Endpoint do portal do paciente ou ação não encontrada.');
}

?>