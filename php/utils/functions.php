<?php
/**
 * ===================================================================
 * ARQUIVO DE FUNÇÕES UTILITÁRIAS
 * Projeto: CHIMS
 * Descrição: Contém funções auxiliares para serem reutilizadas na API,
 * como a padronização de respostas JSON.
 * ===================================================================
 */

/**
 * Envia uma resposta padronizada em formato JSON e encerra o script.
 *
 * Esta função centraliza o retorno de dados para o frontend, garantindo
 * que todas as respostas da API tenham uma estrutura consistente.
 *
 * @param mixed|null $data Os dados a serem enviados no corpo da resposta. Pode ser um array, objeto, etc.
 * @param int $statusCode O código de status HTTP da resposta (ex: 200 para sucesso, 404 para não encontrado).
 * @param string $message Uma mensagem opcional para descrever o resultado da operação.
 */
function json_response($data = null, $statusCode = 200, $message = '') {
    // 1. Define o cabeçalho da resposta para indicar que o conteúdo é JSON.
    // Isso é crucial para que o navegador (e o JavaScript do frontend)
    // interprete a resposta corretamente.
    header('Content-Type: application/json');

    // 2. Define o código de status HTTP da resposta.
    http_response_code($statusCode);

    // 3. Monta a estrutura padrão da resposta.
    // O status (success/error) é determinado automaticamente pelo código HTTP.
    $response = [
        'status' => $statusCode >= 200 && $statusCode < 300 ? 'success' : 'error',
        'message' => $message
    ];

    // 4. Adiciona os dados à resposta, somente se eles existirem.
    if ($data !== null) {
        $response['data'] = $data;
    }

    // 5. Converte o array PHP em uma string JSON e a imprime na saída.
    echo json_encode($response);

    // 6. Encerra a execução do script para garantir que nada mais seja enviado.
    exit;
}

?>