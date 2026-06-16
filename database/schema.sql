-- =============================================================================
-- SCHEMA: Dashboard Criminalidade — Multi-Estado v2
-- =============================================================================
-- Versão: 2.0 (feat/schema-multi-estado)
-- Alterações: Adição da tabela `estados` e coluna FK `estado_id` em `regioes`.
-- Retrocompatibilidade: dados legados de SP são vinculados automaticamente.
-- =============================================================================

-- Drop tables if they exist to allow clean recreations (ordem respeitando FKs)
DROP TABLE IF EXISTS ocorrencias CASCADE;
DROP TABLE IF EXISTS tipos_crime CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS regioes CASCADE;
DROP TABLE IF EXISTS estados CASCADE;

-- =============================================================================
-- TABELAS
-- =============================================================================

-- [NOVO] a) estados — entidade de primeira classe para suporte multi-estado
CREATE TABLE estados (
    id        SERIAL PRIMARY KEY,
    sigla     CHAR(2) UNIQUE NOT NULL,     -- ex: 'SP', 'RJ', 'MG'
    nome      VARCHAR(100) NOT NULL,
    regiao_br VARCHAR(20) NOT NULL         -- 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'
);

-- b) regioes — agora vinculada ao estado ao qual pertence
-- A constraint UNIQUE foi movida para (estado_id, nome): regiões de mesmo nome
-- em estados diferentes são entidades distintas (ex: "Capital" em SP e RJ).
CREATE TABLE regioes (
    id        SERIAL PRIMARY KEY,
    estado_id INT NOT NULL REFERENCES estados(id) ON DELETE CASCADE,
    nome      VARCHAR(100) NOT NULL,
    UNIQUE (estado_id, nome)
);

-- c) municipios (sem alterações estruturais)
CREATE TABLE municipios (
    id        SERIAL PRIMARY KEY,
    regiao_id INT NOT NULL REFERENCES regioes(id) ON DELETE CASCADE,
    nome      VARCHAR(150) NOT NULL
);

-- d) tipos_crime (sem alterações estruturais)
CREATE TABLE tipos_crime (
    id              SERIAL PRIMARY KEY,
    categoria_macro VARCHAR(100) NOT NULL,
    nome_crime      VARCHAR(150) UNIQUE NOT NULL
);

-- e) ocorrencias (sem alterações estruturais)
CREATE TABLE ocorrencias (
    id                SERIAL PRIMARY KEY,
    municipio_id      INT NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
    tipo_crime_id     INT NOT NULL REFERENCES tipos_crime(id) ON DELETE CASCADE,
    ano               INT NOT NULL,
    mes               INT NOT NULL,
    total_ocorrencias INT NOT NULL DEFAULT 0,
    variacao_mensal   FLOAT NOT NULL DEFAULT 0.0
);

-- =============================================================================
-- SEED: Estados do Brasil (27 UFs)
-- =============================================================================
-- Executado antes do seed de regiões para satisfazer a FK estado_id.
-- =============================================================================

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
    ('TO', 'Tocantins',           'Norte');

-- =============================================================================
-- ÍNDICES DE PERFORMANCE (P0 — adicionados em perf/sec-p0-fundacao)
-- =============================================================================
-- Use CREATE INDEX (sem CONCURRENTLY) aqui pois é o script de setup inicial.
-- Em banco em produção com dados ao vivo, prefira CONCURRENTLY para não bloquear.
-- =============================================================================

-- [IDX-01] Coração da query principal: filtro por municipio + ano + mes
CREATE INDEX idx_ocorrencias_municipio_ano_mes
    ON ocorrencias (municipio_id, ano, mes);

-- [IDX-02] Análise por tipo de crime + período
CREATE INDEX idx_ocorrencias_crime_ano
    ON ocorrencias (tipo_crime_id, ano);

-- [IDX-03] JOIN municipios → regioes
CREATE INDEX idx_municipios_regiao_id
    ON municipios (regiao_id);

-- [IDX-04] Lookup de município por nome
CREATE INDEX idx_municipios_nome
    ON municipios (nome);

-- [IDX-05] Lookup de região por nome
CREATE INDEX idx_regioes_nome
    ON regioes (nome);

-- [IDX-06] Filtro de regiões por estado (adicionado em feat/schema-multi-estado)
CREATE INDEX idx_regioes_estado_id
    ON regioes (estado_id);
