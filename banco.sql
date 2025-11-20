--
-- Base de Dados: `chims_db`
-- CREATE DATABASE IF NOT EXISTS `chims_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- USE `chims_db`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `usuarios`
-- Tabela central que armazena dados comuns a todos os tipos de usuários.
-- A coluna `tipo_usuario` diferencia entre 'admin', 'medico' e 'paciente'.
--

CREATE TABLE `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome_completo` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `senha` VARCHAR(255) NOT NULL,
  `cpf` VARCHAR(14) NOT NULL UNIQUE,
  `data_nascimento` DATE NOT NULL,
  `telefone` VARCHAR(20),
  `tipo_usuario` ENUM('admin', 'medico', 'paciente') NOT NULL,
  `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
  `data_criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `medicos`
-- Armazena informações específicas dos médicos.
--

CREATE TABLE `medicos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL UNIQUE,
  `crm` VARCHAR(20) NOT NULL UNIQUE,
  `especialidade` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `pacientes`
-- Armazena informações específicas dos pacientes.
--

CREATE TABLE `pacientes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL UNIQUE,
  `endereco` VARCHAR(255),
  `tipo_sanguineo` VARCHAR(5),
  `informacoes_adicionais` TEXT,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Estrutura da tabela `agendamentos`
-- Tabela para gerenciar as consultas agendadas entre médicos e pacientes.
--

CREATE TABLE `agendamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `paciente_id` INT NOT NULL,
  `medico_id` INT NOT NULL,
  `data_hora` DATETIME NOT NULL,
  `status` ENUM('agendado', 'realizado', 'cancelado') NOT NULL DEFAULT 'agendado',
  `observacoes` TEXT,
  `data_criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `prontuarios`
-- Registra cada interação/consulta médica do paciente.
--

CREATE TABLE `prontuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `paciente_id` INT NOT NULL,
  `medico_id` INT NOT NULL,
  `agendamento_id` INT,
  `data_consulta` DATETIME NOT NULL,
  `diagnostico` TEXT NOT NULL,
  `sintomas` TEXT,
  `tratamento_recomendado` TEXT,
  `data_criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `receitas`
-- Armazena as receitas médicas emitidas para os pacientes.
--

CREATE TABLE `receitas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prontuario_id` INT NOT NULL,
  `paciente_id` INT NOT NULL,
  `medico_id` INT NOT NULL,
  `medicamento` VARCHAR(255) NOT NULL,
  `dosagem` VARCHAR(100) NOT NULL,
  `instrucoes` TEXT NOT NULL,
  `data_emissao` DATE NOT NULL,
  `validade` DATE,
  FOREIGN KEY (`prontuario_id`) REFERENCES `prontuarios`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `exames`
-- Tabela para armazenar os resultados de exames dos pacientes.
--

CREATE TABLE `exames` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `paciente_id` INT NOT NULL,
  `medico_id` INT,
  `nome_exame` VARCHAR(255) NOT NULL,
  `data_exame` DATE NOT NULL,
  `resultado` TEXT,
  `arquivo_path` VARCHAR(255),
  `data_upload` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medico_id`) REFERENCES `medicos`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para otimização de consultas
--

-- Tabela `usuarios`
CREATE INDEX `idx_email` ON `usuarios`(`email`);
CREATE INDEX `idx_tipo_usuario` ON `usuarios`(`tipo_usuario`);

-- Tabela `agendamentos`
CREATE INDEX `idx_agendamentos_paciente` ON `agendamentos`(`paciente_id`);
CREATE INDEX `idx_agendamentos_medico` ON `agendamentos`(`medico_id`);
CREATE INDEX `idx_agendamentos_data` ON `agendamentos`(`data_hora`);

-- Tabela `prontuarios`
CREATE INDEX `idx_prontuarios_paciente` ON `prontuarios`(`paciente_id`);

-- Tabela `receitas`
CREATE INDEX `idx_receitas_paciente` ON `receitas`(`paciente_id`);

-- Tabela `exames`
CREATE INDEX `idx_exames_paciente` ON `exames`(`paciente_id`);

-------------------------------------------------------------------

