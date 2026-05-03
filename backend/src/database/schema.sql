CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) CHECK (perfil IN('admin', 'gestor', 'operador', 'cliente')),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    ume VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    categoria VARCHAR(100),
    fornecedor VARCHAR(100),
    preco_compra DECIMAL(10,2),
    preco_venda DECIMAL(10,2),
    estoque_minimo INTEGER DEFAULT 0,
    estoque_maximo INTEGER DEFAULT 0, 
    lead_time_dias INTEGER DEFAULT 0,
    qualidade_atual INTEGER DEFAULT 0,
    possui_validade BOOLEAN DEFAULT false
    dias_validade INTEGER,
    ativo BOOLEAN DEFAULT true
);

CREATE TABLE movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER REFERENCES produtos(id),
    tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    quantidade_movimentada INTEGER NOT NULL,
    custo_unitario DECIMAL(10,2),
    usurio_id INTEGER REFERENCES usuarios(id),
    data TIMESTAMP DEFAULT NOW(),
    observacao TEXT
);

CREATE TABLE inventarios (
    id SERIAL PRIMARY KEY,
    data_inicio TIMESTAMP DEFAULT NOW(),
    data_finalizacao TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('aberto', 'em_andamento', 'finalizado')),
    usuario_id INTEGER REFERENCES usuarios(id),
    observacoes TEXT,

