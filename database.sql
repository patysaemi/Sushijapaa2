-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categorias
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#ef4444',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL,
  imagem_url TEXT,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estoque Diário
CREATE TABLE estoque_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_inicial INTEGER NOT NULL DEFAULT 0,
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(produto_id, data)
);

-- Pedidos
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('aberto', 'finalizado', 'cancelado')),
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  forma_pagamento TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens do Pedido
CREATE TABLE pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas Diárias (Dashboard summary)
CREATE TABLE vendas_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  total_pedidos INTEGER DEFAULT 0,
  faturamento_total NUMERIC(10, 2) DEFAULT 0,
  ticket_medio NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security: Enable RLS and add basic open policies for MVP
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on categorias" ON categorias FOR ALL USING (true);
CREATE POLICY "Allow all on produtos" ON produtos FOR ALL USING (true);
CREATE POLICY "Allow all on estoque_dia" ON estoque_dia FOR ALL USING (true);
CREATE POLICY "Allow all on pedidos" ON pedidos FOR ALL USING (true);
CREATE POLICY "Allow all on pedido_itens" ON pedido_itens FOR ALL USING (true);
CREATE POLICY "Allow all on vendas_diarias" ON vendas_diarias FOR ALL USING (true);

-- Functions and Triggers for Stock Management
CREATE OR REPLACE FUNCTION baixar_estoque()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE estoque_dia 
    SET quantidade_atual = quantidade_atual - NEW.quantidade
    WHERE produto_id = NEW.produto_id AND data = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_baixar_estoque
AFTER INSERT ON pedido_itens
FOR EACH ROW
EXECUTE FUNCTION baixar_estoque();

-- Function for returning stock when canceled
CREATE OR REPLACE FUNCTION devolver_estoque()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    UPDATE estoque_dia ed
    SET quantidade_atual = ed.quantidade_atual + pi.quantidade
    FROM pedido_itens pi
    WHERE pi.pedido_id = NEW.id AND ed.produto_id = pi.produto_id AND ed.data = DATE(NEW.data);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_devolver_estoque
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION devolver_estoque();

-- Basic Seed Data
INSERT INTO categorias (nome, cor, ordem) VALUES 
('COMBOS', '#d4af37', 1),
('TEMAKIS', '#ef4444', 2),
('HOT ROLL', '#ef4444', 3),
('FRITOS', '#2a9d8f', 4),
('CRUS', '#3b82f6', 5),
('SOBREMESAS', '#fbbf24', 6),
('BEBIDAS', '#3b82f6', 7);
