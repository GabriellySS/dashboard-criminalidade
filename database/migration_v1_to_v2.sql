-- =============================================================================
-- MIGRAÇÃO: v1 → v2 (Multi-Estado)
-- Branch: feat/schema-multi-estado
-- =============================================================================
-- Execute este script em bancos EXISTENTES com dados de SP já inseridos.
-- O script é seguro para re-execução (usa IF NOT EXISTS e UPDATE ... WHERE).
--
-- ATENÇÃO: Execute dentro de uma transação. Em caso de erro, use ROLLBACK.
-- Exemplo: BEGIN; \i database/migration_v1_to_v2.sql; COMMIT;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1: Criar a tabela estados (se ainda não existir)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estados (
    id        SERIAL PRIMARY KEY,
    sigla     CHAR(2) UNIQUE NOT NULL,
    nome      VARCHAR(100) NOT NULL,
    regiao_br VARCHAR(20) NOT NULL
);

-- -----------------------------------------------------------------------------
-- PASSO 2: Popular a tabela estados com as 27 UFs do Brasil (idempotente)
-- -----------------------------------------------------------------------------
INSERT INTO estados (sigla, nome, regiao_br) VALUES
    ('AC', 'Acre',                'Norte'),
    ('AL', 'Alagoas',             'Nordeste'),
    ('AP', 'Amapá',               'Norte'),
    ('AM', 'Amazonas',            'Norte'),
    ('BA', 'Bahia',               'Nordeste'),
    ('CE', 'Ceará',               'Nordeste'),
    ('DF', 'Distrito Federal',    'Centro-Oeste'),
    ('ES', 'Espírito Santo',      'Sudeste'),
    ('GO', 'Goiás',               'Centro-Oeste'),
    ('MA', 'Maranhão',            'Nordeste'),
    ('MT', 'Mato Grosso',         'Centro-Oeste'),
    ('MS', 'Mato Grosso do Sul',  'Centro-Oeste'),
    ('MG', 'Minas Gerais',        'Sudeste'),
    ('PA', 'Pará',                'Norte'),
    ('PB', 'Paraíba',             'Nordeste'),
    ('PR', 'Paraná',              'Sul'),
    ('PE', 'Pernambuco',          'Nordeste'),
    ('PI', 'Piauí',               'Nordeste'),
    ('RJ', 'Rio de Janeiro',      'Sudeste'),
    ('RN', 'Rio Grande do Norte', 'Nordeste'),
    ('RS', 'Rio Grande do Sul',   'Sul'),
    ('RO', 'Rondônia',            'Norte'),
    ('RR', 'Roraima',             'Norte'),
    ('SC', 'Santa Catarina',      'Sul'),
    ('SP', 'São Paulo',           'Sudeste'),
    ('SE', 'Sergipe',             'Nordeste'),
    ('TO', 'Tocantins',           'Norte')
ON CONFLICT (sigla) DO NOTHING;  -- Idempotente: ignora se a UF já existir

-- -----------------------------------------------------------------------------
-- PASSO 3: Adicionar a coluna estado_id em regioes (nullable temporariamente)
-- A coluna começa como NULL para não quebrar imediatamente os dados existentes.
-- -----------------------------------------------------------------------------
ALTER TABLE regioes
    ADD COLUMN IF NOT EXISTS estado_id INT REFERENCES estados(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- PASSO 4: Vincular TODOS os dados legados ao estado de São Paulo (SP)
-- Qualquer região sem estado_id definido (dados anteriores) recebe SP automaticamente.
-- -----------------------------------------------------------------------------
UPDATE regioes
SET estado_id = (SELECT id FROM estados WHERE sigla = 'SP')
WHERE estado_id IS NULL;

-- Verificação: garante que não sobrou nenhum registro NULL antes de aplicar NOT NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM regioes WHERE estado_id IS NULL) THEN
        RAISE EXCEPTION 'ERRO: Ainda existem regiões sem estado_id após o UPDATE. Verifique os dados.';
    END IF;
    RAISE NOTICE 'OK: Todas as regiões foram vinculadas ao estado de São Paulo (SP).';
END $$;

-- -----------------------------------------------------------------------------
-- PASSO 5: Tornar estado_id NOT NULL (agora que todos os registros estão populados)
-- -----------------------------------------------------------------------------
ALTER TABLE regioes
    ALTER COLUMN estado_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- PASSO 6: Remover a constraint UNIQUE antiga (nome VARCHAR UNIQUE)
-- e substituir pela UNIQUE composta (estado_id, nome) — para suportar regiões
-- de mesmo nome em estados diferentes (ex: "Capital" em SP e RJ).
-- -----------------------------------------------------------------------------

-- Remove a constraint antiga se existir (nome pode variar; tenta os nomes comuns)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'regioes'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1;  -- UNIQUE de coluna única (nome)

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE regioes DROP CONSTRAINT ' || quote_ident(constraint_name);
        RAISE NOTICE 'Constraint UNIQUE antiga removida: %', constraint_name;
    ELSE
        RAISE NOTICE 'Nenhuma constraint UNIQUE antiga encontrada em regioes.nome — pulando.';
    END IF;
END $$;

-- Adiciona a nova constraint UNIQUE composta
ALTER TABLE regioes
    ADD CONSTRAINT uq_regioes_estado_nome UNIQUE (estado_id, nome);

-- -----------------------------------------------------------------------------
-- PASSO 7: Criar índice de lookup por estado (se não existir)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_regioes_estado_id
    ON regioes (estado_id);

COMMIT;

-- =============================================================================
-- Verificação final (executar após o COMMIT para confirmar sucesso)
-- =============================================================================
-- SELECT e.sigla, e.nome AS estado, COUNT(r.id) AS num_regioes
-- FROM estados e
-- LEFT JOIN regioes r ON r.estado_id = e.id
-- GROUP BY e.sigla, e.nome
-- ORDER BY e.sigla;
