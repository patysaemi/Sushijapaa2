export type Categoria = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string;
  categoria_id: string;
  ativo: boolean;
  created_at: string;
};

export type EstoqueDia = {
  id: string;
  produto_id: string;
  data: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  created_at: string;
  produtos?: Produto; // Para joins
};

export type Pedido = {
  id: string;
  cliente_nome: string;
  total: number;
  status: 'aberto' | 'finalizado' | 'cancelado';
  data: string;
  forma_pagamento: string;
  observacao: string;
  created_at: string;
};

export type PedidoItem = {
  id: string;
  pedido_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  created_at: string;
};

export type VendaDiaria = {
  id: string;
  data: string;
  total_pedidos: number;
  faturamento_total: number;
  ticket_medio: number;
  created_at: string;
};
