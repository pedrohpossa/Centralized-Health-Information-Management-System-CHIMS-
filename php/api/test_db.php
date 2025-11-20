<?php
// --- SCRIPT PARA GERAR HASH DE SENHA DE FORMA SEGURA ---

// Coloque a senha que você deseja usar aqui
$senhaParaConverter = 'senha123';

// Gera o hash usando o algoritmo BCRYPT, que é o padrão e muito seguro.
$hashGerado = password_hash($senhaParaConverter, PASSWORD_DEFAULT);

// Exibe o resultado de forma segura na tela.
echo "<h1>Gerador de Hash de Senha</h1>";
echo "<p><strong>Senha Original:</strong> " . htmlspecialchars($senhaParaConverter, ENT_QUOTES, 'UTF-8') . "</p>";
echo "<p><strong>Hash Gerado (BCRYPT):</strong></p>";
echo "<textarea readonly style='width: 100%; height: 60px; font-size: 1.1em;'>" . htmlspecialchars($hashGerado, ENT_QUOTES, 'UTF-8') . "</textarea>";
echo "<p>Copie o hash gerado acima e use-o no seu comando SQL UPDATE.</p>";

?>