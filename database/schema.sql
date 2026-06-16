-- =============================================================================
-- SCHEMA: Dashboard Criminalidade — SSP-SP (atual)
-- =============================================================================
-- ATENÇÃO: Este arquivo representa o schema ATUAL, sem migração multi-estado.
-- A migração multi-estado está documentada em docs/plano_de_expansao_arquitetura.md
-- e será executada em uma branch separada (feature/multi-estado).
-- =============================================================================

-- Drop tables if they exist to allow clean recreations
DROP TABLE IF EXISTS ocorrencias CASCADE;
DROP TABLE IF EXISTS tipos_crime CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS regioes CASCADE;

-- a) regioes (id serial PK, nome varchar unique)
CREATE TABLE regioes (
    id   SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL
);

-- b) municipios (id serial PK, regiao_id FK, nome varchar)
CREATE TABLE municipios (
    id        SERIAL PRIMARY KEY,
    regiao_id INT NOT NULL REFERENCES regioes(id) ON DELETE CASCADE,
    nome      VARCHAR(150) NOT NULL
);

-- c) tipos_crime (id serial PK, categoria_macro varchar, nome_crime varchar unique)
CREATE TABLE tipos_crime (
    id              SERIAL PRIMARY KEY,
    categoria_macro VARCHAR(100) NOT NULL,
    nome_crime      VARCHAR(150) UNIQUE NOT NULL
);

-- d) ocorrencias (id serial PK, municipio_id FK, tipo_crime_id FK, ano int, mes int, total_ocorrencias int, variacao_mensal float)
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
-- ÍNDICES DE PERFORMANCE (P0 — adicionados em perf/sec-p0-fundacao)
-- =============================================================================
-- Impacto: eliminam SEQUENTIAL SCAN nas queries de filtragem e JOIN,
-- reduzindo latência de O(N) para O(log N) com volumes de dados nacionais.
-- Use CREATE INDEX (sem CONCURRENTLY) aqui pois é o script de setup inicial.
-- Em banco em produção com dados ao vivo, prefira CONCURRENTLY para não bloquear.
-- =============================================================================

-- [IDX-01] Coração da query principal: filtro por municipio + ano + mes
-- Cobre: WHERE municipio_id = ? AND ano = ? AND mes = ?
CREATE INDEX idx_ocorrencias_municipio_ano_mes
    ON ocorrencias (municipio_id, ano, mes);

-- [IDX-02] Análise por tipo de crime + período
-- Cobre: WHERE tipo_crime_id = ? AND ano = ?
CREATE INDEX idx_ocorrencias_crime_ano
    ON ocorrencias (tipo_crime_id, ano);

-- [IDX-03] JOIN mais frequente: municipios → regioes
-- Cobre: JOIN municipios m ON o.municipio_id = m.id JOIN regioes r ON m.regiao_id = r.id
CREATE INDEX idx_municipios_regiao_id
    ON municipios (regiao_id);

-- [IDX-04] Lookup de município por nome (filtro WHERE m.nome = :municipio)
-- Cobre: AND m.nome = :municipio
CREATE INDEX idx_municipios_nome
    ON municipios (nome);

-- [IDX-05] Lookup de região por nome (filtro WHERE r.nome = :regiao)
-- Cobre: AND r.nome = :regiao
CREATE INDEX idx_regioes_nome
    ON regioes (nome);
