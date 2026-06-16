-- Drop tables if they exist to allow clean recreations
DROP TABLE IF EXISTS ocorrencias CASCADE;
DROP TABLE IF EXISTS tipos_crime CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS regioes CASCADE;

-- a) regioes (id serial PK, nome varchar unique)
CREATE TABLE regioes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL
);

-- b) municipios (id serial PK, regiao_id FK, nome varchar)
CREATE TABLE municipios (
    id SERIAL PRIMARY KEY,
    regiao_id INT NOT NULL REFERENCES regioes(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL
);

-- c) tipos_crime (id serial PK, categoria_macro varchar, nome_crime varchar unique)
CREATE TABLE tipos_crime (
    id SERIAL PRIMARY KEY,
    categoria_macro VARCHAR(100) NOT NULL,
    nome_crime VARCHAR(150) UNIQUE NOT NULL
);

-- d) ocorrencias (id serial PK, municipio_id FK, tipo_crime_id FK, ano int, mes int, total_ocorrencias int, variacao_mensal float)
CREATE TABLE ocorrencias (
    id SERIAL PRIMARY KEY,
    municipio_id INT NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
    tipo_crime_id INT NOT NULL REFERENCES tipos_crime(id) ON DELETE CASCADE,
    ano INT NOT NULL,
    mes INT NOT NULL,
    total_ocorrencias INT NOT NULL DEFAULT 0,
    variacao_mensal FLOAT NOT NULL DEFAULT 0.0
);
